"use client";

import { useState, useEffect, useRef } from "react";

export function useSearch(delay = 200) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Only debounce if query is 3+ chars or empty (to clear results)
    if (query.length >= 3 || query.length === 0) {
      timerRef.current = setTimeout(() => {
        setDebouncedQuery(query);
      }, delay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay]);

  return { query, setQuery, debouncedQuery };
}
