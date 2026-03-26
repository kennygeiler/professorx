"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

interface MergeDialogProps {
  categories: Category[];
  onMerge: (sourceId: string, targetId: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function MergeDialog({
  categories,
  onMerge,
  onClose,
  loading = false,
}: MergeDialogProps) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const sourceCategory = categories.find((c) => c.id === sourceId);
  const targetCategory = categories.find((c) => c.id === targetId);

  const canMerge = sourceId && targetId && sourceId !== targetId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Merge Categories
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          All tweets from the source category will be moved to the target. The
          source category will be deleted.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Source (will be deleted)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              <option value="">Select category...</option>
              {categories
                .filter((c) => c.id !== targetId)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.tweet_count} tweets)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-center">
            <svg
              className="h-5 w-5 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Target (will receive tweets)
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              <option value="">Select category...</option>
              {categories
                .filter((c) => c.id !== sourceId)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.tweet_count} tweets)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {canMerge && sourceCategory && targetCategory && (
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">
              {sourceCategory.tweet_count}
            </span>{" "}
            tweet{sourceCategory.tweet_count !== 1 ? "s" : ""} will be moved
            from{" "}
            <span className="font-medium" style={{ color: sourceCategory.color }}>
              {sourceCategory.name}
            </span>{" "}
            to{" "}
            <span className="font-medium" style={{ color: targetCategory.color }}>
              {targetCategory.name}
            </span>
            .
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              if (canMerge) onMerge(sourceId, targetId);
            }}
            disabled={!canMerge || loading}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
          >
            {loading ? "Merging..." : "Merge"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
