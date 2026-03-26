"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TweetWithCategories } from "@/app/(main)/page";
import { TweetCard } from "./tweet-card";
import { TweetSkeleton } from "./tweet-skeleton";

interface TweetListProps {
  initialTweets: TweetWithCategories[];
  initialCursor: string | null;
}

export function TweetList({ initialTweets, initialCursor }: TweetListProps) {
  const [tweets, setTweets] = useState(initialTweets);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        cursor,
        limit: "20",
      });
      const res = await fetch(`/api/tweets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setTweets((prev) => [...prev, ...data.tweets]);
      setCursor(data.nextCursor);
    } catch {
      // Silently fail - user can scroll again to retry
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

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
