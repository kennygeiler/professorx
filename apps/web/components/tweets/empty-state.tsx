"use client";

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#1d9bf0]" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-zinc-100">No tweets yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        Use the Chrome extension to sync your Twitter likes and bookmarks. No API costs.
      </p>

      <div className="mt-6 w-full max-w-xs space-y-3">
        {/* Steps */}
        <div className="space-y-2 text-left">
          {[
            { step: "1", text: "Install the Chrome extension (load unpacked from apps/extension)" },
            { step: "2", text: "Enter your @handle + API_KEY from .env in the extension popup" },
            { step: "3", text: "Click \"Sync Likes & Bookmarks\" — it scrolls automatically" },
            { step: "4", text: "Come back here and click Categorize" },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-3 py-2.5"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d9bf0]/15 text-[10px] font-bold text-[#1d9bf0]">
                {item.step}
              </span>
              <span className="text-sm text-zinc-300">{item.text}</span>
            </div>
          ))}
        </div>

        <a
          href="/settings"
          className="mt-2 block w-full rounded-xl bg-[#1d9bf0] px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
        >
          Go to Settings
        </a>

        <p className="text-[11px] text-zinc-600">
          The extension opens your Twitter in a tab and scrolls through your likes automatically. Zero API costs.
        </p>
      </div>
    </div>
  );
}
