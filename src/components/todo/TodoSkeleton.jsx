export default function TodoSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4"
        >
          <div className="h-5 w-5 rounded-full bg-slate-200" />
          <div className="h-4 flex-1 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
