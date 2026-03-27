"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#1d9bf0]" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            ItoldYouIwouldReadthisLater
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Your Twitter likes and bookmarks, organized and searchable with AI.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2 text-left">
          {[
            "AI auto-categorizes your saved tweets",
            "Search by keyword, category, or media type",
            "Bookmark and like sync",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-3 py-2.5">
              <svg className="h-4 w-4 shrink-0 text-[#1d9bf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm text-silver-300 text-zinc-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <button
          onClick={() => signIn("twitter", { callbackUrl: "/" })}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1d9bf0] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a8cd8] active:bg-[#1580c4]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X
        </button>

        <p className="text-xs text-zinc-600">
          Free to use. We only read your likes and bookmarks. No posting.
        </p>
      </div>
    </div>
  );
}
