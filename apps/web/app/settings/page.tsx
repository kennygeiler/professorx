"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
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
