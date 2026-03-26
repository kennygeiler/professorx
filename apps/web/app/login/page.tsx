"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            ProfessorX
          </h1>
          <p className="text-sm text-zinc-400">
            Your Twitter likes, organized and searchable.
          </p>
        </div>

        <button
          onClick={() => signIn("twitter", { callbackUrl: "/" })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 active:bg-zinc-300"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X
        </button>

        <p className="text-xs text-zinc-500">
          Free to use. We only read your likes and bookmarks.
        </p>
      </div>
    </div>
  );
}
