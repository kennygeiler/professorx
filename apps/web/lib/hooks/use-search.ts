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

    // Always debounce — let the consumer decide the threshold
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay]);

  return { query, setQuery, debouncedQuery };
}
