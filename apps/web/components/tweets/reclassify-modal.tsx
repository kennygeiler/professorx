"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

const SKIP_ALWAYS_KEY = "professorx_skip_explanations";

interface ReclassifyModalProps {
  tweetId: string;
  currentCategoryId: string;
  currentCategoryName: string;
  onClose: () => void;
  onReclassified?: () => void;
}

export function ReclassifyModal({
  tweetId,
  currentCategoryId,
  currentCategoryName,
  onClose,
  onReclassified,
}: ReclassifyModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "reason">("pick");
  const [reason, setReason] = useState("");
  const [skipAlways, setSkipAlways] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SKIP_ALWAYS_KEY);
    if (stored === "true") {
      setSkipAlways(true);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSelectCategory = (catId: string) => {
    setSelectedId(catId);
    const shouldSkip = localStorage.getItem(SKIP_ALWAYS_KEY) === "true";
    if (shouldSkip) {
      submitCorrection(catId, "");
    } else {
      setStep("reason");
    }
  };

  const submitCorrection = async (catId: string, userReason: string) => {
    setSubmitting(true);
    try {
      await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweetId,
          originalCategory: currentCategoryName,
          correctedCategoryId: catId,
          reason: userReason || undefined,
        }),
      });
      onReclassified?.();
      onClose();
    } catch {
      // Silently handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (selectedId) {
      submitCorrection(selectedId, "");
    }
  };

  const handleSkipAlwaysChange = (checked: boolean) => {
    setSkipAlways(checked);
    localStorage.setItem(SKIP_ALWAYS_KEY, checked ? "true" : "false");
  };

  const handleSubmitReason = () => {
    if (selectedId) {
      submitCorrection(selectedId, reason);
    }
  };

  const otherCategories = categories.filter(
    (c) => c.id !== currentCategoryId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:rounded-xl">
        {step === "pick" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-zinc-100">
              Reclassify Tweet
            </h2>
            <p className="mb-4 text-sm text-zinc-400">
              Currently in{" "}
              <span className="font-medium text-zinc-300">
                {currentCategoryName}
              </span>
              . Pick a new category:
            </p>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-zinc-800/50"
                  />
                ))}
              </div>
            ) : otherCategories.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                No other categories available.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {otherCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium text-zinc-100">
                      {cat.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {cat.tweet_count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === "reason" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-zinc-100">
              Why this category?
            </h2>
            <p className="mb-4 text-sm text-zinc-400">
              Help the AI learn from your correction (optional).
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., This is about investing, not general finance..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              autoFocus
            />

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="skip-always"
                checked={skipAlways}
                onChange={(e) => handleSkipAlwaysChange(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-zinc-100"
              />
              <label
                htmlFor="skip-always"
                className="text-xs text-zinc-500"
              >
                Skip always (don&apos;t ask for reasons)
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSubmitReason}
                disabled={submitting}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Submit"}
              </button>
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
