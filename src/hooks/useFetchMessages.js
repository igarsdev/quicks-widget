import axios from "axios";
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  mergeStoredMessages,
  subscribeStoredMessageChanges,
} from "../services/messageStore";
import { subscribeRealtimeSync } from "../services/realtime";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const isCustomApiConfigured = Boolean(configuredBaseUrl);
const hasDummyApiAppId = Boolean(import.meta.env.VITE_DUMMY_API_APP_ID);

function normalizeDummyApiMessage(comment) {
  const firstName = comment.owner?.firstName || "Unknown";
  const lastName = comment.owner?.lastName || "User";
  const ownerId = comment.owner?.id || null;
  const ownerEmail = comment.owner?.email || null;

  return {
    id: String(comment.id),
    postId: String(comment.post || "general"),
    userId: ownerId,
    name: `${firstName} ${lastName}`,
    email:
      ownerEmail ||
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@dummyapi.io`,
    body: comment.message || "",
    createdAt: comment.publishDate || new Date().toISOString(),
    replyTo: comment.replyTo || null,
    senderClientId: comment.senderClientId || null,
    clientMessageId: comment.clientMessageId || null,
  };
}

function normalizePlaceholderMessage(comment) {
  return {
    id: comment.id,
    postId: comment.postId || 1,
    userId: null,
    name: comment.name || "Unknown User",
    email: comment.email || "unknown@jsonplaceholder.typicode.com",
    body: comment.body,
  };
}

export default function useFetchMessages() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const isBackendApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL);

  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      try {
        setIsLoading(true);
        setIsError(false);
        setIsUsingFallback(false);

        if (!isCustomApiConfigured && !hasDummyApiAppId) {
          throw new Error("Missing dummyapi.io app-id");
        }

        const commentsResponse = await api.get("/comment", {
          params: {
            limit: 50,
            page: 0,
          },
        });

        const comments = commentsResponse.data?.data || [];
        const normalized = comments.map(normalizeDummyApiMessage);

        if (isMounted) {
          setMessages(
            isBackendApiConfigured
              ? normalized
              : mergeStoredMessages(normalized),
          );
          setIsUsingFallback(false);
        }
      } catch (error) {
        if (isBackendApiConfigured) {
          if (isMounted) {
            setIsError(true);
            setMessages([]);
            setIsUsingFallback(false);
          }

          return;
        }

        try {
          const response = await axios.get(
            "https://jsonplaceholder.typicode.com/comments",
            {
              timeout: 10000,
            },
          );

          const fallbackMessages = (response.data || [])
            .slice(0, 140)
            .map(normalizePlaceholderMessage);

          if (isMounted) {
            setMessages(mergeStoredMessages(fallbackMessages));
            setIsError(false);
            setIsUsingFallback(true);
          }
        } catch {
          if (isMounted) {
            setIsError(true);
            setMessages([]);
            setIsUsingFallback(false);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (isBackendApiConfigured) {
      return subscribeRealtimeSync(() => {
        setReloadToken((current) => current + 1);
      });
    }

    return subscribeStoredMessageChanges(() => {
      setReloadToken((current) => current + 1);
    });
  }, [isBackendApiConfigured]);

  const refetchMessages = () => {
    setReloadToken((current) => current + 1);
  };

  return {
    messages,
    isLoading,
    isError,
    isUsingFallback,
    isDummyApiConfigured: isCustomApiConfigured || hasDummyApiAppId,
    refetchMessages,
  };
}
