import { useEffect, useMemo, useState } from "react";
import TagSelector from "./TagSelector";

function normalizeInitialState(initialData) {
  return {
    title: initialData?.title || "",
    description:
      initialData?.description && initialData.description !== "No Description"
        ? initialData.description
        : "",
    dueDate: initialData?.dueDate || "",
    owner: initialData?.owner || "user-local",
    tags: Array.isArray(initialData?.tags) ? initialData.tags : [],
  };
}

export default function TaskFormModal({
  isOpen,
  mode,
  initialData,
  availableTags,
  onSubmit,
  onCancel,
  isSubmitting,
}) {
  const [form, setForm] = useState(() => normalizeInitialState(initialData));
  const [showTagSelector, setShowTagSelector] = useState(false);

  useEffect(() => {
    setForm(normalizeInitialState(initialData));
    setShowTagSelector(false);
  }, [initialData, isOpen]);

  const selectedTagObjects = useMemo(() => {
    return form.tags
      .map((selectedLabel) =>
        availableTags.find((tag) => tag.label === selectedLabel),
      )
      .filter(Boolean);
  }, [availableTags, form.tags]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleTag = (tagLabel) => {
    setForm((current) => {
      const hasTag = current.tags.includes(tagLabel);

      return {
        ...current,
        tags: hasTag
          ? current.tags.filter((tag) => tag !== tagLabel)
          : [...current.tags, tagLabel],
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim() || "No Description",
    };

    if (!payload.title) {
      return;
    }

    onSubmit(payload);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-2">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[288px] rounded-[4px] bg-white p-2.5 shadow-[0_14px_32px_rgba(0,0,0,0.22)]"
      >
        <h3 className="text-[12px] font-semibold text-[#303030]">
          {mode === "edit" ? "Edit Task" : "New Task"}
        </h3>

        <div className="mt-3 space-y-2">
          <input
            value={form.title}
            onChange={(event) => handleChange("title", event.target.value)}
            placeholder="Task title"
            className="h-8 w-full rounded border border-[#c8c8c8] px-2 text-[11px] outline-none focus:border-[#2f74f4]"
            required
          />

          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => handleChange("dueDate", event.target.value)}
            className="h-8 w-full rounded border border-[#c8c8c8] px-2 text-[11px] outline-none focus:border-[#2f74f4]"
          />

          <textarea
            value={form.description}
            onChange={(event) =>
              handleChange("description", event.target.value)
            }
            placeholder="Description"
            rows={3}
            className="w-full resize-none rounded border border-[#c8c8c8] px-2 py-1.5 text-[11px] outline-none focus:border-[#2f74f4]"
          />

          <div>
            <button
              type="button"
              onClick={() => setShowTagSelector((current) => !current)}
              disabled={isSubmitting}
              className="inline-flex h-7 items-center rounded border border-[#c8c8c8] px-2 text-[10px] text-[#505050] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Select Tags
            </button>

            {showTagSelector ? (
              <div className="mt-2">
                <TagSelector
                  availableTags={availableTags}
                  selectedTags={form.tags}
                  onToggle={toggleTag}
                />
              </div>
            ) : null}

            {selectedTagObjects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTagObjects.map((tag) => (
                  <span
                    key={tag.id || tag.label}
                    className="rounded px-2 py-1 text-[10px]"
                    style={{ backgroundColor: tag.bg, color: tag.text }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-7 rounded border border-[#c8c8c8] px-2.5 text-[10px] text-[#4b5563]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-7 rounded bg-[#2f74f4] px-2.5 text-[10px] font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
