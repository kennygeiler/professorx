"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    let totalInserted = 0;
    let totalFetched = 0;
    let nextToken: string | null = null;
    let pages = 0;
    const maxPages = 10;

    try {
      while (pages < maxPages) {
        const body: Record<string, string> = {};
        if (nextToken) body.paginationToken = nextToken;

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json();
          setSyncResult(`Error: ${errData.error}`);
          setSyncing(false);
          return;
        }

        const data = await res.json();
        totalInserted += data.inserted;
        totalFetched += data.tweetCount;
        nextToken = data.nextToken;
        pages++;

        if (!nextToken) break;
      }

      if (totalInserted > 0) {
        setSyncResult(`Synced ${totalInserted} new tweets`);
        setTimeout(() => window.location.reload(), 1500);
      } else if (totalFetched > 0) {
        setSyncResult("All tweets up to date");
        setTimeout(() => setSyncResult(null), 3000);
      } else {
        setSyncResult("No new tweets found");
        setTimeout(() => setSyncResult(null), 3000);
      }
    } catch {
      setSyncResult("Sync failed");
      setTimeout(() => setSyncResult(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-950 px-4">
      <div className="flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-100">
          ProfessorX
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            aria-label="Sync tweets"
            title="Sync tweets"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={syncing ? "animate-spin" : ""}
            >
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>

          <Link
            href="/settings"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>
      </div>

      {syncResult && (
        <p className={`pb-2 text-xs ${syncResult.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
          {syncResult}
        </p>
      )}
    </header>
  );
}
