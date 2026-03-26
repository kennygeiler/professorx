"use client";

import { useState, useEffect } from "react";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const sourceCategory = categories.find((c) => c.id === sourceId);
  const targetCategory = categories.find((c) => c.id === targetId);
  const canMerge = sourceId && targetId && sourceId !== targetId;

  const CategoryOption = ({ cat, type }: { cat: Category; type: "source" | "target" }) => (
    <button
      type="button"
      onClick={() => type === "source" ? setSourceId(cat.id) : setTargetId(cat.id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
        (type === "source" ? sourceId : targetId) === cat.id
          ? "bg-zinc-800 ring-1 ring-zinc-600"
          : "hover:bg-zinc-800/50"
      }`}
    >
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: cat.color }}
      />
      <span className="flex-1 text-sm font-medium text-zinc-100">
        {cat.name}
      </span>
      <span className="text-xs tabular-nums text-zinc-500">
        {cat.tweet_count}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl transition-all duration-200 sm:rounded-2xl ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 sm:translate-y-4"
        }`}
      >
        {/* Mobile drag handle */}
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-8 rounded-full bg-zinc-700" />
        </div>

        <h2 className="mb-1 text-lg font-semibold text-zinc-100">
          Merge Categories
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          All tweets from the source will be moved to the target.
          The source category will be deleted.
        </p>

        <div className="space-y-4">
          {/* Source */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Source (will be deleted)
            </label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-1.5">
              {categories
                .filter((c) => c.id !== targetId)
                .map((cat) => (
                  <CategoryOption key={cat.id} cat={cat} type="source" />
                ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <svg
                className="h-4 w-4 text-zinc-400"
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
          </div>

          {/* Target */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Target (receives tweets)
            </label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-1.5">
              {categories
                .filter((c) => c.id !== sourceId)
                .map((cat) => (
                  <CategoryOption key={cat.id} cat={cat} type="target" />
                ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {canMerge && sourceCategory && targetCategory && (
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium line-through opacity-60"
                style={{
                  backgroundColor: `${sourceCategory.color}20`,
                  color: sourceCategory.color,
                }}
              >
                {sourceCategory.name}
              </span>
              <svg className="h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${targetCategory.color}20`,
                  color: targetCategory.color,
                }}
              >
                {targetCategory.name}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {sourceCategory.tweet_count} tweet{sourceCategory.tweet_count !== 1 ? "s" : ""} will be moved.
              Result: {sourceCategory.tweet_count + targetCategory.tweet_count} total in{" "}
              <span style={{ color: targetCategory.color }}>{targetCategory.name}</span>.
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
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
            onClick={handleClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
