import { io } from "socket.io-client";

const configuredSocketUrl =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "";

let socketInstance = null;

function canUseSocket() {
  return Boolean(configuredSocketUrl) && typeof window !== "undefined";
}

function getSocket() {
  if (!canUseSocket()) {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(configuredSocketUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  return socketInstance;
}

export function isRealtimeEnabled() {
  return canUseSocket();
}

export function subscribeRealtimeSync(onSync) {
  const socket = getSocket();

  if (!socket) {
    return () => {};
  }

  const handleMessagesChanged = (payload) =>
    onSync({ type: "messages", payload });
  const handleConversationsChanged = (payload) =>
    onSync({ type: "conversations", payload });
  const handleTodosChanged = (payload) => onSync({ type: "todos", payload });

  socket.on("messages:changed", handleMessagesChanged);
  socket.on("conversations:changed", handleConversationsChanged);
  socket.on("todos:changed", handleTodosChanged);

  return () => {
    socket.off("messages:changed", handleMessagesChanged);
    socket.off("conversations:changed", handleConversationsChanged);
    socket.off("todos:changed", handleTodosChanged);
  };
}

export function getRealtimeSocket() {
  return getSocket();
}
