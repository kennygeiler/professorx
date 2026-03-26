"use client";

import { useState, useEffect, useCallback } from "react";
import { CategoryForm } from "./category-form";
import { MergeDialog } from "./merge-dialog";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

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

  const totalTweets = categories.reduce((sum, c) => sum + c.tweet_count, 0);

  const handleCreate = async (formData: { name: string; color: string }) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddForm(false);
        await fetchCategories();
        showToast(`Created "${formData.name}"`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (
    id: string,
    formData: { name: string; color: string }
  ) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...formData } : c))
    );
    setEditingId(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(`Updated "${formData.name}"`);
      } else {
        await fetchCategories();
      }
    } catch {
      await fetchCategories();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirmId(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Deleted "${cat?.name ?? "category"}"`);
      } else {
        await fetchCategories();
      }
    } catch {
      await fetchCategories();
    } finally {
      setActionLoading(false);
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    const source = categories.find((c) => c.id === sourceId);
    const target = categories.find((c) => c.id === targetId);
    setActionLoading(true);
    try {
      const res = await fetch("/api/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId }),
      });
      if (res.ok) {
        setShowMerge(false);
        await fetchCategories();
        showToast(
          `Merged "${source?.name}" into "${target?.name}"`
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Stats bar */}
      {categories.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              {categories.length} categories
            </span>
            <span className="text-zinc-500">
              {totalTweets} tweets categorized
            </span>
          </div>
          {/* Distribution bar */}
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
            {categories.map((cat) => {
              const pct = totalTweets > 0 ? (cat.tweet_count / totalTweets) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={cat.id}
                  className="transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: cat.color,
                    minWidth: pct > 0 ? "2px" : 0,
                  }}
                  title={`${cat.name}: ${cat.tweet_count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
        >
          + Add category
        </button>
        {categories.length >= 2 && (
          <button
            onClick={() => setShowMerge(true)}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
          >
            Merge categories
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            New Category
          </h3>
          <CategoryForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create"
            loading={actionLoading}
          />
        </div>
      )}

      {/* Category list */}
      {categories.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
            <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">No categories yet</p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            Categories are created automatically when you run AI categorization, or you can create them manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const pct = totalTweets > 0 ? (cat.tweet_count / totalTweets) * 100 : 0;

            return (
              <div key={cat.id}>
                {editingId === cat.id ? (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                    <CategoryForm
                      initialName={cat.name}
                      initialColor={cat.color}
                      onSubmit={(data) => handleUpdate(cat.id, data)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Update"
                      loading={actionLoading}
                    />
                  </div>
                ) : (
                  <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800/70">
                    {/* Percentage bar background */}
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: `${cat.color}08`,
                      }}
                    />

                    <div className="relative flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-zinc-800"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <span className="text-sm font-medium text-zinc-100">
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>
                              {cat.tweet_count} tweet{cat.tweet_count !== 1 ? "s" : ""}
                            </span>
                            {pct > 0 && (
                              <span className="text-zinc-600">
                                {Math.round(pct)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {deleteConfirmId === cat.id ? (
                          <>
                            <span className="mr-2 text-xs text-red-400">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setShowAddForm(false);
                              }}
                              className="rounded-lg p-2 text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cat.id)}
                              className="rounded-lg p-2 text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Merge dialog */}
      {showMerge && (
        <MergeDialog
          categories={categories}
          onMerge={handleMerge}
          onClose={() => setShowMerge(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
