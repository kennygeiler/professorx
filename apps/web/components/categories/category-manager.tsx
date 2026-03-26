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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {
      // Silently handle fetch failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (
    id: string,
    formData: { name: string; color: string }
  ) => {
    // Optimistic update
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
      if (!res.ok) {
        // Revert on failure
        await fetchCategories();
      }
    } catch {
      await fetchCategories();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirmId(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        await fetchCategories();
      }
    } catch {
      await fetchCategories();
    } finally {
      setActionLoading(false);
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
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
            className="h-14 animate-pulse rounded-lg bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
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
        <p className="py-8 text-center text-sm text-zinc-500">
          No categories yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
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
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800/70">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-zinc-100">
                        {cat.name}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {cat.tweet_count} tweet
                        {cat.tweet_count !== 1 ? "s" : ""}
                      </span>
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
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          title="Edit"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cat.id)}
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                          title="Delete"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
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
