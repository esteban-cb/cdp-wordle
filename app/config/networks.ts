import { NetworkConfig } from "../types/wordle";

export const NETWORKS: Record<string, NetworkConfig> = {
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia Testnet",
    chainId: "0x14a34", // 84532 in hex
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    isTestnet: true,
    faucetUrl: "https://www.coinbase.com/faucets/base-sepolia-faucet",
  },
  base: {
    id: "base",
    name: "Base Mainnet",
    chainId: "0x2105", // 8453 in hex
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
    isTestnet: false,
  },
};

export const DEFAULT_NETWORK: NetworkConfig = NETWORKS["base-sepolia"];

export function getNetworkById(id: string): NetworkConfig | undefined {
  return NETWORKS[id];
}

export function getNetworkByChainId(
  chainId: string
): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((network) => network.chainId === chainId);
}
