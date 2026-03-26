"use client";

type TimeRange = "all" | "1d" | "3d" | "1w" | "2w" | "1m" | "2m" | "3m" | "6m" | "1y";

const STOPS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1d", label: "1d" },
  { value: "3d", label: "3d" },
  { value: "1w", label: "1w" },
  { value: "2w", label: "2w" },
  { value: "1m", label: "1m" },
  { value: "2m", label: "2m" },
  { value: "3m", label: "3m" },
  { value: "6m", label: "6m" },
  { value: "1y", label: "1y" },
];

interface TimeSliderProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeSlider({ selected, onSelect }: TimeSliderProps) {
  const currentIndex = STOPS.findIndex((s) => s.value === selected);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    onSelect(STOPS[idx].value);
  };

  return (
    <div className="w-full">
      {/* Label row */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {activeIndex === 0 ? "Showing all tweets" : `Showing from ${STOPS[activeIndex].label} ago`}
        </span>
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
          {STOPS[activeIndex].label}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={STOPS.length - 1}
          step={1}
          value={activeIndex}
          onChange={handleChange}
          className="time-slider w-full cursor-pointer"
        />

        {/* Tick labels */}
        <div className="mt-1 flex justify-between px-[2px]">
          {STOPS.map((stop, i) => (
            <span
              key={stop.value}
              className={`text-[8px] ${
                i === activeIndex ? "font-medium text-zinc-300" : "text-zinc-600"
              }`}
            >
              {i === 0 || i === STOPS.length - 1 || i === activeIndex
                ? stop.label
                : "·"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
