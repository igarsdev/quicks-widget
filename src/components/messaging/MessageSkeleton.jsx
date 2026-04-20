export default function MessageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2 rounded-2xl bg-slate-100 p-4">
            <div className="h-3 w-1/3 rounded-full bg-slate-200" />
            <div className="h-3 w-5/6 rounded-full bg-slate-200" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
