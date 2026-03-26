"use client";

import type { TimeRange } from "@/lib/hooks/use-filters";

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "All", value: "all" },
  { label: "1d", value: "1d" },
  { label: "3d", value: "3d" },
  { label: "1w", value: "1w" },
  { label: "2w", value: "2w" },
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "6m", value: "6m" },
  { label: "1y", value: "1y" },
];

interface TimeChipsProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeChips({ selected, onSelect }: TimeChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      {TIME_OPTIONS.map((option) => {
        const isActive = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
