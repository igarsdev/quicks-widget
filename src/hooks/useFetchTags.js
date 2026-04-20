import { useEffect, useState } from "react";
import api from "../services/api";

export default function useFetchTags() {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchTags() {
      try {
        setIsLoading(true);
        setIsError(false);

        const response = await api.get("/tags");

        if (isMounted) {
          setTags(response.data?.data || []);
        }
      } catch {
        if (isMounted) {
          setIsError(true);
          setTags([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTags();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    tags,
    isLoading,
    isError,
  };
}
