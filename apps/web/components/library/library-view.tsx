"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearch } from "@/lib/hooks/use-search";
import { SearchBar } from "@/components/search/search-bar";
import { CategoryChips } from "@/components/search/category-chips";
import { TimeSlider } from "@/components/search/time-slider";
import { TweetCard } from "@/components/tweets/tweet-card";
import { TweetSkeleton } from "@/components/tweets/tweet-skeleton";
import type { TweetWithCategories } from "@/app/page";

type TimeRange = "1d" | "3d" | "1w" | "2w" | "1m" | "2m" | "3m" | "6m" | "1y" | "all";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

interface LibraryViewProps {
  initialTweets: TweetWithCategories[];
  initialCursor: string | null;
}

export function LibraryView({ initialTweets, initialCursor }: LibraryViewProps) {
  const { query, setQuery, debouncedQuery } = useSearch(200);
  const [category, setCategory] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "like" | "bookmark">("all");
  const [categories, setCategories] = useState<Category[]>([]);

  const [tweets, setTweets] = useState(initialTweets);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasFilters = debouncedQuery.length >= 3 || !!category || timeRange !== "all" || !!mediaType || sourceFilter !== "all";

  // Fetch categories, uncategorized count, and total tweet count on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
    fetch("/api/tweets/search?limit=1")
      .then((r) => r.json())
      .then((d) => setTotalCount(d.totalCount ?? null))
      .catch(() => {});
    fetch("/api/categorize/remaining")
      .then((r) => r.json())
      .then((d) => setUncategorizedRemaining(d.remaining ?? 0))
      .catch(() => {});
  }, []);

  // Re-fetch tweets when filters change
  useEffect(() => {
    if (!hasFilters) {
      setTweets(initialTweets);
      setCursor(initialCursor);
      return;
    }

    let cancelled = false;
    setFilterLoading(true);

    const params = new URLSearchParams();
    if (debouncedQuery.length >= 3) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (timeRange !== "all") params.set("timeRange", timeRange);
    if (mediaType) params.set("mediaType", mediaType);
      if (sourceFilter !== "all") params.set("sourceType", sourceFilter);
    params.set("limit", "40");

    fetch(`/api/tweets/search?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTweets(data.tweets ?? []);
        setCursor(data.nextCursor ?? null);
        if (data.totalCount !== undefined) setTotalCount(data.totalCount);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFilterLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, category, timeRange, mediaType, sourceFilter, hasFilters, initialTweets, initialCursor]);

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);

    const params = new URLSearchParams({ cursor, limit: "20" });
    if (debouncedQuery.length >= 3) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (timeRange !== "all") params.set("timeRange", timeRange);
    if (mediaType) params.set("mediaType", mediaType);
      if (sourceFilter !== "all") params.set("sourceType", sourceFilter);

    const endpoint = hasFilters ? "/api/tweets/search" : "/api/tweets";

    try {
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTweets((prev) => [...prev, ...data.tweets]);
      setCursor(data.nextCursor);
    } catch {
      // retry on next scroll
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasFilters, debouncedQuery, category, timeRange]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const clearAll = () => {
    setQuery("");
    setCategory(null);
    setTimeRange("all");
    setMediaType(null);
    setSourceFilter("all");
  };

  const [categorizing, setCategorizing] = useState(false);
  const [catProgress, setCatProgress] = useState("");
  const [uncategorizedRemaining, setUncategorizedRemaining] = useState<number | null>(null);

  const hasActiveFilters = query.length > 0 || !!category || timeRange !== "all";
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [aiSearching, setAiSearching] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);

  const runAiSearch = async () => {
    if (!debouncedQuery || debouncedQuery.length < 3) return;
    setAiSearching(true);
    setShowAiSearch(false);
    try {
      const res = await fetch("/api/tweets/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: debouncedQuery }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = data.tweetIds ?? [];
      if (ids.length === 0) {
        setTweets([]);
        return;
      }
      // Fetch full tweet data for matched IDs
      const params = new URLSearchParams({ limit: "50" });
      params.set("tweetIds", ids.join(","));
      const tweetsRes = await fetch(`/api/tweets/search?${params.toString()}`);
      if (tweetsRes.ok) {
        const tweetsData = await tweetsRes.json();
        setTweets(tweetsData.tweets ?? []);
        setCursor(null);
      }
    } catch {
      // Silently handle
    } finally {
      setAiSearching(false);
    }
  };

  const handleCategoryChanged = useCallback(
    (tweetId: string, newCategories: TweetWithCategories["categories"]) => {
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, categories: newCategories } : t
        )
      );
    },
    []
  );

  const [refreshing, setRefreshing] = useState(false);

  const softRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Re-fetch categories
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories ?? []);
      }
      // Re-fetch uncategorized count
      const remRes = await fetch("/api/categorize/remaining");
      if (remRes.ok) {
        const remData = await remRes.json();
        setUncategorizedRemaining(remData.remaining ?? 0);
      }
      // Re-fetch tweets
      const params = new URLSearchParams({ limit: "40" });
      if (debouncedQuery.length >= 3) params.set("q", debouncedQuery);
      if (category) params.set("category", category);
      if (timeRange !== "all") params.set("timeRange", timeRange);
      if (mediaType) params.set("mediaType", mediaType);
      if (sourceFilter !== "all") params.set("sourceType", sourceFilter);
      const endpoint = hasFilters ? "/api/tweets/search" : "/api/tweets";
      const tweetsRes = await fetch(`${endpoint}?${params.toString()}`);
      if (tweetsRes.ok) {
        const tweetsData = await tweetsRes.json();
        setTweets(tweetsData.tweets ?? []);
        setCursor(tweetsData.nextCursor ?? null);
        if (tweetsData.totalCount !== undefined) setTotalCount(tweetsData.totalCount);
      }
    } catch {
      // Silently handle
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, category, timeRange, hasFilters]);

  const runCategorization = async () => {
    setCategorizing(true);
    setCatProgress("Starting AI categorization...");
    let totalCategorized = 0;
    let round = 0;
    const maxRounds = 10;

    try {
      while (round < maxRounds) {
        const res = await fetch("/api/categorize", { method: "POST" });
        if (!res.ok) {
          const data = await res.json();
          setCatProgress(`Error: ${data.error}`);
          break;
        }
        const data = await res.json();
        totalCategorized += data.categorized;
        setUncategorizedRemaining(data.remaining ?? 0);

        if (data.errors?.length > 0) {
          setCatProgress(`Errors: ${data.errors.slice(0, 3).join("; ")} | User: ${data._debug?.userId}`);
        } else if (data.newCategories?.length > 0) {
          setCatProgress(`Created categories: ${data.newCategories.join(", ")}. Categorized ${totalCategorized} tweets...`);
        } else {
          setCatProgress(`Categorized ${totalCategorized} tweets... (remaining: ${data.remaining})`);
        }

        // If nothing was categorized this round, we're done
        if (data.categorized === 0) break;
        round++;
      }

      setCatProgress(`Done! ${totalCategorized} tweets categorized.`);

      // Refresh categories
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories ?? []);
      }

      // Soft refresh tweets to show updated category badges
      if (totalCategorized > 0) {
        setTimeout(() => softRefresh(), 1000);
      }
    } catch {
      setCatProgress("Categorization failed. Try again.");
    } finally {
      setCategorizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 pb-4 pt-1 sm:pb-6 sm:pt-2 backdrop-blur">
        <div className="flex flex-col gap-2 sm:gap-3">
          <SearchBar value={query} onChange={setQuery} />

          {/* AI Search button — only shows when there's a query */}
          {(debouncedQuery.length >= 3 || aiSearching) && (
          <button
            onClick={runAiSearch}
            disabled={aiSearching || debouncedQuery.length < 3}
            className="ai-search-btn relative w-full overflow-hidden rounded-lg py-2 text-xs font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {aiSearching ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching with AI...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Search with AI
                </>
              )}
            </span>
          </button>
          )}

          {/* Tweet count + filter toggle */}
          <div className="flex items-center justify-between">
            {totalCount !== null && (
              <p className="text-[11px] tabular-nums text-zinc-500">
                {totalCount.toLocaleString()} tweet{totalCount !== 1 ? "s" : ""}
                {hasFilters ? " matching" : " total"}
              </p>
            )}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {filtersOpen ? "Hide filters" : "Show filters"}
            </button>
          </div>

          {/* Collapsible filter section */}
          {filtersOpen && <>

          {/* Source + media type filters */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "all" as const, label: "All" },
              { value: "like" as const, label: "Likes" },
              { value: "bookmark" as const, label: "Bookmarks" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceFilter(opt.value)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  sourceFilter === opt.value
                    ? "bg-[#1d9bf0]/15 text-[#1d9bf0] border border-[#1d9bf0]/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <span className="w-px bg-zinc-800" />
            {[
              { value: null, label: "All types" },
              { value: "photo", label: "Photos" },
              { value: "video", label: "Videos" },
              { value: "quote", label: "Quotes" },
              { value: "uncategorized", label: "Uncategorized" },
            ].map((opt) => (
              <button
                key={opt.value ?? "all"}
                onClick={() => setMediaType(opt.value)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  mediaType === opt.value
                    ? "bg-[#1d9bf0]/15 text-[#1d9bf0] border border-[#1d9bf0]/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearAll} className="shrink-0 rounded-full px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300">
                Clear all
              </button>
            )}
          </div>

          {/* All filters always visible */}
          <div className="flex flex-col gap-3">
            {categories.length > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <CategoryChips
                    categories={categories}
                    selected={category}
                    onSelect={setCategory}
                  />
                </div>
                <Link
                  href="/settings/categories"
                  className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  title="Manage categories"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </div>
            )}

            <TimeSlider selected={timeRange} onSelect={setTimeRange} />
          </div>

          {(uncategorizedRemaining === null || uncategorizedRemaining > 0) && (
            <button
              onClick={runCategorization}
              disabled={categorizing}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {categorizing ? (
                <>
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Categorizing...
                </>
              ) : uncategorizedRemaining !== null ? (
                `Categorize ${uncategorizedRemaining} remaining tweets`
              ) : (
                "Categorize tweets with AI"
              )}
            </button>
          )}

          {catProgress && (
            <p className="text-xs text-emerald-400">{catProgress}</p>
          )}

          </>}
        </div>
      </div>

      {/* Tweet list */}
      {filterLoading ? (
        <div className="flex flex-col gap-2 sm:gap-3">
          <TweetSkeleton />
          <TweetSkeleton />
          <TweetSkeleton />
        </div>
      ) : aiSearching ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <svg className="h-5 w-5 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-400">AI is searching your tweets...</p>
        </div>
      ) : tweets.length === 0 && hasFilters ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-zinc-500">No tweets match your filters</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-3">
          {tweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              onCategoryChanged={handleCategoryChanged}
            />
          ))}

          {loading && (
            <>
              <TweetSkeleton />
              <TweetSkeleton />
            </>
          )}

          {cursor && <div ref={sentinelRef} className="h-px" />}

          {!cursor && tweets.length > 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              You&apos;ve reached the end
            </p>
          )}
        </div>
      )}
    </div>
  );
}
