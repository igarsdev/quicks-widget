import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  CircleEllipsis,
  SquareCheckBig,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import useFetchTags from "../../hooks/useFetchTags";
import useFetchTodos from "../../hooks/useFetchTodos";
import TagSelector from "./TagSelector";
import TaskFormModal from "./TaskFormModal";
import TodoSkeleton from "./TodoSkeleton";

const FILTER_OPTIONS = [
  { label: "My Tasks", value: "my" },
  { label: "Team Tasks", value: "team" },
  { label: "All Tasks", value: "all" },
];

const DEFAULT_TAGS = [
  {
    id: "tag-important-asap",
    label: "Important ASAP",
    bg: "#dbeafe",
    text: "#1d4ed8",
  },
  {
    id: "tag-offline-meeting",
    label: "Offline Meeting",
    bg: "#fde7c7",
    text: "#b45309",
  },
  {
    id: "tag-virtual-meeting",
    label: "Virtual Meeting",
    bg: "#d9f0cf",
    text: "#3f7a2d",
  },
  { id: "tag-asap", label: "ASAP", bg: "#ccefe2", text: "#0f766e" },
  {
    id: "tag-client-related",
    label: "Client Related",
    bg: "#cfeec8",
    text: "#166534",
  },
  { id: "tag-self-task", label: "Self Task", bg: "#e6dbfb", text: "#6d28d9" },
  {
    id: "tag-appointments",
    label: "Appointments",
    bg: "#ead9f8",
    text: "#7e22ce",
  },
  {
    id: "tag-court-related",
    label: "Court Related",
    bg: "#cfeaf8",
    text: "#0369a1",
  },
];

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function getDaysLeftLabel(dateString) {
  if (!dateString) {
    return "";
  }

  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) {
    return "";
  }

  const now = new Date();
  const midnightToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const midnightDue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const diff = Math.ceil(
    (midnightDue.getTime() - midnightToday.getTime()) / 86400000,
  );

  if (diff <= 0) {
    return "";
  }

  return `${diff} Days Left`;
}

function getDaysLeftFromReference(dateString, referenceDateString) {
  if (!dateString || !referenceDateString) {
    return "";
  }

  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) {
    return "";
  }

  const referenceDate = new Date(referenceDateString);
  if (Number.isNaN(referenceDate.getTime())) {
    return getDaysLeftLabel(dateString);
  }

  const midnightToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const midnightDue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const diff = Math.ceil(
    (midnightDue.getTime() - midnightToday.getTime()) / 86400000,
  );

  if (diff <= 0) {
    return "";
  }

  return `${diff} Days Left`;
}

export default function Todo() {
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeInlineTagId, setActiveInlineTagId] = useState(null);
  const [formState, setFormState] = useState({
    isOpen: false,
    mode: "create",
    todo: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [pendingById, setPendingById] = useState({});
  const { todos, setTodos, isLoading, isError } = useFetchTodos(
    selectedFilter.value,
  );
  const { tags: availableTags } = useFetchTags();
  const resolvedTags = availableTags.length > 0 ? availableTags : DEFAULT_TAGS;

  const tagMap = useMemo(() => {
    return resolvedTags.reduce((accumulator, tag) => {
      accumulator[tag.label] = tag;
      return accumulator;
    }, {});
  }, [resolvedTags]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuId(null);
      setActiveInlineTagId(null);
      setIsFilterOpen(false);
    };

    window.addEventListener("click", handleGlobalClick);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  const showNotice = (message, tone = "success") => {
    setNotice({ message, tone });
  };

  const setPendingAction = (todoId, action) => {
    setPendingById((current) => {
      if (!action) {
        const { [todoId]: _, ...next } = current;
        return next;
      }

      return {
        ...current,
        [todoId]: action,
      };
    });
  };

  const openCreateForm = () => {
    setFormState({
      isOpen: true,
      mode: "create",
      todo: null,
    });
  };

  const openEditForm = (todo) => {
    setFormState({
      isOpen: true,
      mode: "edit",
      todo,
    });
    setActiveMenuId(null);
  };

  const closeForm = () => {
    setFormState({
      isOpen: false,
      mode: "create",
      todo: null,
    });
  };

  const upsertTodoLocally = (nextTodo) => {
    setTodos((current) => {
      const index = current.findIndex((todo) => todo.id === nextTodo.id);

      if (index < 0) {
        return [...current, nextTodo];
      }

      const next = [...current];
      next[index] = nextTodo;
      return next;
    });
  };

  const handleSubmitForm = async (payload) => {
    try {
      setIsSubmitting(true);

      if (formState.mode === "edit" && formState.todo) {
        const response = await api.put(`/todos/${formState.todo.id}`, payload);
        upsertTodoLocally(response.data);
        showNotice("Task updated", "success");
      } else {
        const response = await api.post("/todos", payload);
        upsertTodoLocally(response.data);
        showNotice("Task created", "success");
      }

      closeForm();
    } catch {
      if (formState.mode === "edit" && formState.todo) {
        upsertTodoLocally({
          ...formState.todo,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
        showNotice("Server unavailable: task updated locally", "warning");
      } else {
        upsertTodoLocally({
          id: `todo-local-${Date.now()}`,
          ...payload,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showNotice("Server unavailable: task saved locally", "warning");
      }

      closeForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (todo) => {
    if (pendingById[todo.id]) {
      return;
    }

    const nextValue = !todo.completed;
    setPendingAction(todo.id, "status");
    upsertTodoLocally({ ...todo, completed: nextValue });

    try {
      const response = await api.put(`/todos/${todo.id}`, {
        completed: nextValue,
      });
      upsertTodoLocally(response.data);
      showNotice(
        nextValue ? "Task marked complete" : "Task reopened",
        "success",
      );
    } catch {
      upsertTodoLocally(todo);
      showNotice("Failed to update task status", "error");
    } finally {
      setPendingAction(todo.id, null);
    }
  };

  const handleDeleteTodo = async (todo) => {
    if (pendingById[todo.id]) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this task? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    setActiveMenuId(null);
    setPendingAction(todo.id, "delete");
    const previousTodos = todos;
    setTodos((current) => current.filter((item) => item.id !== todo.id));

    try {
      await api.delete(`/todos/${todo.id}`);
      showNotice("Task deleted", "success");
    } catch {
      setTodos(previousTodos);
      showNotice("Failed to delete task", "error");
    } finally {
      setPendingAction(todo.id, null);
    }
  };

  const handleToggleInlineTag = async (todo, tagLabel) => {
    if (pendingById[todo.id]) {
      return;
    }

    const hasTag = todo.tags.includes(tagLabel);
    const nextTags = hasTag
      ? todo.tags.filter((tag) => tag !== tagLabel)
      : [...todo.tags, tagLabel];
    const optimisticTodo = { ...todo, tags: nextTags };

    setPendingAction(todo.id, "tags");
    upsertTodoLocally(optimisticTodo);

    try {
      const response = await api.put(`/todos/${todo.id}`, { tags: nextTags });
      upsertTodoLocally(response.data);
      showNotice("Task tags updated", "success");
    } catch {
      upsertTodoLocally(todo);
      showNotice("Failed to update tags", "error");
    } finally {
      setPendingAction(todo.id, null);
    }
  };

  const visibleTodos = todos.map((todo) => ({
    ...todo,
    displayDate: formatDisplayDate(todo.dueDate),
    dueText: todo.completed
      ? ""
      : getDaysLeftFromReference(todo.dueDate, todo.createdAt),
    description: todo.description || "No Description",
    tags: Array.isArray(todo.tags) ? todo.tags : [],
  }));

  const groupedTodoSections = useMemo(() => {
    const sorted = [...visibleTodos].sort(
      (first, second) =>
        new Date(second.createdAt || 0).getTime() -
        new Date(first.createdAt || 0).getTime(),
    );
    const incomplete = sorted.filter((todo) => !todo.completed);
    const completed = sorted.filter((todo) => todo.completed);

    return [
      {
        key: "new-task",
        title: "New Task",
        items: incomplete.slice(0, 1),
      },
      {
        key: "completed-task",
        title: "Completed Task",
        items: completed,
      },
      {
        key: "open-task",
        title: "Open Task",
        items: incomplete.slice(1),
      },
    ];
  }, [visibleTodos]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="shrink-0 bg-white px-6 pb-3 pt-6">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h2 className="text-[28px] font-bold leading-none text-[#1f2937]">
              Tasks
            </h2>
            <div
              className="relative mt-2 flex items-center justify-start"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-md border border-[#c8c8c8] bg-white px-3 py-1.5 text-[12px] text-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                aria-label="Choose task list"
              >
                <span>{selectedFilter.label}</span>
                <ChevronDown size={13} />
              </button>

              {isFilterOpen ? (
                <div className="absolute left-0 top-9 z-20 min-w-[120px] rounded border border-[#c8c8c8] bg-white p-1 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedFilter(option);
                        setIsFilterOpen(false);
                      }}
                      className={`block w-full rounded px-2 py-1 text-left text-[11px] ${selectedFilter.value === option.value ? "bg-[#eef5ff] text-[#2f74f4]" : "text-[#444] hover:bg-[#f5f5f5]"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            aria-label="Create new task"
            className="mt-1 rounded-[3px] bg-[#2f74f4] px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-300 ease-in-out hover:bg-blue-700"
          >
            New Task
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto quicks-scrollbar px-6 pb-6 pt-[22px]">
        {isLoading ? <TodoSkeleton /> : null}

        {!isLoading && isError ? (
          <div className="p-4 text-sm text-red-600">
            Failed to load todos. Please try again.
          </div>
        ) : null}

        {!isLoading && !isError && visibleTodos.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-quicks-muted">
            No tasks yet. Add your first to-do!
          </div>
        ) : null}

        {!isLoading && !isError && visibleTodos.length > 0 ? (
          <div className="space-y-[22px]">
            {groupedTodoSections.map((section) => (
              <section key={section.key}>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#4b5563]">
                  {section.title}
                </h3>

                {section.items.length === 0 ? (
                  <div className="rounded border border-dashed border-[#d8d8d8] bg-[#fafafa] px-3 py-2.5 text-[10px] text-[#8a8a8a]">
                    No task in this section
                  </div>
                ) : (
                  <ul className="space-y-[22px]">
                    {section.items.map((todo, index) => (
                      <li
                        key={todo.id}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-[3px] border border-[#d9d9d9] bg-[#fbfbfb] px-3 py-2.5"
                      >
                        {pendingById[todo.id] ? (
                          <div className="mb-1 text-[10px] text-[#6b7280]">
                            Saving...
                          </div>
                        ) : null}

                        <div className="relative grid grid-cols-[18px,1fr,92px,18px] items-start gap-2.5 sm:grid-cols-[22px,1fr,100px,22px] sm:gap-3 md:grid-cols-[22px,1fr,110px,22px]">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(todo)}
                            disabled={Boolean(pendingById[todo.id])}
                            className="pt-1 text-left text-[#8f8f8f] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={
                              todo.completed
                                ? "Mark as pending"
                                : "Mark as complete"
                            }
                          >
                            {todo.completed ? (
                              <SquareCheckBig
                                size={16}
                                className="text-[#7d7d7d]"
                              />
                            ) : (
                              <div className="h-[13px] w-[13px] rounded-sm border border-[#808080] bg-white" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`text-[12px] leading-5 sm:text-[13px] ${todo.completed ? "line-through text-[#7a7a7a]" : "text-[#333]"}`}
                            >
                              {todo.title}
                            </p>

                            <div className="mt-4 flex items-center gap-2 text-[#2f86f6]">
                              <CalendarDays size={13} />
                              <input
                                readOnly
                                value={todo.displayDate}
                                aria-label="Task date"
                                className="h-8 w-[128px] rounded-[3px] border border-[#bcbcbc] bg-white px-3 text-[12px] text-[#444] outline-none sm:w-[140px]"
                              />
                            </div>

                            <div className="mt-4 pl-[18px] text-[12px] text-[#8a8a8a]">
                              {todo.description || "No Description"}
                            </div>

                            <div className="relative mt-4 pl-[18px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveInlineTagId((current) =>
                                      current === todo.id ? null : todo.id,
                                    )
                                  }
                                  disabled={Boolean(pendingById[todo.id])}
                                  className="grid h-5 w-5 place-items-center rounded text-[#6b7280] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label="Manage task tags"
                                >
                                  <Bookmark size={12} />
                                </button>

                                {todo.tags.map((tagLabel) => {
                                  const tagMeta = tagMap[tagLabel];

                                  return (
                                    <span
                                      key={`${todo.id}-${tagLabel}`}
                                      className="rounded px-2 py-1 text-[10px] font-medium"
                                      style={{
                                        backgroundColor:
                                          tagMeta?.bg || "#e5e7eb",
                                        color: tagMeta?.text || "#374151",
                                      }}
                                    >
                                      {tagLabel}
                                    </span>
                                  );
                                })}
                              </div>

                              {activeInlineTagId === todo.id ? (
                                <div className="absolute left-[18px] top-7 z-20 w-[160px]">
                                  <TagSelector
                                    availableTags={resolvedTags}
                                    selectedTags={todo.tags}
                                    onToggle={(tagLabel) =>
                                      handleToggleInlineTag(todo, tagLabel)
                                    }
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="pt-1 text-right text-[10px] text-[#555] sm:text-[11px]">
                            {todo.dueText ? (
                              <span className="block text-[#ff6a4b]">
                                {todo.dueText}
                              </span>
                            ) : null}
                            <span>{todo.displayDate}</span>
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId((current) =>
                                  current === todo.id ? null : todo.id,
                                )
                              }
                              disabled={Boolean(pendingById[todo.id])}
                              aria-label={`More options for task ${index + 1}`}
                              className="grid h-6 w-6 place-items-center rounded text-[#8d8d8d] transition-all duration-300 ease-in-out hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CircleEllipsis size={15} />
                            </button>

                            {activeMenuId === todo.id ? (
                              <div className="absolute right-0 top-6 z-20 w-24 rounded border border-[#d2d2d2] bg-white p-1 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(todo)}
                                  disabled={Boolean(pendingById[todo.id])}
                                  className="block w-full rounded px-2 py-1 text-left text-[11px] text-[#333] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTodo(todo)}
                                  disabled={Boolean(pendingById[todo.id])}
                                  className="mt-1 block w-full rounded px-2 py-1 text-left text-[11px] text-[#b91c1c] hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : null}

        <div className="h-8" />
      </div>

      <TaskFormModal
        isOpen={formState.isOpen}
        mode={formState.mode}
        initialData={formState.todo}
        availableTags={resolvedTags}
        onSubmit={handleSubmitForm}
        onCancel={closeForm}
        isSubmitting={isSubmitting}
      />

      {notice ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2">
          <div
            className={`rounded px-3 py-1.5 text-[11px] font-medium shadow-[0_6px_16px_rgba(0,0,0,0.16)] ${
              notice.tone === "error"
                ? "bg-[#fee2e2] text-[#b91c1c]"
                : notice.tone === "warning"
                  ? "bg-[#fff7ed] text-[#c2410c]"
                  : "bg-[#dcfce7] text-[#166534]"
            }`}
          >
            {notice.message}
          </div>
        </div>
      ) : null}
    </section>
  );
}
