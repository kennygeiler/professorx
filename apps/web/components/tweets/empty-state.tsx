"use client";

import { useState } from "react";

export function EmptyState() {
  const [syncLikes, setSyncLikes] = useState(true);
  const [syncBookmarks, setSyncBookmarks] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [phase, setPhase] = useState<"choose" | "syncing" | "categorizing" | "done">("choose");
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const handleSync = async () => {
    if (!syncLikes && !syncBookmarks) return;
    setSyncing(true);
    setPhase("syncing");
    setProgressPct(0);

    // Save preferences
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_likes: syncLikes, sync_bookmarks: syncBookmarks }),
      });
    } catch { /* non-critical */ }

    let totalInserted = 0;
    let totalFetched = 0;
    let nextToken: string | null = null;
    let pages = 0;
    const maxPages = 15;

    try {
      // Sync pages
      while (pages < maxPages) {
        const body: Record<string, string | boolean> = {};
        if (nextToken) body.paginationToken = nextToken;

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          if (res.status === 401) {
            setStatusText("Session expired. Please log out and log back in.");
            setSyncing(false);
            return;
          }
          setStatusText(`Error: ${data.error}`);
          setSyncing(false);
          return;
        }

        const data = await res.json();
        totalInserted += data.inserted;
        totalFetched += data.tweetCount;
        nextToken = data.nextToken;
        pages++;

        const pct = Math.min(90, (pages / maxPages) * 90);
        setProgressPct(pct);
        setStatusText(`Fetching tweets... ${totalFetched} found`);

        if (!nextToken) break;
      }

      if (totalInserted === 0 && totalFetched === 0) {
        setStatusText("No tweets found on your account");
        setSyncing(false);
        setPhase("choose");
        return;
      }

      // Auto-categorize
      setPhase("categorizing");
      setProgressPct(92);
      setStatusText(`${totalInserted} tweets synced. Categorizing with AI...`);

      let totalCategorized = 0;
      let catRound = 0;
      while (catRound < 15) {
        const catRes = await fetch("/api/categorize", { method: "POST" });
        if (!catRes.ok) break;
        const catData = await catRes.json();
        totalCategorized += catData.categorized;

        const catPct = 92 + Math.min(8, (catRound / 10) * 8);
        setProgressPct(catPct);
        setStatusText(`Categorized ${totalCategorized} tweets...`);

        if (catData.categorized === 0) break;
        catRound++;
      }

      setProgressPct(100);
      setPhase("done");
      setStatusText(`Done! ${totalInserted} tweets synced, ${totalCategorized} categorized.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setStatusText("Sync failed. Check your connection and try again.");
      setSyncing(false);
      setPhase("choose");
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#1d9bf0]" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-zinc-100">
        {phase === "choose" ? "Let's get started" : phase === "done" ? "All set!" : "Syncing your tweets"}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        {phase === "choose"
          ? "Choose what to sync. AI will automatically organize everything into categories."
          : phase === "done"
            ? "Your tweets are organized and ready to search."
            : "This may take a moment..."}
      </p>

      {/* Source selection */}
      {phase === "choose" && (
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 cursor-pointer transition-colors hover:bg-zinc-800/70">
            <input
              type="checkbox"
              checked={syncLikes}
              onChange={(e) => setSyncLikes(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-[#1d9bf0]"
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-zinc-100">Liked tweets</p>
              <p className="text-xs text-zinc-500">Tweets you've hearted</p>
            </div>
            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 cursor-pointer transition-colors hover:bg-zinc-800/70">
            <input
              type="checkbox"
              checked={syncBookmarks}
              onChange={(e) => setSyncBookmarks(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-[#1d9bf0]"
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-zinc-100">Bookmarks</p>
              <p className="text-xs text-zinc-500">Tweets you've saved</p>
            </div>
            <svg className="h-5 w-5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </label>

          <button
            onClick={handleSync}
            disabled={!syncLikes && !syncBookmarks}
            className="mt-2 w-full rounded-xl bg-[#1d9bf0] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sync & Organize
          </button>
        </div>
      )}

      {/* Progress bar */}
      {(phase === "syncing" || phase === "categorizing" || phase === "done") && (
        <div className="mt-6 w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-[#1d9bf0] transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[#1d9bf0]">
            {statusText}
          </p>
        </div>
      )}

      {/* Error state */}
      {!syncing && statusText.startsWith("Error") && (
        <p className="mt-4 text-sm text-red-400">{statusText}</p>
      )}
    </div>
  );
}
