import type { TweetWithCategories } from "@/app/page";
import { TweetMedia } from "./tweet-media";
import { TweetMetrics } from "./tweet-metrics";

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

export function TweetCard({ tweet }: { tweet: TweetWithCategories }) {
  return (
    <article className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800/70">
      {/* Category badges */}
      {tweet.categories.length > 0 && (
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          {tweet.categories.map((cat) => (
            <span
              key={cat.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${cat.color}20`,
                color: cat.color,
                border: `1px solid ${cat.color}40`,
              }}
            >
              {cat.name}
            </span>
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
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-400">
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

          {/* Metrics */}
          <div className="mt-3">
            {tweet.metrics && <TweetMetrics metrics={tweet.metrics} />}
          </div>
        </div>
      </div>
    </article>
  );
}
