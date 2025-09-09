// src/hooks/useTaskRead.ts
import { useCallback, useMemo } from "react";
import { Contract, ethers } from "ethers";
import { useAppState } from "../store/context";
import { getErrorMessage } from "../utils/errors";
import type { Task } from "../types";
import { getProvider } from "../utils/provider";

export function useTaskRead() {
  const { state, dispatch, abi } = useAppState();
  const { contractAddress } = state;
  const iface = useMemo(() => new ethers.Interface(abi), [abi]);
  const EventSwitch = useCallback(
    (eventName: string, args?: Record<string, unknown>) => {
      switch (eventName) {
        case "TaskCreated": {
          dispatch({
            type: "LOG",
            text: `Event TaskCreated: ${
              (args?.description as string) || "Event TaskCreated"
            }`,
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
  const loadTasks = useCallback(async () => {
    if (!contractAddress) return;
    dispatch({ type: "SET_LOADING", isLoading: true });
    dispatch({ type: "ERROR", error: "" });

    try {
      // use signer if available (wallet connected), otherwise readonly provider
      const provider = getProvider();
      const contract = new Contract(contractAddress, abi, provider);

      const list = (await contract.getTasks()) as Task[];
      dispatch({ type: "SET_TASKS", tasks: list });
    } catch (e) {
      const msg = getErrorMessage(e);
      dispatch({ type: "ERROR", error: msg });
    } finally {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, [contractAddress, abi, dispatch]);

  const loadLogs = useCallback(async () => {
    try {
      const provider = getProvider();

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
            const { id, description } = parsed.args as {
              id?: bigint;
              description?: string;
            };

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
  }, [state.contractAddress, EventSwitch, iface]);

  return {
    loadTasks,
    loadLogs,
    tasks: state.tasks,
    isLoading: state.isLoading,
  };
}
