import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  EllipsisVertical,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWidget } from "../../context/WidgetContext";
import useFetchConversations from "../../hooks/useFetchConversations";
import useFetchMessages from "../../hooks/useFetchMessages";
import api from "../../services/api";
import {
  addStoredMessage,
  getOrCreateClientId,
  readStoredMessages,
  removeStoredMessage,
  updateStoredMessage,
} from "../../services/messageStore";
import MessageList from "./MessageList";
import MessageSkeleton from "./MessageSkeleton";

const MOCK_OWNER_ID =
  import.meta.env.VITE_DUMMY_API_OWNER_ID || "60d0fe4f5311236168a109ca";

function displayNameFromClientId(clientId) {
  const normalized = String(clientId || "");
  const suffix = normalized.slice(-4) || "peer";
  return `User ${suffix}`;
}

function getMessageLogicalKey(message) {
  return String(message.clientMessageId || message.id);
}

function stableNumberFromKey(value) {
  const text = String(value || "0");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000;
  }

  return hash;
}

function safeDate(value, fallback = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? fallback : date;
}

function formatThreadTimestamp(value) {
  const safeValue = safeDate(value);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(safeValue);

  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(safeValue);

  return `${dateLabel} ${timeLabel}`;
}

function formatMessageTime(value) {
  const safeValue = safeDate(value);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(safeValue);
}

function dateGroupLabel(value) {
  const date = safeDate(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toDateString();
  if (dateKey === today.toDateString()) {
    return "Today";
  }

  if (dateKey === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildThreads(messages) {
  const grouped = messages.reduce((accumulator, message) => {
    const threadId = String(message.postId || "general");

    if (!accumulator[threadId]) {
      accumulator[threadId] = [];
    }

    accumulator[threadId].push(message);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([threadId, threadMessages]) => {
      const sorted = [...threadMessages].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      const latest = sorted[0];
      const threadSeed = stableNumberFromKey(threadId);
      const latestSeed = stableNumberFromKey(latest.id);
      const fallbackDate = new Date(
        2021,
        5,
        (threadSeed % 28) + 1,
        8 + (latestSeed % 11),
        (latestSeed * 7) % 60,
      );
      const threadDate = safeDate(latest.createdAt, fallbackDate);

      return {
        id: String(threadId),
        title: latest.name,
        sender: latest.email
          ? `${latest.email.split("@")[0].replace(/[._]/g, " ")} :`
          : `${latest.name.split(" ").slice(0, 2).join(" ")} :`,
        preview: latest.body,
        initial: (latest.name || "Q").trim().charAt(0),
        timeLabel: formatThreadTimestamp(threadDate),
        unreadCount: threadSeed % 4 === 0 ? (threadSeed % 3) + 1 : 0,
        unread: threadSeed % 4 === 0,
        participantCount: threadSeed % 3 === 0 ? 3 : 2,
        latestCreatedAt: threadDate.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime(),
    );
}

function getStatusMeta(status) {
  if (status === "sending") {
    return {
      label: "Sending",
      icon: <Clock3 size={11} />,
      className: "text-[#6b7280]",
    };
  }

  if (status === "sent") {
    return {
      label: "Sent",
      icon: <Check size={11} />,
      className: "text-[#6b7280]",
    };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      icon: <AlertCircle size={11} />,
      className: "text-[#dc2626]",
    };
  }

  return {
    label: "Read",
    icon: <CheckCheck size={11} />,
    className: "text-[#2563eb]",
  };
}

export default function Messaging() {
  const {
    messages,
    isLoading,
    isError,
    isUsingFallback,
    isDummyApiConfigured,
    refetchMessages,
  } = useFetchMessages();
  const { conversations } = useFetchConversations();
  const {
    closeWidget,
    goToMessagingList,
    messagingView,
    openThread,
    selectedThreadId,
  } = useWidget();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [localMessagesByThread, setLocalMessagesByThread] = useState({});
  const [deletedMessageIds, setDeletedMessageIds] = useState([]);
  const [editedBodies, setEditedBodies] = useState({});
  const [actionMenuId, setActionMenuId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [shareNotice, setShareNotice] = useState("");
  const [shareTargetMessage, setShareTargetMessage] = useState(null);
  const [shareThreadId, setShareThreadId] = useState("");
  const [shareError, setShareError] = useState("");
  const [messageStatusesById, setMessageStatusesById] = useState({});
  const [readThreadIds, setReadThreadIds] = useState([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const isBackendApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL);
  const messagesViewportRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const editingTextareaRef = useRef(null);
  const composerTextareaRef = useRef(null);
  const currentClientId = useMemo(() => getOrCreateClientId(), []);
  const testerLabel = useMemo(
    () => displayNameFromClientId(currentClientId),
    [currentClientId],
  );

  const allThreads = useMemo(() => buildThreads(messages), [messages]);

  const threadsWithReadState = useMemo(
    () =>
      allThreads.map((thread) => ({
        ...thread,
        unread: thread.unread && !readThreadIds.includes(thread.id),
      })),
    [allThreads, readThreadIds],
  );

  const filteredThreads = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return threadsWithReadState.slice(0, 5);
    }

    return threadsWithReadState
      .filter(
        (thread) =>
          thread.title.toLowerCase().includes(keyword) ||
          thread.preview.toLowerCase().includes(keyword),
      )
      .slice(0, 5);
  }, [search, threadsWithReadState]);

  const selectedThread = useMemo(
    () =>
      threadsWithReadState.find(
        (thread) => thread.id === String(selectedThreadId),
      ) || null,
    [selectedThreadId, threadsWithReadState],
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => String(conversation.id) === String(selectedThreadId),
      ) || null,
    [conversations, selectedThreadId],
  );

  const visibleMessages = useMemo(() => {
    if (!selectedThread) {
      return [];
    }

    const localMessages = localMessagesByThread[selectedThread.id] || [];

    const remoteMessages = messages
      .filter((message) => String(message.postId) === selectedThread.id)
      .map((message) => {
        const messageSeed = stableNumberFromKey(message.id);
        const fallbackDate = new Date(
          2021,
          5,
          (messageSeed % 28) + 1,
          8 + (messageSeed % 11),
          (messageSeed * 7) % 60,
        );
        const inferredOwn = message.userId
          ? String(message.userId) === String(MOCK_OWNER_ID)
          : messageSeed % 2 === 0;

        return {
          ...message,
          id: String(message.id),
          isOwn: message.isOwn || inferredOwn,
          createdAt: safeDate(message.createdAt, fallbackDate).toISOString(),
          name: message.isOwn || inferredOwn ? "You" : message.name,
        };
      });

    return [...remoteMessages, ...localMessages]
      .filter((message) => !deletedMessageIds.includes(String(message.id)))
      .filter(
        (message, index, collection) =>
          collection.findIndex(
            (item) =>
              getMessageLogicalKey(item) === getMessageLogicalKey(message),
          ) === index,
      )
      .map((message) => {
        const senderClientId = message.senderClientId
          ? String(message.senderClientId)
          : null;
        const isOwnFromSender = senderClientId
          ? senderClientId === String(currentClientId)
          : null;
        const isOwnMessage =
          isOwnFromSender === null ? Boolean(message.isOwn) : isOwnFromSender;

        return {
          ...message,
          isOwn: isOwnMessage,
          name: isOwnMessage
            ? "You"
            : senderClientId
              ? displayNameFromClientId(senderClientId)
              : message.name || "Unknown User",
          body: editedBodies[String(message.id)] ?? message.body,
          status:
            messageStatusesById[String(message.id)] ||
            message.status ||
            (isOwnMessage ? "read" : null),
        };
      })
      .sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      );
  }, [
    deletedMessageIds,
    editedBodies,
    localMessagesByThread,
    messageStatusesById,
    messages,
    selectedThread,
  ]);

  const firstOwnMessageIndex = useMemo(
    () => visibleMessages.findIndex((message) => message.isOwn),
    [visibleMessages],
  );

  const failedOwnMessagesInThread = useMemo(
    () =>
      visibleMessages.filter(
        (message) => message.isOwn && message.status === "failed",
      ),
    [visibleMessages],
  );

  const shareThreadOptions = useMemo(
    () =>
      threadsWithReadState.map((thread) => ({
        id: String(thread.id),
        title: thread.title,
      })),
    [threadsWithReadState],
  );

  const scrollToBottom = useCallback((behavior = "auto") => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const handleMessageScroll = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setIsNearBottom(distanceFromBottom < 72);
  }, []);

  useEffect(() => {
    const handleDocumentPointerDown = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('[data-message-actions="true"]')) {
        return;
      }

      setActionMenuId(null);
    };

    const handleDocumentKeyDown = (event) => {
      if (event.key === "Escape") {
        setActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  useEffect(() => {
    if (messagingView !== "detail") {
      return;
    }

    setIsNearBottom(true);
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [messagingView, scrollToBottom, selectedThreadId]);

  useEffect(() => {
    if (!editingMessageId) {
      return;
    }

    requestAnimationFrame(() => {
      const textarea = editingTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }, [editingMessageId]);

  useEffect(() => {
    if (!selectedThread || messagingView !== "detail") {
      return;
    }

    if (isNearBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [
    isNearBottom,
    messagingView,
    scrollToBottom,
    selectedThread,
    visibleMessages.length,
  ]);

  useEffect(() => {
    if (messagingView === "detail") {
      return;
    }

    setActionMenuId(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, [messagingView]);

  useEffect(() => {
    setActionMenuId(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, [selectedThreadId]);

  useEffect(() => {
    if (!isBackendApiConfigured) {
      return;
    }

    setLocalMessagesByThread((current) => {
      let hasChanges = false;
      const remoteKeys = new Set(
        messages.map((message) => getMessageLogicalKey(message)),
      );
      const next = {};

      for (const [threadId, threadMessages] of Object.entries(current)) {
        const filtered = threadMessages.filter((message) => {
          const logicalKey = getMessageLogicalKey(message);

          if (message.clientMessageId && remoteKeys.has(logicalKey)) {
            hasChanges = true;
            return false;
          }

          return true;
        });

        if (filtered.length !== threadMessages.length) {
          hasChanges = true;
        }

        next[threadId] = filtered;
      }

      return hasChanges ? next : current;
    });
  }, [isBackendApiConfigured, messages]);

  const openThreadDetail = (threadId) => {
    setDraft("");
    setActionMenuId(null);
    setEditingMessageId(null);
    setEditingDraft("");
    setReadThreadIds((current) =>
      current.includes(String(threadId))
        ? current
        : [...current, String(threadId)],
    );
    openThread(threadId);
  };

  const handleBackToList = () => {
    setActionMenuId(null);
    setEditingMessageId(null);
    setEditingDraft("");
    setReplyTarget(null);
    goToMessagingList();
  };

  const handleReplyMessage = (message) => {
    setReplyTarget({
      id: String(message.id),
      name: message.name || "Unknown User",
      body: String(message.body || ""),
    });
    setActionMenuId(null);

    requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleShareMessage = (message) => {
    setShareTargetMessage({
      id: String(message.id),
      name: message.name || "Unknown User",
      body: String(message.body || ""),
    });
    setShareThreadId(String(selectedThread?.id || ""));
    setShareError("");
    setActionMenuId(null);
  };

  const setMessageStatus = useCallback((messageId, status) => {
    const normalizedId = String(messageId);

    if (!isBackendApiConfigured && normalizedId.startsWith("local-")) {
      updateStoredMessage(normalizedId, (message) => ({
        ...message,
        status,
      }));
    }

    setMessageStatusesById((current) => ({
      ...current,
      [normalizedId]: status,
    }));
  }, []);

  const sendMessageToApi = useCallback(
    async ({ messageId, content, threadId, clientMessageId, replyTo }) => {
      setMessageStatus(messageId, "sending");

      if (isBackendApiConfigured && !isUsingFallback) {
        try {
          await api.post("/comment/create", {
            message: content,
            post: threadId,
            owner: {
              id: currentClientId,
              firstName: "Local",
              lastName: "Tester",
              email: `${currentClientId}@example.test`,
            },
            senderClientId: currentClientId,
            clientMessageId,
            replyTo,
          });

          setMessageStatus(messageId, "sent");

          window.setTimeout(() => {
            setMessageStatus(messageId, "read");
          }, 500);

          return true;
        } catch {
          setMessageStatus(messageId, "failed");
          return false;
        }
      }

      // In local two-tab test mode (fallback/no app-id), consider message delivered.
      if (!isDummyApiConfigured || isUsingFallback) {
        setMessageStatus(messageId, "sent");
        window.setTimeout(() => {
          setMessageStatus(messageId, "read");
        }, 500);
        return true;
      }

      try {
        await api.post("/comment/create", {
          message: content,
          post: threadId,
          owner: {
            id: MOCK_OWNER_ID,
            firstName: "Local",
            lastName: "Tester",
            email: `${currentClientId}@example.test`,
          },
          senderClientId: currentClientId,
          clientMessageId,
          replyTo,
        });

        setMessageStatus(messageId, "sent");

        window.setTimeout(() => {
          setMessageStatus(messageId, "read");
        }, 900);

        return true;
      } catch {
        setMessageStatus(messageId, "failed");
        return false;
      }
    },
    [
      currentClientId,
      isBackendApiConfigured,
      isDummyApiConfigured,
      isUsingFallback,
      setMessageStatus,
    ],
  );

  const queueOutgoingMessage = useCallback(
    async ({ threadId, content, replyTo = null }) => {
      const clientMessageId = `client-${currentClientId}-${Date.now()}`;
      const localId = `local-${clientMessageId}`;

      setMessageStatus(localId, "sending");

      if (!isBackendApiConfigured) {
        addStoredMessage({
          id: localId,
          postId: threadId,
          userId: 999,
          name: "You",
          email: "you@quicks.dev",
          body: content,
          isOwn: true,
          senderClientId: currentClientId,
          replyTo,
          createdAt: new Date().toISOString(),
          status: "sending",
        });
      }

      setLocalMessagesByThread((current) => {
        const currentThread = current[threadId] || [];

        return {
          ...current,
          [threadId]: [
            ...currentThread,
            {
              id: localId,
              postId: threadId,
              userId: 999,
              name: "You",
              email: "you@quicks.dev",
              body: content,
              isOwn: true,
              senderClientId: currentClientId,
              replyTo,
              clientMessageId,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });

      if (String(selectedThread?.id) === String(threadId)) {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }

      await sendMessageToApi({
        messageId: localId,
        content,
        threadId,
        clientMessageId,
        replyTo,
      });
    },
    [
      currentClientId,
      isBackendApiConfigured,
      scrollToBottom,
      selectedThread,
      sendMessageToApi,
      setMessageStatus,
    ],
  );

  const handleForwardSharedMessage = async () => {
    if (!shareTargetMessage) {
      return;
    }

    const targetThreadId = String(shareThreadId || selectedThread?.id || "");
    if (!targetThreadId) {
      setShareError("Please select a target conversation");
      return;
    }

    const forwardedBody = `Forwarded from ${shareTargetMessage.name}:\n${shareTargetMessage.body}`;

    await queueOutgoingMessage({
      threadId: targetThreadId,
      content: forwardedBody,
    });

    setShareTargetMessage(null);
    setShareThreadId("");
    setShareError("");
    setShareNotice("Message forwarded");

    window.setTimeout(() => {
      setShareNotice("");
    }, 1600);
  };

  const submitDraft = async () => {
    if (!selectedThread) {
      return;
    }

    const content = draft.trim();
    if (!content) {
      return;
    }

    const threadId = selectedThread.id;
    const replyPayload = replyTarget
      ? {
          id: replyTarget.id,
          name: replyTarget.name,
          body: replyTarget.body,
        }
      : null;

    setDraft("");
    setReplyTarget(null);

    await queueOutgoingMessage({
      threadId,
      content,
      replyTo: replyPayload,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void submitDraft();
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  };

  const startEditingMessage = (message) => {
    setEditingMessageId(String(message.id));
    setEditingDraft(message.body);
    setActionMenuId(null);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingDraft("");
  };

  const handleSaveEdit = async () => {
    const content = editingDraft.trim();
    if (!content || !editingMessageId) {
      return;
    }

    setEditedBodies((current) => ({
      ...current,
      [editingMessageId]: content,
    }));

    if (!isBackendApiConfigured && editingMessageId.startsWith("local-")) {
      updateStoredMessage(editingMessageId, (message) => ({
        ...message,
        body: content,
      }));
    }

    if (!editingMessageId.startsWith("local-")) {
      try {
        await api.put(`/comment/${editingMessageId}`, { message: content });
      } catch {
        // Keep optimistic UI even when the demo API does not persist changes.
      }
    }

    cancelEditingMessage();
  };

  const handleDeleteMessage = async (messageId) => {
    const normalizedId = String(messageId);

    const shouldDelete = window.confirm(
      "Delete this message? This action cannot be undone.",
    );

    if (!shouldDelete) {
      setActionMenuId(null);
      return;
    }

    if (editingMessageId === normalizedId) {
      cancelEditingMessage();
    }

    if (!isBackendApiConfigured && normalizedId.startsWith("local-")) {
      removeStoredMessage(normalizedId);
    }

    setDeletedMessageIds((current) =>
      current.includes(normalizedId) ? current : [...current, normalizedId],
    );
    setActionMenuId(null);

    if (!normalizedId.startsWith("local-")) {
      try {
        await api.delete(`/comment/${normalizedId}`);
      } catch {
        // Keep optimistic UI even when the demo API does not persist deletion.
      }
    }

    setMessageStatusesById((current) => {
      const next = { ...current };
      delete next[normalizedId];
      return next;
    });
  };

  const handleRetryMessage = async (message) => {
    const messageId = String(message.id);
    const content = String(
      editedBodies[messageId] ?? message.body ?? "",
    ).trim();
    const threadId = String(message.postId || selectedThread?.id || "general");

    if (!content) {
      return;
    }

    await sendMessageToApi({
      messageId,
      content,
      threadId,
      clientMessageId: message.clientMessageId,
      replyTo: message.replyTo || null,
    });
  };

  const retryFailedStoredMessages = useCallback(async () => {
    if (isBackendApiConfigured) {
      return;
    }

    const failedStoredMessages = readStoredMessages().filter(
      (message) =>
        message.status === "failed" &&
        String(message.senderClientId || "") === String(currentClientId),
    );

    for (const message of failedStoredMessages) {
      await sendMessageToApi({
        messageId: String(message.id),
        content: String(message.body || "").trim(),
        threadId: String(message.postId || "general"),
        clientMessageId: message.clientMessageId,
        replyTo: message.replyTo || null,
      });
    }
  }, [currentClientId, isBackendApiConfigured, sendMessageToApi]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void retryFailedStoredMessages();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [retryFailedStoredMessages]);

  const showApiWarning = !isDummyApiConfigured || isUsingFallback;
  const apiWarningMessage = !isDummyApiConfigured
    ? "DummyAPI app-id belum di-set. Inbox sementara memakai fallback JSONPlaceholder."
    : "DummyAPI sedang tidak tersedia. Inbox sementara memakai fallback JSONPlaceholder.";

  if (messagingView === "list") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#f4f4f4]">
        {showApiWarning ? (
          <div className="shrink-0 border-b border-[#f5d68f] bg-[#fff7e6] px-6 py-1.5 text-[10px] leading-4 text-[#8a5a00]">
            <div className="flex items-center justify-between gap-3">
              <span>{apiWarningMessage}</span>
              <button
                type="button"
                onClick={refetchMessages}
                disabled={isLoading}
                className="shrink-0 rounded-[3px] border border-[#d9b867] bg-[#fff3cd] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#7a5100] transition-colors hover:bg-[#ffe7ad] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Retrying..." : "Retry DummyAPI"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <MessageList
            activeThreadId={selectedThreadId ? String(selectedThreadId) : null}
            isLoading={isLoading}
            isError={isError}
            onSearch={setSearch}
            onSelectThread={openThreadDetail}
            search={search}
            threads={filteredThreads}
          />
        </div>
      </div>
    );
  }

  return (
    <section className="font-lato flex h-full min-h-0 flex-col bg-[#f4f4f4]">
      <header className="shrink-0 border-b border-[#d0d7de] bg-white px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Back to panel list"
            onClick={handleBackToList}
            className="grid h-7 w-7 place-items-center rounded-full text-[#222] transition-all duration-300 ease-in-out hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="lato-16-bold truncate text-[#2563eb]">
              {selectedConversation?.title ||
                selectedThread?.title ||
                "Conversation"}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <p className="lato-12-regular text-[#222]">
                {selectedConversation?.participantCount ||
                  selectedThread?.participantCount ||
                  2}{" "}
                Participants
              </p>
              <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1d4ed8]">
                {testerLabel}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isOnline
                    ? "border border-[#86efac] bg-[#f0fdf4] text-[#166534]"
                    : "border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close message thread"
            onClick={closeWidget}
            className="grid h-7 w-7 place-items-center rounded-full text-[#222] transition-all duration-300 ease-in-out hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {showApiWarning ? (
        <div className="shrink-0 border-b border-[#f5d68f] bg-[#fff7e6] px-4 py-2 text-[11px] text-[#8a5a00] sm:px-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <span>{apiWarningMessage}</span>
            <button
              type="button"
              onClick={refetchMessages}
              disabled={isLoading}
              className="shrink-0 rounded-[3px] border border-[#d9b867] bg-[#fff3cd] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#7a5100] transition-colors hover:bg-[#ffe7ad] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Retrying..." : "Retry DummyAPI"}
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={messagesViewportRef}
        onScroll={handleMessageScroll}
        className="min-h-0 flex-1 overflow-y-auto quicks-scrollbar bg-white px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 md:px-5 md:pb-6"
      >
        {isLoading ? <MessageSkeleton /> : null}

        {!isLoading && isError ? (
          <div className="p-4 text-sm text-red-600">
            Failed to load messages. Please try again.
          </div>
        ) : null}

        {!isLoading && !isError && !selectedThread ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-slate-700">Conversation not found.</p>
            <button
              type="button"
              onClick={handleBackToList}
              className="rounded-[3px] bg-[#2f74f4] px-3 py-1.5 text-xs font-medium text-white"
            >
              Back to inbox
            </button>
          </div>
        ) : null}

        {!isLoading &&
        !isError &&
        selectedThread &&
        visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-quicks-muted">
            No messages yet. Start a conversation!
          </div>
        ) : null}

        {!isLoading &&
        !isError &&
        selectedThread &&
        visibleMessages.length > 0 ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-[18px]">
            <ul className="space-y-3 sm:space-y-4 md:space-y-[18px]">
              {visibleMessages.map((message, index) => {
                const isOwn = message.isOwn;
                const messageId = String(message.id);
                const previousMessage = visibleMessages[index - 1];
                const showDateDivider =
                  !previousMessage ||
                  dateGroupLabel(previousMessage.createdAt) !==
                    dateGroupLabel(message.createdAt);
                const isEditing = editingMessageId === messageId;
                const isMenuOpen = actionMenuId === messageId;

                return (
                  <li key={message.id}>
                    {showDateDivider ? (
                      <div className="mb-1.5 flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-[#f08c8c]" />
                        <p className="lato-12-regular whitespace-nowrap text-[#444]">
                          {dateGroupLabel(message.createdAt)}
                        </p>
                        <div className="h-px flex-1 bg-[#f08c8c]" />
                      </div>
                    ) : null}

                    {index === firstOwnMessageIndex &&
                    firstOwnMessageIndex > 0 ? (
                      <div className="mb-2 mt-1 flex items-center justify-center">
                        <span className="lato-12-regular rounded-[2px] border border-[#f08c8c] bg-white px-3 py-1 text-[#ef4444]">
                          New Message
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative flex max-w-[92%] flex-col gap-1 sm:max-w-[88%] md:max-w-[82%] ${isOwn ? "items-end" : "items-start"}`}
                      >
                        {!isOwn ? (
                          <div className="lato-14-bold flex items-center gap-2 text-[#f59e0b]">
                            <span className="truncate">{message.name}</span>
                            <button
                              type="button"
                              aria-label="Message actions"
                              data-message-actions="true"
                              onClick={() =>
                                setActionMenuId((current) =>
                                  current === messageId ? null : messageId,
                                )
                              }
                              className="grid h-4 w-4 place-items-center rounded text-[#8a8a8a] opacity-70 transition-all duration-300 ease-in-out hover:bg-black/5 hover:opacity-100"
                            >
                              <EllipsisVertical size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="lato-14-bold text-[#7c5cff]">
                              You
                            </span>
                            <button
                              type="button"
                              aria-label="Message actions"
                              onClick={() =>
                                setActionMenuId((current) =>
                                  current === messageId ? null : messageId,
                                )
                              }
                              className="grid h-4 w-4 place-items-center rounded text-[#8a8a8a] opacity-70 transition-all duration-300 ease-in-out hover:bg-black/5 hover:opacity-100"
                            >
                              <EllipsisVertical size={12} />
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="w-full rounded-[2px] border border-[#c5d4ff] bg-white p-2 shadow-sm">
                            <textarea
                              ref={editingTextareaRef}
                              rows="3"
                              value={editingDraft}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelEditingMessage();
                                }
                              }}
                              onChange={(event) =>
                                setEditingDraft(event.target.value)
                              }
                              className="lato-12-regular w-full resize-none border border-[#d0d7de] px-2 py-1.5 text-[#1f2937] outline-none focus:border-[#7aa2f8]"
                            />
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditingMessage}
                                className="rounded-[3px] border border-[#d1d5db] px-2.5 py-1 text-[11px] text-[#4b5563]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="rounded-[3px] bg-[#2f74f4] px-2.5 py-1 text-[11px] text-white"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`relative rounded-[2px] px-3 py-2 text-[12px] leading-5 shadow-sm ${
                              isOwn
                                ? "bg-[#eadcff] text-[#51457c]"
                                : "bg-[#f5e3b6] text-[#4d4031]"
                            }`}
                          >
                            {message.replyTo ? (
                              <div className="mb-1.5 rounded-[2px] border-l-2 border-[#4f46e5] border-black/10 bg-white/65 px-2 py-1">
                                <p className="text-[10px] font-semibold text-[#334155]">
                                  Replying to{" "}
                                  {message.replyTo.name || "Unknown User"}
                                </p>
                                <p className="line-clamp-2 text-[10px] text-[#475569]">
                                  {message.replyTo.body || "-"}
                                </p>
                              </div>
                            ) : null}
                            <p className="lato-12-regular break-words">
                              {message.body}
                            </p>

                            {isMenuOpen ? (
                              <div className="absolute right-[-2px] top-7 z-10 w-28 overflow-hidden rounded-[2px] border border-[#d6d6d6] bg-white text-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.15)]">
                                {isOwn ? (
                                  <>
                                    <button
                                      type="button"
                                      data-message-actions="true"
                                      onClick={() =>
                                        startEditingMessage(message)
                                      }
                                      className="block w-full px-3 py-2 text-left text-[#2f6edb] hover:bg-[#eef4ff]"
                                    >
                                      Edit
                                    </button>
                                    <div className="h-px bg-[#ececec]" />
                                    <button
                                      type="button"
                                      data-message-actions="true"
                                      onClick={() =>
                                        handleDeleteMessage(messageId)
                                      }
                                      className="block w-full px-3 py-2 text-left text-[#dc2626] hover:bg-[#fff1f2]"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      data-message-actions="true"
                                      onClick={() =>
                                        void handleShareMessage(message)
                                      }
                                      className="block w-full px-3 py-2 text-left text-[#2f6edb] hover:bg-[#eef4ff]"
                                    >
                                      Share
                                    </button>
                                    <div className="h-px bg-[#ececec]" />
                                    <button
                                      type="button"
                                      data-message-actions="true"
                                      onClick={() =>
                                        handleReplyMessage(message)
                                      }
                                      className="block w-full px-3 py-2 text-left text-[#64748b] hover:bg-[#f8fafc]"
                                    >
                                      Reply
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div
                          className={`lato-12-regular text-[#777] ${isOwn ? "text-right" : "text-left"}`}
                        >
                          <div
                            className={`flex items-center gap-1 ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {isOwn ? (
                              <span
                                className={`inline-flex items-center gap-0.5 ${
                                  getStatusMeta(message.status).className
                                }`}
                              >
                                {getStatusMeta(message.status).icon}
                                <span className="sr-only">
                                  {getStatusMeta(message.status).label}
                                </span>
                              </span>
                            ) : null}
                            {isOwn && message.status === "failed" ? (
                              <button
                                type="button"
                                onClick={() => void handleRetryMessage(message)}
                                className="ml-1 rounded-[3px] border border-[#fecaca] bg-[#fff1f2] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#dc2626] transition-colors hover:bg-[#ffe4e6]"
                              >
                                Retry
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div ref={bottomAnchorRef} />
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-20 shrink-0 border-t border-[#d0d7de] bg-[#f4f4f4] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5"
      >
        {shareNotice ? (
          <p className="mb-2 text-right text-[11px] font-semibold text-[#2563eb]">
            {shareNotice}
          </p>
        ) : null}
        {failedOwnMessagesInThread.length > 0 ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => void retryFailedStoredMessages()}
              className="rounded-[3px] border border-[#fecaca] bg-[#fff1f2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#b91c1c] transition-colors hover:bg-[#ffe4e6]"
            >
              Retry all failed
            </button>
          </div>
        ) : null}
        {replyTarget ? (
          <div className="mb-2 rounded-[2px] border border-[#d1d5db] border-l-2 border-l-[#4f46e5] bg-[#f8fafc] px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-[#334155]">
                Replying to {replyTarget.name}
              </p>
              <button
                type="button"
                aria-label="Cancel reply"
                onClick={() => setReplyTarget(null)}
                className="grid h-4 w-4 place-items-center rounded text-[#64748b] hover:bg-black/5"
              >
                <X size={11} />
              </button>
            </div>
            <p className="line-clamp-2 text-[11px] text-[#475569]">
              {replyTarget.body}
            </p>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={composerTextareaRef}
            rows="1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Type a new message"
            aria-label="Message input"
            className="lato-14-regular min-h-[40px] flex-1 resize-none rounded-[2px] border border-[#aab0b6] bg-white px-3 py-2 text-quicks-ink outline-none placeholder:text-[#8d8d8d]"
          />

          <button
            type="submit"
            aria-label="Send message"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[3px] bg-[#2f74f4] px-4 text-[13px] font-medium text-white transition-all duration-300 ease-in-out hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Send
          </button>
        </div>
      </form>

      {shareTargetMessage ? (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30 p-3 sm:p-4">
          <div className="w-full rounded-[4px] border border-[#d1d5db] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-[#1f2937]">
                Share Message
              </p>
              <button
                type="button"
                aria-label="Close share panel"
                onClick={() => {
                  setShareTargetMessage(null);
                  setShareThreadId("");
                  setShareError("");
                }}
                className="grid h-5 w-5 place-items-center rounded text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X size={12} />
              </button>
            </div>

            <div className="mb-2 rounded-[3px] border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-2">
              <p className="text-[11px] font-semibold text-[#334155]">
                {shareTargetMessage.name}
              </p>
              <p className="line-clamp-2 text-[11px] text-[#475569]">
                {shareTargetMessage.body}
              </p>
            </div>

            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
              Forward to conversation
            </label>
            <select
              value={shareThreadId}
              onChange={(event) => setShareThreadId(event.target.value)}
              className="mb-2 h-9 w-full rounded-[3px] border border-[#cbd5e1] bg-white px-2 text-[12px] text-[#1f2937] outline-none focus:border-[#7aa2f8]"
            >
              <option value="">Select conversation...</option>
              {shareThreadOptions.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title}
                </option>
              ))}
            </select>

            {shareError ? (
              <p className="mb-2 text-[11px] font-semibold text-[#dc2626]">
                {shareError}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShareTargetMessage(null);
                  setShareThreadId("");
                  setShareError("");
                }}
                className="rounded-[3px] border border-[#d1d5db] px-3 py-1.5 text-[11px] font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleForwardSharedMessage()}
                className="rounded-[3px] bg-[#2f74f4] px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
