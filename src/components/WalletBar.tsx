// src/components/WalletBar.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getProvider } from "../utils/provider";

export function WalletBar({
  account,
  chainLabel,
  onConnect,
  onDisconnect,
}: {
  account: string | null;
  chainLabel: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [balance, setBalance] = useState<string>("");

  useEffect(() => {
    let active = true;
    async function load() { 
      try {
        if (account) {
          const provider = getProvider();
          const bal = await provider.getBalance(account);
          if (!active) return;
          setBalance(`${ethers.formatEther(bal)} ETH`);
        } else {
          setBalance("");
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [account]);

  return (
    <div className="w-full max-w-xl mx-auto mb-6 p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-lg flex flex-col gap-4">
      {/* Wallet info */}
      <div className="space-y-2">
        <div>
          <span className="block text-xs uppercase text-indigo-600 font-semibold">
            Network
          </span>
          <span className="text-sm font-bold text-indigo-900">
            {chainLabel || "Unknown"}
          </span>
        </div>

        <div>
          <span className="block text-xs uppercase text-indigo-600 font-semibold">
            Account
          </span>
          <span
            className="text-sm font-mono text-gray-900 truncate block max-w-full"
            title={account || "Not connected"}
          >
            {account || "Not connected"}
          </span>
        </div>

        {balance && (
          <div>
            <span className="block text-xs uppercase text-green-600 font-semibold">
              Balance
            </span>
            <span className="text-sm font-semibold text-green-700">
              {balance}
            </span>
          </div>
        )}
      </div>

      {/* Buttons under balance */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        {account ? (
          <button
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:scale-105 transition"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:scale-105 transition disabled:bg-indigo-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            onClick={onConnect}
          >
            Connect Wallet
          </button>
        )}

        {account && (
          <button
            className="w-full sm:w-auto text-xs bg-indigo-100 px-3 py-2 rounded-xl hover:bg-indigo-200 transition font-semibold"
            onClick={() => navigator.clipboard.writeText(account)}
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
