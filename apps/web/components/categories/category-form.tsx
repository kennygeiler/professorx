"use client";

import { useState } from "react";

const PRESET_COLORS = [
  { name: "Zinc", value: "#71717a" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#f43f5e" },
];

interface CategoryFormProps {
  initialName?: string;
  initialColor?: string;
  onSubmit: (data: { name: string; color: string }) => void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export function CategoryForm({
  initialName = "",
  initialColor = PRESET_COLORS[0].value,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  loading = false,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, color });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Live preview chip */}
      {name.trim() && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Preview:</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`,
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {name.trim()}
          </span>
        </div>
      )}

      <div>
        <label
          htmlFor="category-name"
          className="mb-1 block text-sm font-medium text-zinc-300"
        >
          Name
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Tech, Politics, Memes..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          autoFocus
          required
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-300">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setColor(preset.value)}
              className={`relative h-8 w-8 rounded-full transition-all ${
                color === preset.value
                  ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            >
              {color === preset.value && (
                <svg
                  className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
