"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TweetWithCategories } from "@/app/page";
import { TweetCard } from "./tweet-card";
import { TweetSkeleton } from "./tweet-skeleton";

interface TweetListProps {
  initialTweets: TweetWithCategories[];
  initialCursor: string | null;
}

export function TweetList({ initialTweets, initialCursor }: TweetListProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const timeRange = searchParams.get("timeRange") ?? "all";

  const hasFilters = q.length >= 3 || category || timeRange !== "all";

  const [tweets, setTweets] = useState(initialTweets);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Re-fetch when filters change
  useEffect(() => {
    if (!hasFilters) {
      // Reset to initial data when no filters
      setTweets(initialTweets);
      setCursor(initialCursor);
      return;
    }

    let cancelled = false;
    setFilterLoading(true);

    const params = new URLSearchParams();
    if (q.length >= 3) params.set("q", q);
    if (category) params.set("category", category);
    if (timeRange !== "all") params.set("timeRange", timeRange);
    params.set("limit", "20");

    fetch(`/api/tweets/search?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setTweets(data.tweets ?? []);
        setCursor(data.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFilterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, category, timeRange, hasFilters, initialTweets, initialCursor]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ cursor, limit: "20" });
      if (hasFilters) {
        if (q.length >= 3) params.set("q", q);
        if (category) params.set("category", category);
        if (timeRange !== "all") params.set("timeRange", timeRange);
      }

      const endpoint = hasFilters ? "/api/tweets/search" : "/api/tweets";
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setTweets((prev) => [...prev, ...data.tweets]);
      setCursor(data.nextCursor);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasFilters, q, category, timeRange]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (filterLoading) {
    return (
      <div className="flex flex-col gap-3">
        <TweetSkeleton />
        <TweetSkeleton />
        <TweetSkeleton />
      </div>
    );
  }

  if (tweets.length === 0 && hasFilters) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No tweets match your filters
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}

      {loading && (
        <>
          <TweetSkeleton />
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
  );
}
