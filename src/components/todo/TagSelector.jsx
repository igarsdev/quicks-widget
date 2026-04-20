const DEFAULT_TAG_STYLE = {
  bg: "#e5e7eb",
  text: "#374151",
};

function getTagStyle(tag) {
  return {
    backgroundColor: tag?.bg || DEFAULT_TAG_STYLE.bg,
    color: tag?.text || DEFAULT_TAG_STYLE.text,
  };
}

export default function TagSelector({
  availableTags,
  selectedTags,
  onToggle,
  className = "",
}) {
  return (
    <div
      className={`max-h-48 overflow-y-auto rounded-[3px] border border-[#bfc2c8] bg-white p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ${className}`}
    >
      <ul className="space-y-1">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.label);

          return (
            <li key={tag.id || tag.label}>
              <button
                type="button"
                onClick={() => onToggle(tag.label)}
                className={`block w-full rounded-[2px] border px-2 py-1 text-left text-[10px] transition-all hover:brightness-[0.98] ${isSelected ? "border-[#5b9ef9] ring-1 ring-[#5b9ef9]" : "border-transparent"}`}
                style={getTagStyle(tag)}
              >
                <span>{tag.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
