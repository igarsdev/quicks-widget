export const MESSAGE_STORAGE_KEY = "quicks.widget.messages.v1";
const CLIENT_ID_KEY = "quicks.widget.client-id.v1";
const MESSAGE_UPDATE_EVENT = "quicks:messages-updated";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function safeParse(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeDateString(value) {
  const date = value ? new Date(value) : new Date();

  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

export function readStoredMessages() {
  if (!canUseStorage()) {
    return [];
  }

  return safeParse(window.localStorage.getItem(MESSAGE_STORAGE_KEY));
}

export function writeStoredMessages(messages) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(MESSAGE_UPDATE_EVENT));
}

function safeRandomId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function getOrCreateClientId() {
  if (!canUseStorage()) {
    return "client-unknown";
  }

  const existingId = window.sessionStorage.getItem(CLIENT_ID_KEY);
  if (existingId) {
    return existingId;
  }

  const nextId = safeRandomId();
  window.sessionStorage.setItem(CLIENT_ID_KEY, nextId);
  return nextId;
}

export function subscribeStoredMessageChanges(onChange) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== MESSAGE_STORAGE_KEY) {
      return;
    }

    onChange();
  };

  const handleLocalUpdate = () => {
    onChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MESSAGE_UPDATE_EVENT, handleLocalUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MESSAGE_UPDATE_EVENT, handleLocalUpdate);
  };
}

export function normalizeStoredMessage(message) {
  return {
    ...message,
    id: String(message.id),
    postId: String(message.postId || "general"),
    userId: message.userId || null,
    name: message.name || "You",
    email: message.email || "you@quicks.dev",
    body: message.body || "",
    createdAt: safeDateString(message.createdAt),
    isOwn: message.isOwn !== false,
    senderClientId: message.senderClientId || null,
    status: message.status || "sent",
    isLocal: true,
  };
}

export function addStoredMessage(message) {
  const nextMessages = [
    ...readStoredMessages(),
    normalizeStoredMessage(message),
  ];
  writeStoredMessages(nextMessages);
  return nextMessages;
}

export function mergeStoredMessages(messages) {
  const storedMessages = readStoredMessages();
  const merged = [...messages];
  const existingIds = new Set(merged.map((message) => String(message.id)));

  storedMessages.forEach((message) => {
    const normalized = normalizeStoredMessage(message);

    if (existingIds.has(normalized.id)) {
      return;
    }

    merged.push(normalized);
  });

  return merged.sort(
    (first, second) =>
      new Date(first.createdAt || 0).getTime() -
      new Date(second.createdAt || 0).getTime(),
  );
}

export function updateStoredMessage(messageId, updater) {
  const normalizedId = String(messageId);
  const nextMessages = readStoredMessages().map((message) => {
    if (String(message.id) !== normalizedId) {
      return message;
    }

    return normalizeStoredMessage(updater(normalizeStoredMessage(message)));
  });

  writeStoredMessages(nextMessages);
  return nextMessages;
}

export function removeStoredMessage(messageId) {
  const normalizedId = String(messageId);
  const nextMessages = readStoredMessages().filter(
    (message) => String(message.id) !== normalizedId,
  );

  writeStoredMessages(nextMessages);
  return nextMessages;
}
