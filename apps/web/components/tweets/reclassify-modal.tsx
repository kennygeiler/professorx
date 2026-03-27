"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

const SKIP_ALWAYS_KEY = "professorx_skip_explanations";

interface ReclassifyModalProps {
  tweetId: string;
  tweetText: string;
  currentCategoryId: string;
  currentCategoryName: string;
  onClose: () => void;
  onReclassified?: (newCategories: Array<{ id: string; name: string; color: string }>) => void;
}

export function ReclassifyModal({
  tweetId,
  tweetText,
  currentCategoryId,
  currentCategoryName,
  onClose,
  onReclassified,
}: ReclassifyModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<"pick" | "reason" | "success">("pick");
  const [reason, setReason] = useState("");
  const [skipAlways, setSkipAlways] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Load skip-always preference
  useEffect(() => {
    const stored = localStorage.getItem(SKIP_ALWAYS_KEY);
    if (stored === "true") setSkipAlways(true);
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

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) return prev.filter((c) => c.id !== cat.id);
      if (prev.length >= 2) return [prev[1], cat]; // Replace oldest
      return [...prev, cat];
    });
  };

  const confirmSelection = () => {
    if (selectedCategories.length === 0) return;
    const shouldSkip = localStorage.getItem(SKIP_ALWAYS_KEY) === "true";
    if (shouldSkip) {
      submitCorrection("");
    } else {
      setStep("reason");
    }
  };

  const submitCorrection = async (userReason: string) => {
    if (selectedCategories.length === 0) return;
    setSubmitting(true);
    try {
      // Submit correction for the first selected category
      const primary = selectedCategories[0];
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweetId,
          originalCategory: currentCategoryName,
          correctedCategoryId: primary.id,
          reason: userReason || undefined,
        }),
      });

      // If second category selected, add it too
      if (selectedCategories.length > 1) {
        const secondary = selectedCategories[1];
        await fetch("/api/corrections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweetId,
            originalCategory: currentCategoryName,
            correctedCategoryId: secondary.id,
            reason: userReason || undefined,
          }),
        });
      }

      if (res.ok) {
        setStep("success");
        onReclassified?.(selectedCategories.map((c) => ({ id: c.id, name: c.name, color: c.color })));
        setTimeout(handleClose, 800);
      }
    } catch {
      // Silently handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    submitCorrection("");
  };

  const handleSkipAlwaysChange = (checked: boolean) => {
    setSkipAlways(checked);
    localStorage.setItem(SKIP_ALWAYS_KEY, checked ? "true" : "false");
  };

  const otherCategories = categories.filter((c) => c.id !== currentCategoryId);
  const showSearch = otherCategories.length > 8;
  const filteredCategories = search
    ? otherCategories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : otherCategories;

  // Truncated tweet preview
  const previewText =
    tweetText.length > 120 ? tweetText.slice(0, 120) + "..." : tweetText;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl transition-all duration-200 sm:rounded-2xl ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 sm:translate-y-4"
        }`}
      >
        {/* Drag handle (mobile) */}
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-8 rounded-full bg-zinc-700" />
        </div>

        {step === "pick" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-zinc-100">
              Reclassify Tweet
            </h2>

            {/* Tweet preview */}
            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-xs leading-relaxed text-zinc-400">
                {previewText}
              </p>
            </div>

            <p className="mb-3 text-sm text-zinc-400">
              Currently in{" "}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${categories.find((c) => c.id === currentCategoryId)?.color ?? "#71717a"}20`,
                  color: categories.find((c) => c.id === currentCategoryId)?.color ?? "#71717a",
                }}
              >
                {currentCategoryName}
              </span>
              . Pick up to 2 categories:
            </p>

            {/* Search (for many categories) */}
            {showSearch && (
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
                autoFocus
              />
            )}

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-11 animate-pulse rounded-lg bg-zinc-800/50"
                  />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                {search ? "No matching categories" : "No other categories available."}
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.some((c) => c.id === cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                        isSelected ? "bg-zinc-800 ring-1 ring-zinc-600" : "hover:bg-zinc-800"
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
                      {isSelected && (
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={confirmSelection}
                disabled={selectedCategories.length === 0}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
              >
                Confirm{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === "reason" && selectedCategories.length > 0 && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-zinc-100">
              Why{" "}
              {selectedCategories.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && " & "}
                  <span style={{ color: c.color }}>{c.name}</span>
                </span>
              ))}
              ?
            </h2>
            <p className="mb-4 text-sm text-zinc-400">
              Help the AI learn from your correction (optional).
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., This is about investing, not general finance..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              autoFocus
            />

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="skip-always"
                checked={skipAlways}
                onChange={(e) => handleSkipAlwaysChange(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400"
              />
              <label htmlFor="skip-always" className="text-xs text-zinc-500">
                Don&apos;t ask for reasons next time
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => submitCorrection(reason)}
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
              <button
                onClick={() => {
                  setStep("pick");
                  setSelectedCategories([]);
                  setReason("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center py-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <svg
                className="h-6 w-6 text-emerald-400"
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
            </div>
            <p className="text-sm font-medium text-zinc-100">
              Moved to{" "}
              {selectedCategories.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && " & "}
                  <span style={{ color: c.color }}>{c.name}</span>
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              The AI will learn from this
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
