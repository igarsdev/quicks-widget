import { Search } from "lucide-react";
import MessageListSkeleton from "./MessageListSkeleton";

export default function MessageList({
  activeThreadId,
  isLoading,
  isError,
  onSearch,
  onSelectThread,
  search,
  threads,
}) {
  return (
    <section className="font-lato flex h-full min-h-0 flex-col bg-[#f4f4f4]">
      <header className="shrink-0 bg-[#f4f4f4] px-6 pb-0 pt-6">
        <div className="relative">
          <Search
            size={11}
            strokeWidth={2}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b8b8b]"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search inbox"
            className="lato-12-regular h-[22px] w-full rounded-[2px] border border-[#bfbfbf] bg-[#f5f5f5] pl-8 pr-7 text-[#2f2f2f] outline-none placeholder:text-[#8a8a8a] focus:border-[#85a8f8]"
          />
          <Search
            size={10}
            strokeWidth={2}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7f7f7f]"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto quicks-scrollbar bg-[#f4f4f4] px-6 pb-6 pt-[22px]">
        {isLoading ? <MessageListSkeleton /> : null}

        {!isLoading && isError ? (
          <div className="p-4 text-sm text-red-600">
            Failed to load inbox. Please try again.
          </div>
        ) : null}

        {!isLoading && !isError && threads.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
            No conversations found.
          </div>
        ) : null}

        {!isLoading && !isError && threads.length > 0 ? (
          <ul className="border-t border-[#d6d6d6]">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="border-b border-[#d6d6d6] py-[10px]"
              >
                <button
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={`relative flex w-full items-start gap-2 rounded-[4px] px-1 py-1 text-left transition-all duration-200 ${
                    activeThreadId === thread.id
                      ? "bg-[#eaf1ff]"
                      : "hover:bg-[#ececec]"
                  }`}
                >
                  <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2f74f4] text-[9px] font-semibold uppercase text-white">
                    {thread.initial}
                  </div>

                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="lato-14-bold truncate leading-4 text-[#2f6edb]">
                        {thread.title}
                      </p>
                      <span className="lato-12-regular shrink-0 whitespace-nowrap leading-4 text-[#6f6f6f]">
                        {thread.timeLabel}
                      </span>
                    </div>

                    <p className="lato-14-regular mt-[1px] truncate leading-4 text-[#3d3d3d]">
                      {thread.sender}
                    </p>

                    <p className="lato-12-regular mt-[1px] truncate leading-4 text-[#4b5563]">
                      {thread.preview}
                    </p>
                  </div>

                  {thread.unread ? (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-[#ef4444] px-1.5 py-[1px] text-[10px] font-semibold leading-3 text-white">
                      {thread.unreadCount || 1}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
