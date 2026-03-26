import type { TweetMedia as TweetMediaType } from "@/lib/supabase/types";

interface TweetMediaProps {
  media: TweetMediaType[];
}

function MediaItem({
  item,
  className = "",
  style,
}: {
  item: TweetMediaType;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (item.type === "video" && item.video_url) {
    return (
      <video
        src={item.video_url}
        poster={item.preview_url ?? item.url}
        controls
        playsInline
        preload="none"
        className={`w-full object-cover ${className}`}
        style={style}
      />
    );
  }

  if (item.type === "animated_gif" && item.video_url) {
    return (
      <video
        src={item.video_url}
        poster={item.preview_url ?? item.url}
        autoPlay
        loop
        muted
        playsInline
        className={`w-full object-cover ${className}`}
        style={style}
      />
    );
  }

  // Photo or fallback (no video_url available)
  return (
    <img
      src={item.preview_url ?? item.url}
      alt=""
      className={`w-full object-cover ${className}`}
      style={style}
      loading="lazy"
    />
  );
}

export function TweetMedia({ media }: TweetMediaProps) {
  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <MediaItem item={media[0]} style={{ maxHeight: 320 }} />
      </div>
    );
  }

  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
        {media.map((m, i) => (
          <MediaItem
            key={i}
            item={m}
            className="aspect-square"
          />
        ))}
      </div>
    );
  }

  // 3 or 4 images: 2x2 grid
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
      {media.slice(0, 4).map((m, i) => (
        <MediaItem
          key={i}
          item={m}
          className="aspect-square"
        />
      ))}
    </div>
  );
}
