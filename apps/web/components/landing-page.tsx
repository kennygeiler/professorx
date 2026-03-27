export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#1d9bf0]" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          readXlater
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-400">
          your Twitter likes and bookmarks, organized and searchable with AI.
          <br />
          runs on your machine. zero API costs. fully open source.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://github.com/kennygeiler/readxlater"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl bg-[#1d9bf0] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Clone on GitHub
          </a>
          <a
            href="https://github.com/kennygeiler/readxlater#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Quick Start Guide
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-zinc-800/50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">how it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "extension scrapes",
                desc: "a Chrome extension opens your Twitter likes page, auto-scrolls, and extracts tweets from the DOM. no API. no rate limits.",
              },
              {
                step: "2",
                title: "AI categorizes",
                desc: "GPT-4o-mini reads each tweet and assigns 1-2 categories. new categories are created automatically as it discovers topics.",
              },
              {
                step: "3",
                title: "you search",
                desc: "full-text search, category filters, time slider, media type filters. or ask the AI: \"tweets about investing advice.\"",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#1d9bf0]/15 text-sm font-bold text-[#1d9bf0]">
                  {item.step}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-zinc-800/50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">features</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "AI categorization with learning",
              "full-text + semantic AI search",
              "multi-category support (up to 2)",
              "quote tweet embeds",
              "video/GIF playback",
              "link preview chips",
              "fibonacci time slider",
              "self-healing DOM selectors",
              "reclassify with AI feedback",
              "category management + merge",
              "likes + bookmarks sync",
              "mobile responsive",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-[#1d9bf0]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="text-sm text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ethos */}
      <div className="border-t border-zinc-800/50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="mb-4 text-2xl font-bold">the ethos</h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-zinc-400">
            readXlater is a personal tool. you run it on your machine, with your own keys,
            for yourself. no accounts, no shared servers, no data leaving your setup.
            fork the repo, set up Supabase + OpenAI, and you own the whole thing.
            zero Twitter API costs — the extension reads the same page you see in your browser.
          </p>
          <div className="mt-6 inline-flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-xs text-zinc-500">
            <span>Supabase (free)</span>
            <span className="text-zinc-700">+</span>
            <span>OpenAI (~$0.01/100 tweets)</span>
            <span className="text-zinc-700">=</span>
            <span className="text-[#1d9bf0]">that&apos;s it</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/50 py-8 text-center text-xs text-zinc-600">
        open source. MIT license.
      </div>
    </div>
  );
}
