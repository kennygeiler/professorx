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
          placeholder="Category name"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
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
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                color === preset.value
                  ? "scale-110 border-white"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
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
