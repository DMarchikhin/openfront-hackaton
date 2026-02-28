import 'dotenv/config';
import Openfort from '@openfort/openfort-node';
import fs from 'fs';
import path from 'path';

// Known Aave V3 Pool contract ID on Base Sepolia (already registered in Openfort)
const KNOWN_AAVE_CONTRACT_ID = 'con_ceb98180-51ea-4213-b0fe-ee114a61f3cf';

async function main() {
  const apiKey = process.env.OPENFORT_API_KEY;
  if (!apiKey) throw new Error('OPENFORT_API_KEY not set in .env');

  const openfort = new Openfort(apiKey);

  const agentEnvPath = path.resolve(__dirname, '../../.env');
  const apiEnvPath = path.resolve(__dirname, '../../../api/.env');

  // Step 1: Create a Player entity representing the DeFi agent
  console.log('Step 1: Creating Openfort player (DeFi Agent)...');
  const player = await openfort.players.create({ name: 'DeFi Agent' });
  console.log('  Player ID:', player.id);
  patchEnv(agentEnvPath, 'OPENFORT_PLAYER_ID', player.id);

  // Step 2: Create a custodial v1 ERC-4337 smart account for the player
  // Omitting externalOwnerAddress → fully custodial, Openfort signs UserOps internally
  console.log('\nStep 2: Creating custodial ERC-4337 smart account...');
  const smartAccount = await openfort.accounts.v1.create({
    player: player.id,
    chainId: 84532,
  });
  console.log('  Smart account ID:      ', smartAccount.id);
  console.log('  Smart account address: ', smartAccount.address);
  patchEnv(agentEnvPath, 'OPENFORT_SMART_ACCOUNT_ID', smartAccount.id);
  patchEnv(agentEnvPath, 'OPENFORT_SMART_ACCOUNT_ADDRESS', smartAccount.address);
  patchEnv(agentEnvPath, 'WALLET_ADDRESS', smartAccount.address);
  patchEnv(apiEnvPath, 'OPENFORT_SMART_ACCOUNT_ID', smartAccount.id);
  patchEnv(apiEnvPath, 'OPENFORT_SMART_ACCOUNT_ADDRESS', smartAccount.address);
  patchEnv(apiEnvPath, 'WALLET_ADDRESS', smartAccount.address);

  // Step 3: Register USDC contract
  console.log('\nStep 3: Registering USDC contract...');
  const usdcContract = await (openfort.contracts as any).create({
    name: 'USDC Base Sepolia',
    chainId: 84532,
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    abi: [
      {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
      },
    ],
  });
  console.log('  USDC contract ID: ', usdcContract.id);
  patchEnv(agentEnvPath, 'OPENFORT_USDC_CONTRACT_ID', usdcContract.id);

  // Use known Aave contract ID
  patchEnv(agentEnvPath, 'OPENFORT_AAVE_CONTRACT_ID', KNOWN_AAVE_CONTRACT_ID);
  console.log('\nStep 3b: Aave contract ID (known):', KNOWN_AAVE_CONTRACT_ID);

  // Step 4: Create gas sponsorship policy
  console.log('\nStep 4: Creating gas sponsorship policy...');
  const policy = await (openfort.policies as any).create({
    scope: 'project',
    description: 'Sponsor all Base Sepolia transactions',
    rules: [
      {
        action: 'accept',
        operation: 'sponsorEvmTransaction',
        criteria: [{ type: 'evmNetwork', operator: 'in', chainIds: [84532] }],
      },
    ],
  });
  console.log('  Policy ID:', policy.id);

  const sponsorship = await (openfort.feeSponsorship as any).create({
    name: 'DeFi Agent Gas Sponsorship',
    strategy: { sponsorSchema: 'pay_for_user' },
    policyId: policy.id,
  });
  console.log('  Sponsorship ID:', sponsorship.id);
  patchEnv(agentEnvPath, 'OPENFORT_GAS_POLICY_ID', sponsorship.id);

  console.log('\n--- Setup complete ---');
  console.log('WALLET_ADDRESS (smart account):', smartAccount.address);
  console.log('OPENFORT_PLAYER_ID:            ', player.id);
  console.log('OPENFORT_SMART_ACCOUNT_ID:     ', smartAccount.id);
  console.log('OPENFORT_GAS_POLICY_ID:        ', sponsorship.id);
  console.log('OPENFORT_AAVE_CONTRACT_ID:     ', KNOWN_AAVE_CONTRACT_ID);
  console.log('OPENFORT_USDC_CONTRACT_ID:     ', usdcContract.id);
  console.log('\nFund the smart account with testnet USDC:');
  console.log(' ', smartAccount.address);
  console.log('\nThen restart the agent and API servers.');
}

function patchEnv(filePath: string, key: string, value: string) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, content);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
