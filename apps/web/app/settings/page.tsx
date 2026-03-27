"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AboutSection } from "@/components/layout/about-section";

function Toggle({
  enabled,
  onToggle,
  label,
  description,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
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

interface Settings {
  sync_likes: boolean;
  sync_bookmarks: boolean;
  skip_explanations: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    sync_likes: true,
    sync_bookmarks: false,
    skip_explanations: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/config/api-key")
      .then((r) => r.json())
      .then((d) => setApiKey(d.apiKey ?? ""))
      .catch(() => {});
  }, []);

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Revert on failure
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />
            ))}
          </div>
        ) : (
          <>
            <SettingsSection title="Data Sources">
              <Toggle
                enabled={settings.sync_likes}
                onToggle={() => updateSetting("sync_likes", !settings.sync_likes)}
                label="Likes Sync"
                description="Sync your Twitter likes when you hit the refresh button"
                disabled={saving}
              />
              <Toggle
                enabled={settings.sync_bookmarks}
                onToggle={() => updateSetting("sync_bookmarks", !settings.sync_bookmarks)}
                label="Bookmarks Sync"
                description="Also sync your Twitter bookmarks"
                disabled={saving}
              />
            </SettingsSection>

            <SettingsSection title="AI Behavior">
              <Toggle
                enabled={settings.skip_explanations}
                onToggle={() => updateSetting("skip_explanations", !settings.skip_explanations)}
                label="Skip Reclassify Explanations"
                description="Don't ask why when you reclassify a tweet"
                disabled={saving}
              />
            </SettingsSection>

            <SettingsSection title="Chrome Extension">
              <div className="space-y-3 py-2">
                <p className="text-xs text-zinc-500">
                  Paste this API key into the Chrome extension popup to connect.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 font-mono text-xs text-zinc-300 outline-none"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
                      title={showKey ? "Hide" : "Reveal"}
                    >
                      {showKey ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(apiKey);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2000);
                    }}
                    className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    {keyCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                {!apiKey && (
                  <p className="text-xs text-amber-400">
                    No API_KEY set in .env.local. Add one with: openssl rand -hex 32
                  </p>
                )}
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
          </>
        )}
      </div>
    </div>
  );
}
