export function TweetSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800" />

        <div className="min-w-0 flex-1 space-y-3">
          {/* Author line */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded bg-zinc-800" />
            <div className="h-3.5 w-16 rounded bg-zinc-800" />
          </div>

          {/* Text lines */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-zinc-800" />
            <div className="h-3 w-4/5 rounded bg-zinc-800" />
            <div className="h-3 w-3/5 rounded bg-zinc-800" />
          </div>

          {/* Media placeholder */}
          <div className="h-40 w-full rounded-xl bg-zinc-800" />

          {/* Metrics */}
          <div className="flex gap-6">
            <div className="h-3 w-10 rounded bg-zinc-800" />
            <div className="h-3 w-10 rounded bg-zinc-800" />
            <div className="h-3 w-10 rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
