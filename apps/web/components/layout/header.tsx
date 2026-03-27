"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "library" },
  { href: "/settings", label: "settings" },
  { href: "/settings/categories", label: "categories" },
];

export function Header() {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [resyncProgress, setResyncProgress] = useState<string | null>(null);

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
          if (res.status === 401) {
            setSyncResult("SESSION_EXPIRED");
          } else {
            setSyncResult(`Error: ${errData.error}`);
          }
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
        setSyncResult(`Synced ${totalInserted} new tweets. Categorizing...`);
        // Auto-categorize new tweets
        try {
          let catRound = 0;
          let totalCategorized = 0;
          while (catRound < 10) {
            const catRes = await fetch("/api/categorize", { method: "POST" });
            if (!catRes.ok) break;
            const catData = await catRes.json();
            totalCategorized += catData.categorized;
            if (catData.categorized === 0) break;
            catRound++;
          }
          setSyncResult(
            `Synced ${totalInserted} tweets, ${totalCategorized} categorized`
          );
        } catch {
          setSyncResult(`Synced ${totalInserted} tweets (categorization failed)`);
        }
        setTimeout(() => setSyncResult(null), 4000);
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

  const handleResyncAll = async () => {
    setSyncing(true);
    setResyncProgress("Starting full re-sync...");

    let totalUpdated = 0;
    let totalFetched = 0;
    let nextToken: string | null = null;
    let pages = 0;
    const maxPages = 50; // up to 5000 tweets

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
          if (res.status === 401) {
            setSyncResult("SESSION_EXPIRED");
            setResyncProgress(null);
            setSyncing(false);
            return;
          }
          setResyncProgress(`Error on page ${pages + 1}: ${errData.error}`);
          break;
        }

        const data = await res.json();
        totalUpdated += data.inserted + data.updated;
        totalFetched += data.tweetCount;
        nextToken = data.nextToken;
        pages++;

        setResyncProgress(
          `Page ${pages}: ${totalFetched} tweets processed (${totalUpdated} updated)...`
        );

        if (!nextToken) break;
      }

      setResyncProgress(
        `Done! ${totalFetched} tweets re-synced, ${totalUpdated} updated with new media data.`
      );
      setTimeout(() => setResyncProgress(null), 5000);
    } catch {
      setResyncProgress("Re-sync failed.");
      setTimeout(() => setResyncProgress(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-950">
      {/* Main bar */}
      <div className="flex h-12 items-center justify-between px-4">
        <Link href="/" className="text-base font-bold tracking-tight text-zinc-100">
          ItoldYou
        </Link>

        <div className="flex items-center gap-1">
          {/* Test mode toggle */}
          <button
            onClick={() => setTestMode(!testMode)}
            className={`rounded-md px-2 py-1 text-[10px] font-mono transition-colors ${
              testMode
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {testMode ? "test" : "test"}
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            aria-label="Sync tweets"
            title="Sync new tweets"
          >
            <svg
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav bar */}
      <nav className="flex items-center gap-1 px-4 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:text-red-400"
        >
          logout
        </button>
      </nav>

      {/* Test mode panel */}
      {testMode && (
        <div className="border-t border-zinc-800/50 bg-zinc-900/50 px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResyncAll}
              disabled={syncing}
              className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              {syncing ? "Re-syncing..." : "Re-sync all tweets (backfill media)"}
            </button>
            <span className="text-[10px] text-zinc-600">
              Pulls all liked tweets again to update media/video data
            </span>
          </div>
          {resyncProgress && (
            <p className="mt-1.5 text-xs text-amber-400/80">{resyncProgress}</p>
          )}
        </div>
      )}

      {/* Sync status */}
      {syncResult && !testMode && (
        <div className="px-4 pb-2">
          {syncResult === "SESSION_EXPIRED" ? (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <span>Session expired.</span>
              <a
                href="/login"
                className="font-medium text-red-300 underline underline-offset-2 hover:text-red-200"
              >
                Log in again
              </a>
            </div>
          ) : (
            <p className={`text-xs ${syncResult.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
              {syncResult}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
