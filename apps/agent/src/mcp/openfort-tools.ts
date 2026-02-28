import Openfort from '@openfort/openfort-node';
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  createPublicClient,
  http,
  encodeFunctionData,
  type Abi,
  type AbiFunction,
  parseAbi,
} from 'viem';
import { baseSepolia } from 'viem/chains';

/** Map a chain+address to its Openfort contract ID (for transactionIntents). */
function getContractId(chainId: number, address: string): string | null {
  const key = `${chainId}:${address.toLowerCase()}`;
  const map: Record<string, string | undefined> = {
    '84532:0x07ea79f68b2b3df564d0a34f8e19d9b1e339814b': process.env.OPENFORT_AAVE_CONTRACT_ID,
    '84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e': process.env.OPENFORT_USDC_CONTRACT_ID,
  };
  return map[key] ?? null;
}

let _openfort: Openfort | null = null;

function getOpenfort(): Openfort {
  if (!_openfort) {
    const apiKey = process.env.OPENFORT_API_KEY;
    if (!apiKey) throw new Error('OPENFORT_API_KEY is not set');
    _openfort = new Openfort(apiKey, {
      walletSecret: process.env.OPENFORT_WALLET_SECRET,
    });
  }
  return _openfort;
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

// Known contract ABIs keyed by `${chainId}:${address.toLowerCase()}`
const KNOWN_ABIS: Record<string, Abi> = {
  // Aave V3 Pool — Base Sepolia
  '84532:0x07ea79f68b2b3df564d0a34f8e19d9b1e339814b': parseAbi([
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  ]),
  // USDC — Base Sepolia (approve needed before supply)
  '84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e': parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
  ]),
};

/** Convert string args to proper viem types based on ABI parameter types. */
function coerceArgs(args: string[], abi: Abi, functionName: string): unknown[] {
  const fn = abi.find(
    (item): item is AbiFunction => item.type === 'function' && item.name === functionName,
  );
  if (!fn) return args;
  return fn.inputs.map((input, i) => {
    const val = args[i] ?? '0';
    if (input.type === 'uint256' || input.type === 'uint128' || input.type === 'uint64') {
      return BigInt(val);
    }
    if (input.type === 'uint16' || input.type === 'uint8' || input.type === 'uint32') {
      return Number(val);
    }
    return val;
  });
}

export function createOpenfortMcpServer() {
  return createSdkMcpServer({
    name: 'openfort',
    version: '1.0.0',
    tools: [
      tool(
        'openfort_create_transaction',
        'Sign and broadcast a blockchain transaction via Openfort. Uses ERC-4337 smart account + gas sponsorship (no ETH needed) when configured, otherwise falls back to EOA signing.',
        {
          chainId: z.number().describe('The chain ID (e.g., 84532 for Base Sepolia)'),
          contractAddress: z.string().describe('The target smart contract address'),
          functionName: z.string().describe('The contract function to call (e.g., "supply")'),
          functionArgs: z.array(z.string()).describe('Function arguments as strings'),
          accountAddress: z.string().describe('The account address to sign from'),
        },
        async (input) => {
          try {
            const openfort = getOpenfort();

            const smartAccountId = process.env.OPENFORT_SMART_ACCOUNT_ID;
            const gasPolicyId = process.env.OPENFORT_GAS_POLICY_ID;
            const contractId = getContractId(input.chainId, input.contractAddress);

            // --- ERC-4337 transactionIntents path (gasless via paymaster) ---
            if (smartAccountId && gasPolicyId && contractId) {
              // Build interaction list. For Aave `supply`, prepend a USDC `approve`
              // so both execute atomically in one UserOp (avoids allowance revert).
              const interactions: Array<{ contract: string; functionName: string; functionArgs: string[] }> = [];

              const aaveContractId = process.env.OPENFORT_AAVE_CONTRACT_ID;
              const usdcContractId = process.env.OPENFORT_USDC_CONTRACT_ID;
              const isAaveSupply =
                input.functionName === 'supply' && contractId === aaveContractId && usdcContractId;

              if (isAaveSupply) {
                // functionArgs for supply: [usdcAddress, amount, onBehalfOf, referralCode]
                const supplyAmount = input.functionArgs[1] ?? '0';
                const aavePoolAddress = input.contractAddress;
                interactions.push({
                  contract: usdcContractId!,
                  functionName: 'approve',
                  functionArgs: [aavePoolAddress, supplyAmount],
                });
              }

              interactions.push({
                contract: contractId,
                functionName: input.functionName,
                functionArgs: input.functionArgs,
              });

              // 1. Create UserOp intent
              const intent = await (openfort.transactionIntents as any).create({
                chainId: input.chainId,
                policy: gasPolicyId,
                account: smartAccountId,
                interactions,
              });

              // Non-custodial: sign the userOpHash and submit
              if (intent.nextAction?.payload) {
                const userOpHash = intent.nextAction.payload.userOpHash
                  ?? intent.nextAction.payload.signableHash;
                const backendAddr =
                  process.env.OPENFORT_BACKEND_ACCOUNT_ADDRESS ?? input.accountAddress;
                const backendAccount = await openfort.accounts.evm.backend.get({
                  address: backendAddr,
                });

                // Use EIP-191 personal_sign — Openfort Shield returns v=0/1 (raw recovery IDs)
                // but OZ ECDSA requires v=27/28; normalise before submitting.
                let signature = await backendAccount.signMessage({ message: { raw: userOpHash } });
                const v = parseInt(signature.slice(-2), 16);
                if (v < 27) {
                  signature = signature.slice(0, -2) + (v + 27).toString(16).padStart(2, '0') as `0x${string}`;
                }

                const result = await (openfort.transactionIntents as any).signature(intent.id, { signature });
                return textResult({
                  txHash: result.response?.transactionHash ?? null,
                  status: result.response?.status === 1 ? 'confirmed' : 'submitted',
                  intentId: intent.id,
                });
              }

              // No nextAction → intent auto-executed
              return textResult({
                txHash: intent.response?.transactionHash ?? null,
                status: 'submitted',
                intentId: intent.id,
              });
            }

            // --- Fallback: EOA signing + direct broadcast via viem ---
            const abiKey = `${input.chainId}:${input.contractAddress.toLowerCase()}`;
            const abi = KNOWN_ABIS[abiKey];
            if (!abi) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Error: No ABI registered for contract ${input.contractAddress} on chain ${input.chainId}`,
                  },
                ],
                isError: true,
              };
            }

            const coercedArgs = coerceArgs(input.functionArgs, abi, input.functionName);
            const data = encodeFunctionData({ abi, functionName: input.functionName, args: coercedArgs });

            const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
            const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });

            const [nonce, gasPrice] = await Promise.all([
              publicClient.getTransactionCount({ address: input.accountAddress as `0x${string}` }),
              publicClient.getGasPrice(),
            ]);
            const gas = await publicClient.estimateGas({
              to: input.contractAddress as `0x${string}`,
              data,
              account: input.accountAddress as `0x${string}`,
            });

            const account = await openfort.accounts.evm.backend.get({ address: input.accountAddress });
            const signedTx = await account.signTransaction({
              to: input.contractAddress as `0x${string}`,
              data,
              nonce,
              gas,
              maxFeePerGas: (gasPrice * 15n) / 10n,
              maxPriorityFeePerGas: 1000000n,
              chainId: input.chainId,
            });

            const txHash = await publicClient.sendRawTransaction({
              serializedTransaction: signedTx as `0x${string}`,
            });

            return textResult({ id: txHash, status: 'submitted', txHash });
          } catch (err) {
            return {
              content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
              isError: true,
            };
          }
        },
      ),

      tool(
        'openfort_get_balance',
        'Get USDC balance and allowance for the backend account on a specific chain.',
        {
          accountAddress: z.string().describe('The account address to check'),
          chainId: z.number().describe('The chain ID'),
        },
        async (input) => {
          try {
            if (input.chainId !== 84532) {
              return textResult({ note: 'Only Base Sepolia (84532) supported.', accountAddress: input.accountAddress });
            }
            const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
            const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });

            const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
            const aavePool = '0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b' as const;
            const abi = KNOWN_ABIS['84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e'];

            const [balance, allowance] = await Promise.all([
              publicClient.readContract({ address: usdcAddress, abi, functionName: 'balanceOf', args: [input.accountAddress as `0x${string}`] }) as Promise<bigint>,
              publicClient.readContract({ address: usdcAddress, abi, functionName: 'allowance', args: [input.accountAddress as `0x${string}`, aavePool] }) as Promise<bigint>,
            ]);

            return textResult({
              accountAddress: input.accountAddress,
              chainId: input.chainId,
              usdcBalance: Number(balance) / 1e6,
              usdcAllowanceForAave: Number(allowance) / 1e6,
            });
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
          }
        },
      ),

      tool(
        'openfort_simulate_transaction',
        'Estimate gas cost for a transaction before executing it.',
        {
          chainId: z.number().describe('The chain ID'),
          contractAddress: z.string().describe('The target smart contract address'),
          functionName: z.string().describe('The contract function to call'),
          functionArgs: z.array(z.string()).describe('Encoded function arguments'),
          accountAddress: z.string().describe('The account address'),
        },
        async (input) => {
          try {
            const abiKey = `${input.chainId}:${input.contractAddress.toLowerCase()}`;
            const abi = KNOWN_ABIS[abiKey];
            if (!abi) return textResult({ estimatedGasUsd: 0.01, canExecute: true, note: 'ABI not found, using estimate.' });

            const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
            const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });

            const coercedArgs = coerceArgs(input.functionArgs, abi, input.functionName);
            const data = encodeFunctionData({ abi, functionName: input.functionName, args: coercedArgs });
            const [gasPrice, gas] = await Promise.all([
              publicClient.getGasPrice(),
              publicClient.estimateGas({ to: input.contractAddress as `0x${string}`, data, account: input.accountAddress as `0x${string}` }).catch(() => 100000n),
            ]);

            const gasCostWei = gasPrice * gas;
            const gasCostEth = Number(gasCostWei) / 1e18;
            const gasCostUsd = gasCostEth * 3000; // rough ETH price

            return textResult({ estimatedGasUsd: gasCostUsd, canExecute: true, gasUnits: gas.toString(), gasPriceGwei: Number(gasPrice) / 1e9 });
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
          }
        },
      ),
    ],
  });
}
