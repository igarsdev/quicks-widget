import { useEffect, useState } from "react";
import api from "../services/api";
import { subscribeRealtimeSync } from "../services/realtime";

const isBackendApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL);

export default function useFetchConversations() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!isBackendApiConfigured) {
      setConversations([]);
      setIsLoading(false);
      setIsError(false);
      return undefined;
    }

    let isMounted = true;

    async function fetchConversations() {
      try {
        setIsLoading(true);
        setIsError(false);

        const response = await api.get("/conversations");
        const data = response.data?.data || [];

        if (isMounted) {
          setConversations(data);
        }
      } catch {
        if (isMounted) {
          setIsError(true);
          setConversations([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchConversations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isBackendApiConfigured) {
      return undefined;
    }

    return subscribeRealtimeSync(() => {
      setIsLoading(true);

      void api
        .get("/conversations")
        .then((response) => setConversations(response.data?.data || []))
        .catch(() => setIsError(true))
        .finally(() => setIsLoading(false));
    });
  }, []);

  return {
    conversations,
    isLoading,
    isError,
  };
}
