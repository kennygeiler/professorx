"use client";

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
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(isActive ? null : cat.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
            style={
              isActive
                ? {
                    backgroundColor: `${cat.color}30`,
                    color: cat.color,
                    border: `1px solid ${cat.color}50`,
                  }
                : {
                    backgroundColor: `${cat.color}10`,
                    color: "#a1a1aa",
                    border: `1px solid ${cat.color}15`,
                  }
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
    </div>
  );
}
