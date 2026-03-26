# professorX - Todo

## 2026-03-26 — V1 Fixes

- [x] Fix AI categorization timeout (reduce batch from 100 to 30 tweets per API call)
- [x] Fix client-side loop break condition (stop when 0 categorized, not < 100)
- [x] Always show categorize button (alongside category chips, with remaining count)
- [x] Add `/api/categorize/remaining` endpoint for initial uncategorized count
- [x] Add sync button to header (with paginated client-side loop)
- [x] Update category `tweet_count` after AI categorization
- [x] Verify media rendering code (correct — re-sync will populate media data)
- [ ] Test on Vercel: categorization completes within timeout
- [ ] Test on Vercel: category chips appear with correct counts
- [ ] Test on Vercel: sync button fetches new tweets
- [ ] Test on Vercel: media renders on re-synced tweets
