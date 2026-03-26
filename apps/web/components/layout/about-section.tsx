import { AudioPlayer } from "./audio-player";

export function AboutSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-bold text-white">
          KG
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            Kenny Geiler
          </h3>
          <a
            href="https://outsidekenny.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 transition-colors hover:text-amber-300"
          >
            outsidekenny.com
          </a>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-zinc-400">
        A human-being made this by telling AI what to do. That human is Kenny
        Geiler, check out his page, maybe donate like $5 bucks so he can buy
        half a chopped cheese at the bodega or 80% of an immunity ginger shot.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://outsidekenny.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          Support Kenny
        </a>

        <AudioPlayer />
      </div>
    </div>
  );
}
