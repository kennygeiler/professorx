# ProfessorX — Research Synthesis

**6 topics investigated by 5 field agents. All findings validated (confidence >= 0.72).**

---

## Executive Summary

The research phase answered all 8 open questions from VISION.md. Three strategic decisions emerged:

1. **Lead with browser extension scraping, not API.** Twitter API costs $100/mo minimum — unviable for a free tool. Browser extensions run in the user's session with zero bot-detection risk and strong legal footing.
2. **Next.js 15 + Supabase + Vercel = $0/mo launch cost.** GPT-4o-mini categorizes 10K tweets for ~$0.12.
3. **Per-user AI memory via few-shot JSON corrections.** No fine-tuning, no embeddings infra. Effective from 10-20 user corrections, ~150KB per user.

---

## Topic 1: Twitter/X API Limitations (OQ-1)
**Agent:** sherlock | **Confidence:** 0.72 | **Priority:** HIGH

- Free tier is useless for likes/bookmarks reads
- Basic tier ($100/mo) is the minimum: 5 req/15min for liked tweets, 180 req/15min for bookmarks
- Bookmarks require OAuth 2.0 PKCE (no app-only tokens)
- Bookmarks hard-capped at ~800 items by Twitter
- Full sync of 10K likes on Basic takes ~5 hours
- **Decision:** API is cost-prohibitive. Browser scraping is the primary strategy.

## Topic 2: Client-Side Scraping + Legal (OQ-2 + OQ-8)
**Agent:** watson | **Confidence:** 0.82 | **Priority:** HIGH

- **Browser extension is the lowest-risk approach** — runs as user agent, no bot detection, DOM reading
- Playwright beats Puppeteer for headless fallback (better anti-detection defaults, multi-browser)
- Client-side execution is essential — never server-side (cost, credentials, legal risk)
- **Legal:** hiQ v. LinkedIn (9th Cir. 2022) + Van Buren v. SCOTUS (2021) establish that ToS violation != CFAA violation for personal data access
- GDPR Art. 20 provides EU data portability rights
- Twitter enforcement against personal tools: undocumented
- **Decision:** V1 = browser extension (sideloaded for friends-first). V2 = Chrome Web Store distribution.

## Topic 3: Tech Stack (OQ-5)
**Agent:** poirot | **Confidence:** 0.82 | **Priority:** HIGH

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) + TypeScript + Shadcn/ui | Largest ecosystem, Vercel zero-config, React component libs |
| Database | Supabase (PostgreSQL + pgvector) | Free tier (500MB), built-in auth, vector search, RLS |
| AI - Categorization | GPT-4o-mini ($0.15/1M in, $0.60/1M out) | ~$0.01 per 1K tweets |
| AI - Embeddings | text-embedding-3-small ($0.02/1M tokens) | 1536-dim vectors for pgvector semantic search |
| Hosting | Vercel Hobby (free) | Zero DevOps, global CDN, no cold starts |
| Auth | NextAuth.js v5 (Auth.js) + Twitter OAuth 2.0 | Built-in Twitter provider, Supabase adapter |
| Search V1 | PostgreSQL full-text search (tsvector/tsquery) | Sufficient for <100K tweets, instant at personal scale |
| Search V1.1 | Add pgvector semantic search | Hybrid BM25 + cosine similarity |

- **Total AI cost for 10K tweets:** ~$0.12
- **Monthly hosting cost at launch:** $0

## Topic 4: AI Memory Structure (OQ-6)
**Agent:** columbo | **Confidence:** 0.82 | **Priority:** MEDIUM

- **Few-shot JSON correction store** is the optimal approach
- Store: `{tweet_text, original_category, corrected_category, user_reason, timestamp}`
- Inject top 5-10 most relevant corrections into system prompt at categorization time
- Effective from 10-20 corrections; strong at 50-100 per category
- Storage: ~150KB per user at 200 corrections (trivial)
- No fine-tuning, no embeddings, no ML ops needed
- Extract `category_rules` from user explanations for token-efficient prompting
- Cap at 200 most recent corrections with timestamp-based decay
- Cold start: fall back to shared default prompt until 5+ corrections exist

## Topic 5: Category Label Thresholds + Live Search (OQ-3 + OQ-4)
**Agent:** scully | **Confidence:** 0.82 | **Priority:** MEDIUM

- **Max 7 category labels inline** before collapsing to "+ N more" (Miller's Law, Hick's Law)
- Frequency-sorted: show most-tweeted categories first
- **Live search trigger: 3 characters** with 200ms debounce (GitHub, Baymard Institute consensus)
- Author/handle search can trigger at 2 characters (shorter tokens)
- Category filter search at 1 character (small dataset)

## Topic 6: Fibonacci Time Slider (OQ-7)
**Agent:** scully | **Confidence:** 0.72 | **Priority:** LOW

- No established "Fibonacci time slider" pattern exists in UX literature
- Closest: TradingView range selector (1D/5D/1M/3M/6M/1Y/Max), Apple Time Machine
- Weber-Fechner Law supports non-linear time scales
- **Mobile recommendation: discrete chip row** (1d / 3d / 1w / 2w / 1m / 3m / 6m / 1y / All)
- Desktop: slider with snap-to-stop at Fibonacci breakpoints (noUiSlider or rc-slider)
- Fibonacci mapped to days: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 → 1d, 2d, 3d, 5d, 1w, 2w, 1m, 2m, 3m, 6m, 1y

---

## Open Risks

1. **Twitter API pricing may change** — research based on training data through mid-2025. Verify at developer.twitter.com before build.
2. **Browser extension sideloading UX** — acceptable for friends-first, but Chrome Web Store submission needed for broader distribution.
3. **Twitter ToS enforcement** — no documented enforcement against personal tools, but landscape could shift.
4. **GPT-4o-mini pricing** — verify current rates at platform.openai.com before finalizing budget.

---

## Architecture Inputs

These research findings should directly inform the architecture phase:

- **Primary data ingestion:** Browser extension reading DOM / intercepting XHR
- **Tech stack:** Next.js 15 + Supabase + Vercel + GPT-4o-mini + text-embedding-3-small
- **Search strategy:** PostgreSQL FTS first, add pgvector semantic search in V1.1
- **AI personalization:** Few-shot JSON correction store, injected at inference
- **UX constraints:** Max 7 inline labels, 3-char search trigger, discrete time chips on mobile
- **Auth:** NextAuth.js v5 with Twitter OAuth 2.0 PKCE
