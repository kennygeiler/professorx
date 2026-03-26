"use client";

import { useState } from "react";

export function EmptyState() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(`${data.message}`);
        if (data.inserted > 0) {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (e) {
      setResult("Sync failed. Check your connection.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
        <svg
          className="h-10 w-10 text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-zinc-100">No tweets yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        Sync your Twitter likes and bookmarks to start organizing them with AI.
      </p>

      <button
        onClick={handleSync}
        disabled={syncing}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {syncing ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Sync My Tweets
          </>
        )}
      </button>

      {result && (
        <p className={`mt-4 text-sm ${result.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
