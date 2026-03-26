# Architectural Decision Records -- ProfessorX

---

### ADR-001: Browser Extension as Primary Data Ingestion

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: Twitter API Basic tier costs $100/month minimum for likes/bookmarks access. ProfessorX is a free, donation-funded personal tool. Research confirmed API is cost-prohibitive (OQ-1).
- **Decision**: Use a Chrome browser extension (Manifest V3) as the primary and only data ingestion mechanism in V1. The extension intercepts Twitter's internal XHR responses while the user browses their likes/bookmarks pages, parses tweet data from the DOM/responses, and sends it to the backend.
- **Alternatives**: (a) Twitter API with developer absorbing $100/mo cost -- unsustainable. (b) Playwright/Puppeteer local script -- requires Node.js install, poor UX for non-technical users. (c) Electron app packaging Playwright -- 150MB+ install, overkill for V1.
- **Rationale**: Browser extensions run in the user's authenticated session with zero bot-detection risk. No server costs for scraping. Legal footing is strong (hiQ v. LinkedIn, Van Buren v. SCOTUS, GDPR Art. 20). Distribution via sideloading is acceptable for friends-first launch.
- **Consequences**: Users must install a Chrome extension (sideloaded in V1). Ingestion only happens when the user actively browses their likes/bookmarks on Twitter. No background/scheduled sync in V1. Chrome Web Store submission needed for V2 broader distribution.

---

### ADR-002: Next.js 15 + Supabase + Vercel Stack

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: Single developer needs a productive, zero-DevOps stack with free hosting, built-in auth, and database with full-text search + future vector search support (OQ-5).
- **Decision**: Next.js 15 (App Router) with TypeScript and Shadcn/ui, deployed on Vercel Hobby (free). Supabase (PostgreSQL + pgvector) for database, auth, and RLS. pnpm monorepo for web app + extension.
- **Alternatives**: (a) SvelteKit -- better raw performance and bundle size, but smaller ecosystem and fewer AI/UI component libraries. (b) Remix -- strong data loading patterns but no clear advantage here. (c) PlanetScale/MySQL -- lacks pgvector for semantic search. (d) SQLite/Turso -- ultra-cheap but no native vector search.
- **Rationale**: Next.js + Vercel is the lowest-friction deployment path. Supabase provides PostgreSQL, pgvector, auth, and RLS in one free service. React ecosystem has the most AI-related component libraries. TypeScript monorepo ensures type safety between extension and web app.
- **Consequences**: Locked into Vercel for zero-config deploys (can eject to any Node.js host if needed). Supabase free tier limits (500MB) are sufficient for personal use but will need paid upgrade at ~50K stored tweets.

---

### ADR-003: GPT-4o-mini for Categorization with Few-Shot Memory

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: AI must categorize tweets automatically with zero manual work. Must learn from user corrections over time. Single developer cannot maintain ML infrastructure (OQ-6).
- **Decision**: Use OpenAI GPT-4o-mini for tweet categorization. Per-user AI memory stored as JSONB in Supabase containing few-shot correction examples (max 200) and extracted category rules. Top 5-10 relevant corrections injected into system prompt at categorization time. Cold start uses a default prompt until 5+ corrections exist.
- **Alternatives**: (a) Fine-tuning -- requires hundreds of examples per class, expensive, slow to iterate. (b) Embeddings-based RAG for memory retrieval -- adds infrastructure complexity disproportionate for V1. (c) Claude Haiku 3.5 -- slightly more expensive, comparable quality.
- **Rationale**: Few-shot prompting is effective from 10-20 corrections with zero ML ops. Storage is trivial (~150KB per user at 200 corrections). GPT-4o-mini is the cheapest option at $0.15/1M input tokens. The approach is well-proven in LLM literature.
- **Consequences**: AI quality depends on prompt engineering. No offline/local inference -- requires internet for categorization. Cost scales linearly with tweet volume but remains negligible (~$0.01/1K tweets).

---

### ADR-004: PostgreSQL Full-Text Search in V1, pgvector in V1.1

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: Users need to search their tweet library by content, author, and category. The core pain point is "I liked a tweet about X and can't find it" (OQ-5).
- **Decision**: V1 uses PostgreSQL full-text search (tsvector/tsquery with GIN index) for keyword search across tweet text, author handles, and category names. V1.1 adds pgvector semantic search using text-embedding-3-small embeddings for "I know what I saved but can't remember the exact words" queries.
- **Alternatives**: (a) Algolia/Meilisearch -- external search service, adds cost and complexity. (b) pgvector from day one -- adds embedding generation to the ingestion pipeline before the core product is validated.
- **Rationale**: At personal scale (<100K tweets), PostgreSQL FTS with GIN indexes is instant. Shipping V1 without embeddings reduces scope. pgvector is already available in Supabase, so adding it later requires only an embedding column and generation pipeline.
- **Consequences**: V1 search is keyword-only (no semantic "similar meaning" matching). Users who search with different words than the tweet used may not find results. This is acceptable for V1; semantic search in V1.1 addresses it.

---

### ADR-005: Monorepo with Shared Types

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: The browser extension parses tweet data and sends it to the backend API. Type mismatches between the extension's output format and the API's expected input format would cause silent data loss or ingestion failures.
- **Decision**: Use a pnpm workspace monorepo with a `packages/shared` directory containing TypeScript types and zod schemas shared between the web app and extension. The tweet ingestion payload schema is defined once and used by both the extension (to serialize) and the API route (to validate).
- **Alternatives**: (a) Separate repos with npm-published shared package -- publishing overhead for a single developer. (b) Copy-paste types -- drift risk.
- **Rationale**: pnpm workspaces are zero-config for monorepos. Single developer benefits from everything in one repo. Zod schemas provide both runtime validation and TypeScript type inference.
- **Consequences**: Slightly more complex project setup (workspace config, tsconfig references). Worth it for type safety guarantees on the critical ingestion boundary.

---

### ADR-006: Discrete Time Chips Over Continuous Slider (Mobile)

- **Date**: 2026-03-25
- **Status**: accepted
- **Context**: VISION.md specifies a "Fibonacci-style time slider" for historical browsing. Research found no established pattern by that name but validated the non-linear time navigation concept (OQ-7).
- **Decision**: Implement time filtering as a horizontal scrollable chip row on mobile with discrete stops: 1d / 3d / 1w / 2w / 1m / 3m / 6m / 1y / All. These intervals roughly follow Fibonacci progression. Desktop may optionally use a stepped slider (rc-slider with snap points) in a future iteration.
- **Alternatives**: (a) Continuous slider with Fibonacci stops -- imprecise on mobile touchscreens. (b) Standard date picker -- too precise for the "about 3 months ago" use case. (c) TradingView-style range selector -- more complex than needed for V1.
- **Rationale**: Discrete chips are more thumb-friendly, simpler to implement, and align with the mobile-first design principle. The Fibonacci-esque intervals match how people mentally bucket time.
- **Consequences**: No precise date range selection in V1. Users who need "tweets from March 12-15" cannot do this. Acceptable for V1 -- most users think in relative time ("about a month ago").
