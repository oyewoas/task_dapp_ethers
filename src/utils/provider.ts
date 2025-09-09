// src/utils/provider.ts
import { BrowserProvider, JsonRpcProvider } from "ethers";

// You can use environment variables for your RPC URLs
const DEFAULT_RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc.sepolia-api.lisk.com";

export function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    // Use the user's browser wallet
    return new BrowserProvider(window.ethereum);
  }

  // Fallback to public/mainnet RPC
  return new JsonRpcProvider(DEFAULT_RPC_URL);
}
