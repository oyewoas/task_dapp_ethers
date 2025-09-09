// src/utils/chains.ts
import type { Network } from "ethers";

export function getChainLabel(chainId: number | null, chain?: Network): string {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 11155111:
      return "Sepolia";
    case 17000:
      return "Holesky";
    case 4202:
      return "Lisk Sepolia";
    default:
      return chain?.name ?? "Unknown";
  }
}

export function getExplorerBase(chainId: number | null): string {
  switch (chainId) {
    case 1:
      return "https://etherscan.io";
    case 11155111:
      return "https://sepolia.etherscan.io";
    case 17000:
      return "https://holesky.etherscan.io";
    case 4202:
      return "https://sepolia-blockscout.lisk.com";
    default:
      return "";
  }
}
