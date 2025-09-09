// src/state/AppStateProvider.tsx
import { useCallback, useEffect, useReducer, useMemo } from "react";
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
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null;
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
      provider: ethers.BrowserProvider |  ethers.JsonRpcProvider | null;
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
  provider: null,
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
        provider: a.provider,
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
  const iface = useMemo(() => new ethers.Interface(abi), []);

  const EventSwitch = useCallback(
    (eventName: string, args?: Record<string, unknown>) => {
      switch (eventName) {
        case "TaskCreated": {
          dispatch({
            type: "LOG",
            text: `Event TaskCreated: ${(args?.description as string) || "Event TaskCreated"}`,
            hash: args?.hash as string,
          });
          break;
        }
        case "TaskUpdated": {
          const id = args?.id as bigint;
          const desc = args?.description as string;
          dispatch({
            type: "LOG",
            text: `Event TaskUpdated: #${id}${desc ? ` -> ${desc}` : ""}`,
            hash: args?.hash as string,
          });
          break;
        }
        case "TaskCompleted": {
          const id = args?.id as bigint;
          dispatch({
            type: "LOG",
            text: `Event TaskCompleted: #${id}`,
            hash: args?.hash as string,
          });
          break;
        }
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (!state.contractAddress) return;

    let accountsHandler: ((accounts: string[]) => void) | null = null;
    let chainHandler: ((chainId: string) => void) | null = null;

    async function init() {
      try {
        const eth = window.ethereum;
        if (!eth) return;

        const provider = getProvider();
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const { chainId } = await provider.getNetwork();

        // fetch historical logs
        try {
          const logs = await provider.getLogs({
            address: state.contractAddress,
            fromBlock: 0n,
            toBlock: "latest",
          });
          for (const log of logs) {
            try {
              const parsed = iface.parseLog({
                topics: log.topics,
                data: log.data,
              });
              if (parsed) {
                const { id, description } = parsed.args as { id?: bigint; description?: string };

                EventSwitch(parsed.name, {
                  id,
                  description,
                  hash: log.transactionHash,
                });
              }
            } catch (err) {
              console.warn("Failed to parse log:", log, err);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch logs:", err);
        }

        dispatch({
          type: "SET_CLIENTS",
          provider,
          signer,
          chainId: Number(chainId),
          account: addr ?? null,
        });

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

        eth.on?.("accountsChanged", accountsHandler);
        eth.on?.("chainChanged", chainHandler);
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
  }, [EventSwitch, state.contractAddress, iface]);

  return (
    <Ctx.Provider value={{ state, dispatch, abi }}>
      {children}
    </Ctx.Provider>
  );
}
