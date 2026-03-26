"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "./search-bar";
import { CategoryChips } from "./category-chips";
import { TimeChips } from "./time-chips";
import { useFilters } from "@/lib/hooks/use-filters";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

export function FilterBar() {
  const {
    filters,
    query,
    setQuery,
    setCategory,
    setTimeRange,
    clearAll,
    hasActiveFilters,
  } = useFilters();

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data.categories ?? []);
      } catch {
        // Silently fail
      }
    }
    fetchCategories();
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 pb-4 pt-2 backdrop-blur">
      <div className="flex flex-col gap-3">
        <SearchBar value={query} onChange={setQuery} />

        <CategoryChips
          categories={categories}
          selected={filters.category}
          onSelect={setCategory}
        />

        <div className="flex items-center justify-between gap-3">
          <TimeChips selected={filters.timeRange} onSelect={setTimeRange} />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
