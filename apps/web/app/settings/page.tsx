"use client";

import { useState } from "react";
import Link from "next/link";
import { AboutSection } from "@/components/layout/about-section";

function Toggle({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          enabled ? "bg-amber-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-zinc-900 p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [likesSync, setLikesSync] = useState(true);
  const [bookmarksSync, setBookmarksSync] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCopyToken = async () => {
    try {
      const res = await fetch("/api/auth/extension-token");
      if (!res.ok) throw new Error("Failed to get token");
      const { token } = await res.json();
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      alert("Failed to generate token. Make sure you're logged in.");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
      </div>

      <SettingsSection title="Data Sources">
        <Toggle
          enabled={likesSync}
          onToggle={() => setLikesSync(!likesSync)}
          label="Likes Sync"
          description="Automatically sync your Twitter likes"
        />
        <Toggle
          enabled={bookmarksSync}
          onToggle={() => setBookmarksSync(!bookmarksSync)}
          label="Bookmarks Sync"
          description="Automatically sync your Twitter bookmarks"
        />
      </SettingsSection>

      <SettingsSection title="Extension">
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-zinc-300">Extension connected</span>
          </div>
          <button
            onClick={handleCopyToken}
            className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
          >
            {tokenCopied ? "Copied!" : "Copy Extension Token"}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Categories">
        <Link
          href="/settings/categories"
          className="flex items-center justify-between py-3 text-sm text-zinc-300 transition-colors hover:text-zinc-100"
        >
          <span>Manage Categories</span>
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
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </SettingsSection>

      <SettingsSection title="About">
        <div className="py-2">
          <AboutSection />
        </div>
      </SettingsSection>
    </div>
  );
}
