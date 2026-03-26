# Tech Stack Choice for ProfessorX

## Finding

### 1. Framework: Next.js 15 (App Router)

For a single-developer, mobile-first web app with AI integration, **Next.js 15 with the App Router** is the strongest choice. It offers server-side rendering, API routes (eliminating a separate backend), React Server Components for fast initial load, and the largest ecosystem of any JS framework. SvelteKit is genuinely compelling — smaller bundle sizes (~10KB runtime vs React's ~130KB), cleaner syntax, and excellent mobile performance. However, Next.js wins for ProfessorX because: (a) the React ecosystem has far more AI/UI component libraries, (b) Vercel's free tier is purpose-built for Next.js with zero-config deploys, (c) Kenny likely already knows React, (d) the Shadcn/ui component library provides production-quality mobile-first components out of the box. Remix is a strong alternative for data-heavy apps but adds complexity without clear benefit here. SvelteKit remains a valid choice if Kenny prefers it — the DX is excellent.

**Framework verdict: Next.js 15 (App Router) with TypeScript and Shadcn/ui.**

### 2. Database: PostgreSQL via Supabase (free tier)

For storing tweets + categorization data + supporting semantic search, **Supabase (hosted PostgreSQL + pgvector)** is the best single-database solution for this use case. It provides: (a) PostgreSQL full-text search via `tsvector`/`tsquery` — no separate search service needed at small scale, (b) `pgvector` extension for vector embeddings enabling semantic search, (c) built-in auth with Twitter OAuth support, (d) row-level security for per-user data isolation, (e) a generous free tier (500MB database, 50,000 monthly active users, 5GB bandwidth). The schema for ProfessorX is straightforward: a `tweets` table with text content + embedding column, a `categories` table, a `user_categorizations` join table, and a `user_ai_memory` JSONB column per user. SQLite (via Turso/libSQL) is a valid alternative for ultra-cheap hosting but lacks native vector search. PlanetScale (MySQL) lacks pgvector. Supabase PostgreSQL + pgvector covers all use cases in one service.

**Database verdict: Supabase (PostgreSQL + pgvector).**

### 3. AI Integration: OpenAI GPT-4o-mini for Categorization, text-embedding-3-small for Embeddings

**Categorization:** OpenAI `gpt-4o-mini` is the best cost/performance tradeoff for tweet categorization. At $0.15/1M input tokens and $0.60/1M output tokens (as of mid-2025), categorizing a tweet (average ~280 characters ≈ ~70 tokens) costs approximately $0.00001 per tweet. For 10,000 tweets, total AI categorization cost is ~$0.10. Even at 100,000 tweets, cost is ~$1.00. This is negligible. The prompt structure should include the user's existing categories + the tweet text, returning a JSON category assignment. Anthropic Claude Haiku 3.5 ($0.80/$4.00 per 1M in/out) is slightly more expensive but comparable in quality. GPT-4o-mini is cheaper and well-tested for classification tasks.

**Semantic Search Embeddings:** OpenAI `text-embedding-3-small` at $0.02/1M tokens is the correct choice. Each tweet embedding costs ~$0.0000014. Storing 10,000 tweet embeddings = ~$0.014 total. The 1536-dimension vectors from text-embedding-3-small work excellently with pgvector cosine similarity search. Alternatives: Cohere embed-v3 ($0.10/1M), Voyage AI — both more expensive with no meaningful quality advantage for tweet-length text.

**AI verdict: GPT-4o-mini for categorization + text-embedding-3-small for semantic embeddings. Total AI cost for 10K tweets: ~$0.12.**

### 4. Hosting: Vercel (Hobby tier) + Supabase (free tier)

**Vercel Hobby** is the correct hosting choice for this project. It is free for personal projects, has zero-config Next.js deployment, automatic preview deployments, global CDN, serverless functions, and edge runtime support. Limits: 100GB bandwidth/month, 100 serverless function invocations/day soft limit (upgradeable), 100GB-hours of function execution. For a personal tool with friends-first launch, this is more than sufficient. The Vercel + Next.js pairing is the industry standard and requires zero DevOps knowledge from Kenny.

**Railway** ($5/month starter, usage-based) and **Fly.io** (free allowance + usage-based) are better for persistent servers or Docker-based deployments — overkill for this use case. **Render** free tier has cold starts (30-second spin-up) which kills the "speed" design principle. **Cloudflare Pages** is a strong free alternative but requires adapting to Workers/D1 database ecosystem.

**Hosting verdict: Vercel Hobby (free) + Supabase free tier. Effective monthly cost: $0 until meaningful scale.**

### 5. Search: Hybrid (Full-Text + Vector Embeddings)

For ProfessorX's search requirements, a **hybrid approach** is optimal but should be **phased**:

- **Phase 1 (V1):** PostgreSQL full-text search via `tsvector` on tweet content + author + categories. This is fast, free (part of Supabase), and handles keyword search ("show me tweets about TypeScript"). Sufficient for V1 given the personal-tool scale.
- **Phase 2 (Post-V1):** Add vector embeddings via pgvector for semantic search ("show me tweets about building in public" finds tweets about indie hacking even without exact keyword match). Pre-compute embeddings on ingestion using text-embedding-3-small. Hybrid ranking combines BM25 text score + cosine similarity score.

The key insight: at personal-tool scale (1 user, <100K tweets), PostgreSQL full-text search with GIN indexes will feel instant. Vector search adds meaningful value for the semantic "I know what I saved but can't remember the exact words" use case that is ProfessorX's core pain point. Start with FTS, add vectors in a follow-up.

**Search verdict: PostgreSQL FTS in V1, add pgvector semantic search in V1.1.**

### 6. Auth: NextAuth.js v5 (Auth.js) with Twitter OAuth 2.0

**NextAuth.js v5** (now called Auth.js) is the standard auth solution for Next.js. It has a built-in Twitter/X OAuth 2.0 provider, supports PKCE flow (required by Twitter OAuth 2.0), stores sessions in Supabase via the database adapter, and requires ~20 lines of configuration. The Twitter OAuth 2.0 scopes needed are `tweet.read`, `users.read`, `bookmark.read`, `like.read`, and `offline.access` (for refresh tokens). Supabase Auth also has a Twitter OAuth provider as an alternative — this would tightly couple auth with the database layer (fewer moving parts). Clerk is a managed auth service (~$0 for small projects) with excellent DX but adds a third-party dependency for something NextAuth handles natively.

**Auth verdict: NextAuth.js v5 (Auth.js) with Twitter OAuth 2.0 provider, sessions stored in Supabase.**

---

## Recommendation

Build ProfessorX on **Next.js 15 + TypeScript + Shadcn/ui** (framework), **Supabase** (PostgreSQL + pgvector + auth), deployed on **Vercel Hobby**, with **OpenAI GPT-4o-mini** for categorization and **text-embedding-3-small** for semantic search embeddings. This stack costs $0/month at launch, requires no DevOps, and scales cleanly if the project grows beyond personal use.

---

## Key Facts

- **Next.js 15** — current stable version, App Router is the default, React 19 compatible
- **SvelteKit** — valid alternative, better raw performance, smaller bundles, but smaller ecosystem
- **Supabase free tier** — 500MB database, 50,000 MAU, 5GB bandwidth, includes pgvector and auth
- **GPT-4o-mini pricing** — $0.15/1M input tokens, $0.60/1M output tokens (as of mid-2025)
- **text-embedding-3-small** — $0.02/1M tokens, 1536 dimensions, best cost/quality for short text
- **Cost to categorize + embed 10,000 tweets** — approximately $0.12 total
- **Vercel Hobby** — free tier, no cold starts for Next.js, global CDN, 100GB bandwidth/month
- **NextAuth.js v5 (Auth.js)** — Twitter OAuth 2.0 built-in, Supabase adapter available
- **pgvector** — PostgreSQL extension for vector similarity search, included in Supabase
- **PostgreSQL FTS** — `tsvector`/`tsquery` with GIN index, sufficient for <100K personal tweet library
- **Railway starter** — $5/month, better for persistent processes but unnecessary here
- **Fly.io** — free allowance + usage-based, better for Docker workloads, overkill for this project

---

## Sources

Note: WebSearch and WebFetch were unavailable in this environment. Findings are based on training knowledge through August 2025 covering stable, well-documented technologies. Key facts (pricing, version numbers) should be verified against official docs before final architecture decisions.

- https://nextjs.org/docs (Next.js 15 App Router documentation)
- https://kit.svelte.dev/docs (SvelteKit documentation)
- https://supabase.com/docs (Supabase PostgreSQL + pgvector + Auth)
- https://platform.openai.com/docs/models (OpenAI model pricing — verify current rates)
- https://vercel.com/pricing (Vercel Hobby tier limits)
- https://authjs.dev/getting-started/providers/twitter (Auth.js Twitter provider)
- https://github.com/pgvector/pgvector (pgvector PostgreSQL extension)

---

## Confidence

0.82 — Core technology choices (Next.js, Supabase, Vercel, OpenAI) are industry-standard and well-established; architectural reasoning is solid. Confidence docked slightly because pricing figures (GPT-4o-mini, Vercel limits) should be verified against current official pricing pages before finalizing budget estimates, as these change. The framework recommendation is defensible from multiple angles and unlikely to be wrong.
