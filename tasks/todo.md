# professorX - Todo

## 2026-03-26 — V1 Fixes (batch 1)

- [x] Fix AI categorization timeout (reduce batch from 100 to 30 tweets per API call)
- [x] Fix client-side loop break condition (stop when 0 categorized, not < 100)
- [x] Always show categorize button (alongside category chips, with remaining count)
- [x] Add `/api/categorize/remaining` endpoint for initial uncategorized count
- [x] Add sync button to header (with paginated client-side loop)
- [x] Update category `tweet_count` after AI categorization
- [x] Verify media rendering code (correct — re-sync will populate media data)

## 2026-03-26 — Reclassify + Category Management UX Polish (batch 2)

- [x] Wire reclassify modal into TweetCard (tap category badge to open)
- [x] Polish reclassify modal: tweet preview, slide-up animation, success state, search, back button
- [x] Propagate reclassification back to tweet list (optimistic badge update)
- [x] Add "manage categories" link next to category chips in library view
- [x] Category manager: distribution bar, percentage per category, action toasts, reveal-on-hover controls
- [x] Category form: live chip preview, 12 color presets, checkmark on selected color
- [x] Merge dialog: colored badges, slide-up animation, Escape to close, combined count preview
- [x] Delete unused category-badge.tsx component
- [x] TypeScript + Next.js build passes clean

## Testing needed

- [ ] Tap category badge on tweet → reclassify modal opens
- [ ] Pick new category → why prompt → submit → badge updates in-place
- [ ] Skip/skip-always works
- [ ] /settings/categories loads with distribution bar and percentages
- [ ] Create, edit, delete, merge categories all work
- [ ] Toasts appear after actions
