"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TweetCard } from "@/components/tweets/tweet-card";
import type { TweetWithCategories } from "@/app/page";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

interface ColumnViewProps {
  categories: Category[];
  onCategoryChanged?: (tweetId: string, newCategories: TweetWithCategories["categories"]) => void;
}

function CategoryColumn({
  category,
  onCategoryChanged,
}: {
  category: Category;
  onCategoryChanged?: ColumnViewProps["onCategoryChanged"];
}) {
  const [tweets, setTweets] = useState<TweetWithCategories[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchTweets = useCallback(async (cursorVal?: string) => {
    const params = new URLSearchParams({ category: category.id, limit: "15" });
    if (cursorVal) params.set("cursor", cursorVal);

    const res = await fetch(`/api/tweets/search?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    return data;
  }, [category.id]);

  useEffect(() => {
    setLoading(true);
    fetchTweets().then((data) => {
      if (data) {
        setTweets(data.tweets ?? []);
        setCursor(data.nextCursor ?? null);
      }
      setLoading(false);
    });
  }, [fetchTweets]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    const data = await fetchTweets(cursor);
    if (data) {
      setTweets((prev) => [...prev, ...(data.tweets ?? [])]);
      setCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  }, [cursor, loadingMore, fetchTweets]);

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

  return (
    <div className="flex w-80 shrink-0 flex-col lg:w-96">
      {/* Column header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 rounded-t-lg border-b border-zinc-800 bg-zinc-900 px-3 py-2"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-sm font-semibold text-zinc-100">{category.name}</span>
        <span className="text-xs text-zinc-500">{category.tweet_count}</span>
      </div>

      {/* Scrollable tweet list */}
      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-b-lg bg-zinc-950/50 p-2" style={{ maxHeight: "calc(100vh - 180px)" }}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-800/50" />
            ))}
          </div>
        ) : tweets.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-500">No tweets</p>
        ) : (
          <>
            {tweets.map((tweet) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                onCategoryChanged={onCategoryChanged}
              />
            ))}
            {loadingMore && (
              <div className="h-16 animate-pulse rounded-lg bg-zinc-800/50" />
            )}
            {cursor && <div ref={sentinelRef} className="h-px" />}
          </>
        )}
      </div>
    </div>
  );
}

export function ColumnView({ categories, onCategoryChanged }: ColumnViewProps) {
  if (categories.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No categories yet. Categorize your tweets first.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
      {categories.map((cat) => (
        <CategoryColumn
          key={cat.id}
          category={cat}
          onCategoryChanged={onCategoryChanged}
        />
      ))}
    </div>
  );
}
