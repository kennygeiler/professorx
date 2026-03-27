export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header skeleton */}
      <div className="border-b border-zinc-800/50 bg-zinc-950 px-4">
        <div className="flex h-12 items-center">
          <div className="h-5 w-24 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="flex gap-2 pb-2">
          <div className="h-6 w-14 animate-pulse rounded-md bg-zinc-800/50" />
          <div className="h-6 w-14 animate-pulse rounded-md bg-zinc-800/50" />
          <div className="h-6 w-16 animate-pulse rounded-md bg-zinc-800/50" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
          {/* Search bar */}
          <div className="h-10 animate-pulse rounded-xl bg-zinc-900" />

          {/* Cards */}
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-900" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
