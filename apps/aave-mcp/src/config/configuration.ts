// Per-network contract addresses
const NETWORKS: Record<number, {
  rpcUrl: string;
  aavePool: string;
  poolDataProvider: string;
  uniswapRouter: string;
  uniswapQuoter: string;
  tokens: Record<string, string>;
}> = {
  // Base Mainnet
  8453: {
    rpcUrl: "https://base-rpc.publicnode.com",
    aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
    uniswapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapQuoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      GHO: "0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee",
      EURC: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
      WETH: "0x4200000000000000000000000000000000000006",
      cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
      wstETH: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
      weETH: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A",
      ezETH: "0x2416092f143378750bb29b79eD961ab195CcEea5",
      wrsETH: "0xEDfa23602D0EC14714057867A78d01e94176BEA0",
      cbBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      LBTC: "0xecAc9C5F704e954931349Da37F60E39f515c11c1",
      AAVE: "0x63706e401c06ac8513145b7687A14804d17f814b",
    },
  },
  // Base Sepolia Testnet
  84532: {
    rpcUrl: "https://sepolia.base.org",
    aavePool: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
    poolDataProvider: "0x29e1ef0209275d0f403e8c57861c2df8706ea244",
    uniswapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapQuoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      WETH: "0x4200000000000000000000000000000000000006",
    },
  },
};

export default () => {
  // Read CHAIN_ID here (inside the factory fn) so ConfigModule's dotenv has already run
  const chainId = parseInt(process.env.CHAIN_ID || "8453", 10);
  const network = NETWORKS[chainId] ?? NETWORKS[8453];

  return {
    port: parseInt(process.env.PORT || "8080", 10),
    blockchain: {
      rpcUrl: process.env.RPC_URL || network.rpcUrl,
      chainId,
      privateKey: process.env.PRIVATE_KEY || "",
      autoExecute: process.env.AUTO_EXECUTE === "true",
    },
    contracts: {
      aavePool: network.aavePool,
      poolDataProvider: network.poolDataProvider,
      uniswapRouter: network.uniswapRouter,
      uniswapQuoter: network.uniswapQuoter,
    },
    tokens: network.tokens,
    uniswap: {
      feeTiers: [100, 500, 3000, 10000], // 0.01%, 0.05%, 0.3%, 1%
      maxSlippage: 1, // 1%
    },
    logging: {
      level: process.env.LOG_LEVEL || "info",
    },
  };
};
