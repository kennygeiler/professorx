"use client";

import { useState } from "react";
import type { TweetWithCategories } from "@/app/page";
import { TweetMedia } from "./tweet-media";
import { TweetMetrics } from "./tweet-metrics";
import { ReclassifyModal } from "./reclassify-modal";

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

interface TweetCardProps {
  tweet: TweetWithCategories;
  onCategoryChanged?: (tweetId: string, newCategories: TweetWithCategories["categories"]) => void;
}

export function TweetCard({ tweet, onCategoryChanged }: TweetCardProps) {
  const [reclassify, setReclassify] = useState<{
    categoryId: string;
    categoryName: string;
  } | null>(null);

  // Extract links and quoted tweet from raw_data
  const rawData = tweet.raw_data as {
    links?: Array<{ url: string; display_url: string }>;
    quoted_tweet?: { text: string; author_handle: string; author_display_name: string };
  } | null;
  const links = rawData?.links ?? [];
  const quotedTweet = rawData?.quoted_tweet;

  // Visual hierarchy
  const metrics = tweet.metrics as { likes?: number; retweets?: number } | null;
  const likeCount = metrics?.likes ?? 0;
  const hasMedia = (tweet.media?.length ?? 0) > 0;
  const isBookmark = tweet.source_type === "bookmark";

  const handleReclassified = (newCategory: { id: string; name: string; color: string }) => {
    if (onCategoryChanged) {
      onCategoryChanged(tweet.id, [newCategory]);
    }
  };

  return (
    <>
      <article
        className="relative rounded-xl border border-zinc-800 border-l-2 border-l-[#1d9bf0]/40 bg-zinc-900 p-3 sm:p-4 transition-colors hover:bg-zinc-800/70"
      >
        {/* Category badges — tappable */}
        {tweet.categories.length > 0 && (
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
            {tweet.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setReclassify({
                    categoryId: cat.id,
                    categoryName: cat.name,
                  })
                }
                className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all hover:scale-105 hover:brightness-125 active:scale-95"
                style={{
                  backgroundColor: `${cat.color}20`,
                  color: cat.color,
                  border: `1px solid ${cat.color}40`,
                }}
                title="Tap to reclassify"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {tweet.author_avatar_url ? (
              <img
                src={tweet.author_avatar_url}
                alt={tweet.author_display_name ?? ""}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-400">
                {(tweet.author_display_name ?? "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Author line */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="truncate font-semibold text-zinc-100">
                {tweet.author_display_name ?? "Unknown"}
              </span>
              {tweet.author_handle && (
                <span className="truncate text-zinc-500">
                  @{tweet.author_handle}
                </span>
              )}
              <span className="text-zinc-600">&middot;</span>
              <span className="shrink-0 text-zinc-500">
                {relativeTime(tweet.tweet_created_at)}
              </span>
              {isBookmark && (
                <svg className="h-3 w-3 shrink-0 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </div>

            {/* Tweet text */}
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {tweet.text_content}
            </p>

            {/* Media */}
            {tweet.media && tweet.media.length > 0 && (
              <div className="mt-3">
                <TweetMedia media={tweet.media} />
              </div>
            )}

            {/* Link previews */}
            {links.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                  >
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="truncate max-w-[200px]">{link.display_url}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Quoted tweet embed */}
            {quotedTweet && (
              <div className="mt-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-zinc-300">
                    {quotedTweet.author_display_name}
                  </span>
                  <span className="text-zinc-500">
                    @{quotedTweet.author_handle}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                  {quotedTweet.text.length > 200
                    ? quotedTweet.text.slice(0, 200) + "..."
                    : quotedTweet.text}
                </p>
              </div>
            )}

            {/* Metrics + Link */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex-1">
                {tweet.metrics && <TweetMetrics metrics={tweet.metrics} />}
              </div>
              <a
                href={`https://x.com/${tweet.author_handle}/status/${tweet.twitter_tweet_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
                title="View on X"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Reclassify modal */}
      {reclassify && (
        <ReclassifyModal
          tweetId={tweet.id}
          tweetText={tweet.text_content}
          currentCategoryId={reclassify.categoryId}
          currentCategoryName={reclassify.categoryName}
          onClose={() => setReclassify(null)}
          onReclassified={handleReclassified}
        />
      )}
    </>
  );
}
