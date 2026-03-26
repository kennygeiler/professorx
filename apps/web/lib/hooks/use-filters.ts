"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch } from "./use-search";

export type TimeRange =
  | "1d"
  | "3d"
  | "1w"
  | "2w"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "all";

export interface Filters {
  query: string;
  category: string | null;
  timeRange: TimeRange;
}

export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { query, setQuery, debouncedQuery } = useSearch(200);

  const category = searchParams.get("category") ?? null;
  const timeRange = (searchParams.get("timeRange") as TimeRange) ?? "all";

  const filters: Filters = useMemo(
    () => ({
      query: debouncedQuery,
      category,
      timeRange,
    }),
    [debouncedQuery, category, timeRange]
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const setCategory = useCallback(
    (id: string | null) => {
      updateParams({ category: id });
    },
    [updateParams]
  );

  const setTimeRange = useCallback(
    (range: TimeRange) => {
      updateParams({ timeRange: range === "all" ? null : range });
    },
    [updateParams]
  );

  const clearAll = useCallback(() => {
    setQuery("");
    router.push("/", { scroll: false });
  }, [setQuery, router]);

  const hasActiveFilters =
    debouncedQuery.length > 0 || category !== null || timeRange !== "all";

  return {
    filters,
    query,
    setQuery,
    setCategory,
    setTimeRange,
    clearAll,
    hasActiveFilters,
  };
}
