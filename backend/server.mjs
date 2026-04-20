import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data", "comments.json");
const CONVERSATION_FILE = path.join(__dirname, "data", "conversations.json");
const TODO_FILE = path.join(__dirname, "data", "todos.json");
const TAG_FILE = path.join(__dirname, "data", "tags.json");
const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

let writeQueue = Promise.resolve();

function broadcastSync(payload) {
  io.emit("messages:changed", payload);
  io.emit("conversations:changed", payload);
}

function broadcastTodoSync(payload) {
  io.emit("todos:changed", payload);
}

function createFallbackOwner(ownerId = "user-local") {
  return {
    id: String(ownerId),
    firstName: "Local",
    lastName: "Tester",
    email: "local.tester@example.test",
  };
}

function normalizeOwnerPayload(ownerPayload, fallbackOwnerId = "user-local") {
  if (!ownerPayload) {
    return createFallbackOwner(fallbackOwnerId);
  }

  if (typeof ownerPayload === "string") {
    return createFallbackOwner(ownerPayload);
  }

  if (typeof ownerPayload === "object") {
    return {
      id: String(ownerPayload.id || fallbackOwnerId),
      firstName: ownerPayload.firstName || "Local",
      lastName: ownerPayload.lastName || "Tester",
      email:
        ownerPayload.email ||
        `${String(ownerPayload.firstName || "local").toLowerCase()}.${String(ownerPayload.lastName || "tester").toLowerCase()}@example.test`,
    };
  }

  return createFallbackOwner(fallbackOwnerId);
}

async function ensureArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "[]", "utf-8");
  }
}

async function readArrayFile(filePath) {
  await ensureArrayFile(filePath);
  const raw = await fs.readFile(filePath, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readComments() {
  return readArrayFile(DATA_FILE);
}

async function readConversations() {
  return readArrayFile(CONVERSATION_FILE);
}

async function readTodos() {
  return readArrayFile(TODO_FILE);
}

async function readTags() {
  return readArrayFile(TAG_FILE);
}

async function writeComments(nextComments) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(nextComments, null, 2), "utf-8"),
  );

  await writeQueue;
}

async function writeTodos(nextTodos) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(TODO_FILE, JSON.stringify(nextTodos, null, 2), "utf-8"),
  );

  await writeQueue;
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const next = String(value || "").trim();
    if (!next || seen.has(next.toLowerCase())) {
      return;
    }

    seen.add(next.toLowerCase());
    result.push(next);
  });

  return result;
}

function normalizeTodoPayload(input, currentTodo = null) {
  const title = String(input?.title || currentTodo?.title || "").trim();
  const description = String(
    input?.description ?? currentTodo?.description ?? "",
  ).trim();
  const dueDate = String(input?.dueDate || currentTodo?.dueDate || "").trim();
  const completed =
    typeof input?.completed === "boolean"
      ? input.completed
      : Boolean(currentTodo?.completed);
  const owner = String(input?.owner || currentTodo?.owner || "user-local");
  const tags = uniqueStrings(input?.tags ?? currentTodo?.tags ?? []);

  return {
    title,
    description,
    dueDate,
    completed,
    owner,
    tags,
  };
}

function applyTodoFilter(todos, filter, ownerId) {
  if (filter === "all") {
    return todos;
  }

  if (filter === "team") {
    return todos.filter((todo) => String(todo.owner) !== String(ownerId));
  }

  return todos.filter((todo) => String(todo.owner) === String(ownerId));
}

function sortTodosByCreatedAt(todos) {
  return [...todos].sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime(),
  );
}

function paginate(items, page = 0, limit = 50) {
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;
  const start = safePage * safeLimit;
  const end = start + safeLimit;
  return items.slice(start, end);
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "quicks-backend",
    time: new Date().toISOString(),
  });
});

app.get("/conversations", async (_req, res) => {
  const conversations = await readConversations();
  const comments = await readComments();

  const enriched = conversations.map((conversation) => {
    const conversationMessages = comments
      .filter((comment) => String(comment.post) === String(conversation.id))
      .sort(
        (a, b) =>
          new Date(b.publishDate || 0).getTime() -
          new Date(a.publishDate || 0).getTime(),
      );

    const latestMessage = conversationMessages[0] || null;

    return {
      ...conversation,
      latestMessage,
      lastUpdatedAt: latestMessage?.publishDate || null,
      messageCount: conversationMessages.length,
    };
  });

  res.json({ data: enriched });
});

app.get("/conversations/:id/messages", async (req, res) => {
  const conversationId = String(req.params.id || "");
  const page = Number.parseInt(String(req.query.page || "0"), 10);
  const limit = Number.parseInt(String(req.query.limit || "50"), 10);

  const comments = await readComments();
  const filtered = comments.filter(
    (comment) => String(comment.post) === conversationId,
  );

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.publishDate || 0).getTime() -
      new Date(a.publishDate || 0).getTime(),
  );

  res.json({
    data: paginate(sorted, page, limit),
    total: filtered.length,
    page: Number.isNaN(page) ? 0 : page,
    limit: Number.isNaN(limit) ? 50 : limit,
  });
});

app.get("/tags", async (_req, res) => {
  const tags = await readTags();
  res.json({ data: tags });
});

app.get("/todos", async (req, res) => {
  const filter = String(req.query.filter || "my").toLowerCase();
  const ownerId = String(req.query.owner || "user-local");
  const todos = await readTodos();
  const filtered = applyTodoFilter(
    sortTodosByCreatedAt(todos),
    filter,
    ownerId,
  );

  res.json({ data: filtered });
});

app.post("/todos", async (req, res) => {
  const todos = await readTodos();
  const normalized = normalizeTodoPayload(req.body);

  if (!normalized.title) {
    return res.status(400).json({ error: "title is required" });
  }

  const created = {
    id: `todo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...normalized,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  todos.push(created);
  await writeTodos(todos);
  broadcastTodoSync({ action: "create", todo: created });

  return res.status(201).json(created);
});

app.put("/todos/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  const todos = await readTodos();
  const index = todos.findIndex((todo) => String(todo.id) === id);

  if (index < 0) {
    return res.status(404).json({ error: "todo not found" });
  }

  const normalized = normalizeTodoPayload(req.body, todos[index]);

  if (!normalized.title) {
    return res.status(400).json({ error: "title is required" });
  }

  const updated = {
    ...todos[index],
    ...normalized,
    updatedAt: new Date().toISOString(),
  };

  todos[index] = updated;
  await writeTodos(todos);
  broadcastTodoSync({ action: "update", todo: updated });

  return res.json(updated);
});

app.delete("/todos/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const todos = await readTodos();
  const index = todos.findIndex((todo) => String(todo.id) === id);

  if (index < 0) {
    return res.status(404).json({ error: "todo not found" });
  }

  const [deleted] = todos.splice(index, 1);
  await writeTodos(todos);
  broadcastTodoSync({ action: "delete", todo: deleted });

  return res.json({ deleted: deleted.id });
});

app.get("/comment", async (req, res) => {
  const page = Number.parseInt(String(req.query.page || "0"), 10);
  const limit = Number.parseInt(String(req.query.limit || "50"), 10);
  const post = req.query.post ? String(req.query.post) : null;

  const comments = await readComments();
  const filtered = post
    ? comments.filter((comment) => String(comment.post) === post)
    : comments;

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.publishDate || 0).getTime() -
      new Date(a.publishDate || 0).getTime(),
  );

  const data = paginate(sorted, page, limit);

  res.json({
    data,
    total: filtered.length,
    page: Number.isNaN(page) ? 0 : page,
    limit: Number.isNaN(limit) ? 50 : limit,
  });
});

app.post("/comment/create", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const post = String(req.body?.post || "general");
  const replyTo = req.body?.replyTo || null;
  const senderClientId = req.body?.senderClientId
    ? String(req.body.senderClientId)
    : null;
  const clientMessageId = req.body?.clientMessageId
    ? String(req.body.clientMessageId)
    : null;
  const owner = normalizeOwnerPayload(
    req.body?.owner,
    senderClientId || "user-local",
  );
  const ownerId = String(owner.id || senderClientId || "user-local");

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const comments = await readComments();
  const knownOwner = comments.find(
    (comment) => String(comment.owner?.id) === ownerId,
  )?.owner;

  const created = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    message,
    publishDate: new Date().toISOString(),
    owner: knownOwner || createFallbackOwner(ownerId),
    post,
    replyTo,
    senderClientId: senderClientId || ownerId,
    clientMessageId,
  };

  comments.push(created);
  await writeComments(comments);
  broadcastSync({ action: "create", conversationId: post, message: created });

  return res.status(201).json(created);
});

app.put("/comment/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const message = String(req.body?.message || "").trim();

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const comments = await readComments();
  const index = comments.findIndex((comment) => String(comment.id) === id);

  if (index < 0) {
    return res.status(404).json({ error: "comment not found" });
  }

  const updated = {
    ...comments[index],
    message,
  };

  comments[index] = updated;
  await writeComments(comments);
  broadcastSync({
    action: "update",
    conversationId: updated.post,
    message: updated,
  });

  return res.json(updated);
});

app.delete("/comment/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const comments = await readComments();
  const index = comments.findIndex((comment) => String(comment.id) === id);

  if (index < 0) {
    return res.status(404).json({ error: "comment not found" });
  }

  const [deleted] = comments.splice(index, 1);
  await writeComments(comments);
  broadcastSync({
    action: "delete",
    conversationId: deleted.post,
    message: deleted,
  });

  return res.json({ deleted: deleted.id });
});

io.on("connection", (socket) => {
  socket.emit("realtime:ready", { connected: true });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Quicks backend listening on http://localhost:${PORT}`);
});
