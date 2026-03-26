# Fibonacci Time Slider UX

## Finding

### Is There an Established "Fibonacci Time Slider" Pattern?

There is no established UX pattern called a "Fibonacci time slider" in mainstream literature or design systems. The term does not appear in Nielsen Norman Group, Material Design, Apple HIG, or major design systems documentation. However, the underlying concept — a **non-linear time navigation slider** where the scale compresses recent time and expands historical time — is a real and validated approach, and multiple implementations exist under different names.

The closest established patterns are:

**1. Logarithmic/Non-linear sliders** — used in audio engineering (volume knobs, frequency sliders), scientific visualization tools, and financial charting. The principle is that human perception of quantity is logarithmic (Weber-Fechner Law), so a logarithmic scale feels more natural than a linear one for spanning orders of magnitude. Applied to time: the difference between "1 day ago" and "2 days ago" is perceptually large, while the difference between "364 days ago" and "365 days ago" is negligible. A non-linear slider honors this.

**2. GitHub's contribution graph time axis** — GitHub's contribution heatmap uses uniform spacing but the insight is similar: recent activity is more salient. Some third-party GitHub timeline tools use exponential bucketing.

**3. macOS Time Machine** — Apple's Time Machine uses a spatial metaphor (windows receding into the past) but the key insight is directly relevant: backup snapshots become less granular as they get older (hourly for 24h, daily for a month, weekly beyond that). This is a Fibonacci-like cadence in that recent time has fine granularity and distant time has coarse granularity.

**4. Financial chart zoom controls** — Bloomberg Terminal, TradingView, and most financial charting tools use preset non-linear time ranges: 1D, 5D, 1M, 3M, 6M, 1Y, 2Y, 5Y, Max. These are roughly Fibonacci/exponential in their spacing. TradingView's range selector is the most widely-used implementation of this concept in a consumer product.

**5. Wayback Machine / Internet Archive** — the calendar interface for archived snapshots naturally becomes coarser as you go back in time, since there are fewer snapshots. This is a practical, data-density-driven implementation of the same principle.

### What Would a Fibonacci Time Slider Mean for ProfessorX?

The VISION.md describes it as: "dynamic labels (Today, This Week, This Month, etc.) plus a Fibonacci-style time slider for deeper historical browsing." The intent is clear: a slider where the positions map to non-linear time intervals. A Fibonacci mapping would place slider stops at intervals proportional to Fibonacci numbers — 1 day, 1 day, 2 days, 3 days, 5 days, 8 days, 13 days, 21 days, 1 month, 2 months, 3 months, 5 months, 8 months, ~1 year, ~1.5 years, ~2.5 years. This creates natural "resting points" that align with how people mentally bucket time ("about a month ago," "about 3 months ago," "like a year ago").

The key UX challenge with a non-linear slider is **labeling** — the user needs to understand where they are on the scale. Best practice from financial charting (TradingView): show the current selected range as a label above the slider thumb (e.g., "3 months ago to now"). Avoid tick marks at every position; instead, show major labels at meaningful breakpoints.

### Mobile Considerations

On mobile, sliders are notoriously imprecise with thumbs. For a Fibonacci/non-linear slider, the snap-to-stop behavior is critical — each Fibonacci interval should be a discrete snap point, not a continuous range. This transforms it from a precise slider into a stepped selector, which is more thumb-friendly. This is how Apple's Timer duration picker works (discrete increments), and how Spotify's podcast speed selector works (0.5x, 0.8x, 1x, 1.2x, 1.5x, 2x — non-linear and discrete).

An alternative UI that may be more mobile-friendly: a **horizontal scrollable chip row** with the Fibonacci time buckets as tappable chips. "1d / 3d / 1w / 2w / 1m / 3m / 6m / 1y / All." This is simpler to implement, more accessible, and more thumb-friendly than a custom slider. The slider metaphor is more appropriate for desktop.

### Reference Implementations

- **TradingView** time range selector: closest consumer-facing implementation of non-linear time navigation
- **Apple Time Machine**: non-linear granularity (hourly/daily/weekly) as you go back
- **Podcast playback speed selectors**: non-linear discrete steps (Overcast, Pocket Casts, Spotify)
- **noUiSlider** (JavaScript library): supports non-linear/logarithmic range configuration — could implement Fibonacci stops
- **rc-slider** (React): supports marks at custom positions — could implement named Fibonacci stops

## Recommendation

Implement the Fibonacci time concept as a **discrete stepped chip row on mobile** (e.g., "1d / 3d / 1w / 2w / 1m / 3m / 6m / 1y / All") rather than a traditional continuous slider, since mobile thumb precision makes continuous sliders frustrating. On desktop, a slider with snap-to-stop behavior using noUiSlider or rc-slider with custom Fibonacci breakpoints is viable. Label each stop with a plain-language label (e.g., "3 months ago") displayed dynamically above the thumb.

## Key Facts

- No established pattern called "Fibonacci time slider" exists in published UX literature
- The concept maps to: non-linear time scale, logarithmic slider, or stepped non-linear selector
- Weber-Fechner Law supports non-linear time scales: human perception of magnitude is logarithmic
- Apple Time Machine uses equivalent logic: hourly (recent) → daily → weekly (historical)
- TradingView range selector (1D/5D/1M/3M/6M/1Y/Max) is the most widely-deployed consumer implementation
- Fibonacci sequence applied to days: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 → maps naturally to: 1d, 2d, 3d, 5d, 1w, 2w, 1m, 2m, 3m, 6m, 1y
- noUiSlider (JS) and rc-slider (React) both support non-linear/stepped range configurations
- Mobile recommendation: discrete chip row is more thumb-friendly than a continuous slider
- No academic research papers specifically on "Fibonacci time sliders" found in UX literature

## Sources

- Miller, G.A. and Weber-Fechner Law — perceptual basis for non-linear scales (training data)
- Apple Time Machine UX (released 2007, macOS) — non-linear granularity by temporal distance
- TradingView time range selector — observed consumer implementation (training data)
- noUiSlider documentation — non-linear range support (training data, last verified ~2024)
- rc-slider React library — custom marks/steps (training data)
- VISION.md (project file) — context for the intended feature
- Note: Direct web fetching was blocked during this research session; findings are drawn from established UX patterns within training data (cutoff August 2025)

## Confidence

0.72 — The non-existence of a named "Fibonacci time slider" pattern is well-supported (absence of evidence across major design systems). The analogous patterns (TradingView, Time Machine, logarithmic sliders) are well-documented in training data. The Fibonacci mapping to time intervals is novel/project-specific reasoning rather than established research, so the specific implementation recommendation carries more uncertainty. Confidence would increase with live verification of current noUiSlider/rc-slider non-linear API docs.
