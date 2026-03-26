"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch } from "@/lib/hooks/use-search";
import { SearchBar } from "@/components/search/search-bar";
import { CategoryChips } from "@/components/search/category-chips";
import { TimeChips } from "@/components/search/time-chips";
import { TweetCard } from "@/components/tweets/tweet-card";
import { TweetSkeleton } from "@/components/tweets/tweet-skeleton";
import type { TweetWithCategories } from "@/app/page";

type TimeRange = "1d" | "3d" | "1w" | "2w" | "1m" | "3m" | "6m" | "1y" | "all";

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
  const [categories, setCategories] = useState<Category[]>([]);

  const [tweets, setTweets] = useState(initialTweets);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasFilters = debouncedQuery.length >= 3 || !!category || timeRange !== "all";

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
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
    params.set("limit", "40");

    fetch(`/api/tweets/search?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTweets(data.tweets ?? []);
        setCursor(data.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFilterLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, category, timeRange, hasFilters, initialTweets, initialCursor]);

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);

    const params = new URLSearchParams({ cursor, limit: "20" });
    if (debouncedQuery.length >= 3) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (timeRange !== "all") params.set("timeRange", timeRange);

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
  };

  const hasActiveFilters = query.length > 0 || !!category || timeRange !== "all";

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 pb-4 pt-2 backdrop-blur">
        <div className="flex flex-col gap-3">
          <SearchBar value={query} onChange={setQuery} />

          {categories.length > 0 && (
            <CategoryChips
              categories={categories}
              selected={category}
              onSelect={setCategory}
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <TimeChips selected={timeRange} onSelect={setTimeRange} />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tweet list */}
      {filterLoading ? (
        <div className="flex flex-col gap-3">
          <TweetSkeleton />
          <TweetSkeleton />
          <TweetSkeleton />
        </div>
      ) : tweets.length === 0 && hasFilters ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          No tweets match your filters
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tweets.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} />
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
