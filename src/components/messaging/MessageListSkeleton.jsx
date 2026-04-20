export default function MessageListSkeleton() {
  return (
    <ul className="border-t border-[#d6d6d6]">
      {Array.from({ length: 5 }).map((_, index) => (
        <li
          key={`thread-skeleton-${index}`}
          className="animate-pulse border-b border-[#d6d6d6] py-[11px]"
        >
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-slate-200" />
              <div className="h-2.5 w-full rounded bg-slate-100" />
              <div className="h-2.5 w-3/4 rounded bg-slate-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
