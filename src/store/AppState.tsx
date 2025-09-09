// src/state/AppStateProvider.tsx
import { useEffect, useReducer } from "react";
import { ethers } from "ethers";
import abi from "../utils/abi.json";
import { Ctx } from "./context";
import { getProvider } from "../utils/provider";

const CONTRACT_ADDRESS =
  typeof import.meta.env.VITE_CONTRACT_ADDRESS === "string" &&
  import.meta.env.VITE_CONTRACT_ADDRESS.startsWith("0x")
    ? (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`)
    : "0x5f4e91138f7557227fD80c7417c3ecED2A4f9E4b";

export type Task = { id: bigint; description: string; completed: boolean };

export type LogEntry = { text: string; hash?: string };
export type NoticeEntry = { text: string };

export type AppState = {
  signer: ethers.Signer | null;
  account: string | null;
  contractAddress: string;
  chainId: number | null;
  tasks: Task[];
  isLoading: boolean;
  txPending: boolean;
  notices: NoticeEntry[];
  logs: LogEntry[];
  error: string;
};

export type AppAction =
  | {
      type: "SET_CLIENTS";
      signer: ethers.Signer | null;
      chainId: number | null;
      account: string | null;
    }
  | { type: "SET_ACCOUNT"; account: string | null }
  | { type: "SET_CHAIN_ID"; chainId: number | null }
  | { type: "SET_TASKS"; tasks: Task[] }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_TX"; txPending: boolean }
  | { type: "SET_LOGS"; logs: LogEntry[] }
  | { type: "NOTICE"; text: string }
  | { type: "LOG"; text: string; hash?: string }
  | { type: "ERROR"; error: string };

const initial: AppState = {
  signer: null,
  account: null,
  chainId: null,
  tasks: [],
  isLoading: false,
  txPending: false,
  contractAddress: CONTRACT_ADDRESS,
  notices: [],
  logs: [],
  error: "",
};

function reducer(state: AppState, a: AppAction): AppState {
  switch (a.type) {
    case "SET_CLIENTS":
      return {
        ...state,
        signer: a.signer,
        chainId: a.chainId,
        account: a.account,
      };
    case "SET_ACCOUNT":
      return { ...state, account: a.account };
    case "SET_CHAIN_ID":
      return { ...state, chainId: a.chainId };
    case "SET_TASKS":
      return { ...state, tasks: a.tasks };
    case "SET_LOADING":
      return { ...state, isLoading: a.isLoading };
    case "SET_TX":
      return { ...state, txPending: a.txPending };
    case "SET_LOGS":
      return { ...state, logs: a.logs };
    case "NOTICE":
      return {
        ...state,
        notices: [{ text: a.text }, ...state.notices].slice(0, 5),
      };
    case "LOG":
      return {
        ...state,
        logs: [{ text: a.text, hash: a.hash }, ...state.logs].slice(0, 25),
      };
    case "ERROR":
      return { ...state, error: a.error };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (!state.contractAddress) return;

    let accountsHandler: ((accounts: string[]) => void) | null = null;
    let chainHandler: ((chainId: string) => void) | null = null;

    async function init() {
      try {


        const provider = getProvider();
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const { chainId } = await provider.getNetwork();
        dispatch({
          type: "SET_CLIENTS",
          signer,
          chainId: Number(chainId),
          account: addr ?? null,
        });
        // fetch historical logs
       

      

        // attach listeners
        accountsHandler = (accounts: string[]) => {
          dispatch({
            type: "SET_ACCOUNT",
            account: accounts?.[0] ?? null,
          });
        };

        chainHandler = (hexChainId: string) => {
          dispatch({
            type: "SET_CHAIN_ID",
            chainId: Number(hexChainId) || null,
          });
        };

        window.ethereum.on?.("accountsChanged", accountsHandler);
        window.ethereum.on?.("chainChanged", chainHandler);
      } catch (e) {
        dispatch({
          type: "ERROR",
          error: e instanceof Error ? e.message : "Failed to initialize wallet",
        });
      }
    }

    init();

    return () => {
      if (accountsHandler)
        window.ethereum?.removeListener?.("accountsChanged", accountsHandler);
      if (chainHandler)
        window.ethereum?.removeListener?.("chainChanged", chainHandler);
    };
  }, [state.contractAddress]);

  return (
    <Ctx.Provider value={{ state, dispatch, abi }}>
      {children}
    </Ctx.Provider>
  );
}
