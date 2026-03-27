import type { TweetMedia as TweetMediaType } from "@/lib/supabase/types";

interface TweetMediaProps {
  media: TweetMediaType[];
  tweetUrl?: string;
}

function MediaItem({
  item,
  tweetUrl,
  className = "",
  style,
}: {
  item: TweetMediaType;
  tweetUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // For videos/gifs — we only have the thumbnail, not the playable URL
  // Show the thumbnail with a play icon overlay that links to the tweet
  if (item.type === "video" || item.type === "animated_gif") {
    const imgSrc = item.preview_url ?? item.url;
    if (!imgSrc || imgSrc.startsWith("blob:")) return null;

    return (
      <div className={`relative ${className}`} style={style}>
        <img
          src={imgSrc}
          alt=""
          className="w-full object-cover"
          style={style}
          loading="lazy"
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {tweetUrl ? (
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d9bf0]/90 text-white shadow-lg transition-transform hover:scale-110"
            >
              <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </a>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-white">
              <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
        {/* Type badge */}
        <span className="absolute bottom-2 left-2 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {item.type === "animated_gif" ? "GIF" : "VIDEO"}
        </span>
      </div>
    );
  }

  // Photo
  const imgSrc = item.preview_url ?? item.url;
  if (!imgSrc || imgSrc.startsWith("blob:")) return null;

  return (
    <img
      src={imgSrc}
      alt=""
      className={`w-full object-cover ${className}`}
      style={style}
      loading="lazy"
    />
  );
}

export function TweetMedia({ media, tweetUrl }: TweetMediaProps) {
  // Filter out invalid URLs
  const validMedia = media.filter((m) => {
    const url = m.preview_url ?? m.url;
    return url && !url.startsWith("blob:") && url.startsWith("http");
  });

  if (validMedia.length === 0) return null;

  if (validMedia.length === 1) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <MediaItem item={validMedia[0]} tweetUrl={tweetUrl} style={{ maxHeight: 320 }} />
      </div>
    );
  }

  if (validMedia.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
        {validMedia.map((m, i) => (
          <MediaItem key={i} item={m} tweetUrl={tweetUrl} className="aspect-square" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
      {validMedia.slice(0, 4).map((m, i) => (
        <MediaItem key={i} item={m} tweetUrl={tweetUrl} className="aspect-square" />
      ))}
    </div>
  );
}
