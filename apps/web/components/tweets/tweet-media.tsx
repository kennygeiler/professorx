import type { TweetMedia as TweetMediaType } from "@/lib/supabase/types";

interface TweetMediaProps {
  media: TweetMediaType[];
}

export function TweetMedia({ media }: TweetMediaProps) {
  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <img
          src={media[0].preview_url ?? media[0].url}
          alt=""
          className="w-full object-cover"
          style={{ maxHeight: 320 }}
          loading="lazy"
        />
      </div>
    );
  }

  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
        {media.map((m, i) => (
          <img
            key={i}
            src={m.preview_url ?? m.url}
            alt=""
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  // 3 or 4 images: 2x2 grid
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-zinc-800">
      {media.slice(0, 4).map((m, i) => (
        <img
          key={i}
          src={m.preview_url ?? m.url}
          alt=""
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
}
