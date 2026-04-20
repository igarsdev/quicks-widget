import { useEffect, useState } from "react";
import api from "../services/api";
import { subscribeRealtimeSync } from "../services/realtime";

export default function useFetchTodos(filter = "my", owner = "user-local") {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchTodos() {
      try {
        setIsLoading(true);
        setIsError(false);

        const response = await api.get("/todos", {
          params: {
            filter,
            owner,
          },
        });

        if (isMounted) {
          setTodos(response.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setIsError(true);
          setTodos([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, [filter, owner, reloadToken]);

  useEffect(() => {
    return subscribeRealtimeSync((syncEvent) => {
      if (syncEvent.type !== "todos") {
        return;
      }

      setReloadToken((current) => current + 1);
    });
  }, []);

  const refetchTodos = () => {
    setReloadToken((current) => current + 1);
  };

  return { todos, setTodos, isLoading, isError, refetchTodos };
}
