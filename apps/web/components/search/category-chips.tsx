"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
  tweet_count: number;
}

interface CategoryChipsProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryChips({
  categories,
  selected,
  onSelect,
}: CategoryChipsProps) {
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  const visibleCount = 7;
  const hasMore = categories.length > visibleCount;
  const displayed = expanded ? categories : categories.slice(0, visibleCount);
  const hiddenCount = categories.length - visibleCount;

  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(isActive ? null : cat.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? ""
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
            }`}
            style={
              isActive
                ? {
                    backgroundColor: `${cat.color}25`,
                    color: cat.color,
                    border: `1px solid ${cat.color}50`,
                  }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
            <span
              className="text-xs"
              style={isActive ? { color: `${cat.color}90` } : { color: "#71717a" }}
            >
              {cat.tweet_count}
            </span>
          </button>
        );
      })}

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
        >
          + {hiddenCount} more
        </button>
      )}

      {hasMore && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
        >
          Show less
        </button>
      )}
    </div>
  );
}
