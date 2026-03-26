# Architectural Constraints -- ProfessorX

Hard constraints that planners and builders must respect. Violations will cause rework.

---

## C-1: No Server-Side Twitter Scraping

All Twitter data scraping runs client-side in the user's browser via the Chrome extension. The Next.js backend never makes requests to Twitter on behalf of users. This is a legal, cost, and security constraint. The backend only receives pre-parsed tweet data from the extension via authenticated API calls.

## C-2: All Data Access Through API Routes

The frontend and the browser extension communicate with Supabase exclusively through Next.js API routes (Route Handlers). Neither the frontend nor the extension should use the Supabase client directly. This ensures RLS policies are enforced consistently and keeps the Supabase service key server-side only.

## C-3: Row-Level Security on All Tables

Every Supabase table must have RLS policies that scope all queries to `user_id = auth.uid()`. No query should be able to return another user's data. This is non-negotiable -- ProfessorX stores personal tweet data.

## C-4: Browser Extension is Manifest V3

Chrome deprecated Manifest V2 in 2024. All extension code must use Manifest V3 patterns: service workers (not background pages), declarativeNetRequest or fetch interception (not webRequest blocking), and content scripts with explicit host permissions for `x.com`.

## C-5: Mobile-First Responsive Design

All UI components must be designed for mobile viewports first (375px minimum width). Desktop is a secondary consideration. Touch targets must be at least 44x44px (Apple HIG). No hover-only interactions -- all interactions must work with tap.

## C-6: Maximum 7 Inline Category Labels

The category filter UI must show at most 7 category chips inline, sorted by tweet count descending. Additional categories collapse into a "+ N more" expandable control. This is a researched UX constraint (Miller's Law, Hick's Law).

## C-7: Search Triggers at 3 Characters with 200ms Debounce

Live tweet search fires after 3 characters typed with a 200ms debounce. Author/handle search may fire at 2 characters. Category filter search may fire at 1 character. These thresholds are researched and must not be changed without UX justification.

## C-8: AI Categorization Batch Size Limit

GPT-4o-mini categorization calls must batch at most 10 tweets per API call. This keeps prompt size manageable, reduces timeout risk on serverless functions, and limits blast radius of a failed call. Each call includes the user's category list + top 5-10 AI memory corrections.

## C-9: AI Memory Cap at 200 Corrections

The per-user AI memory JSONB column stores at most 200 correction records (most recent, timestamp-ordered). When the cap is reached, the oldest correction is evicted. This keeps the memory lightweight (~150KB) and prevents unbounded growth.

## C-10: OpenAI API Key Server-Side Only

The OpenAI API key must only exist in Vercel environment variables and must never be exposed to the client bundle or browser extension. All AI calls route through Next.js API routes.

## C-11: Tweet Deduplication on Ingestion

The ingestion endpoint must deduplicate tweets by the composite key `(user_id, twitter_tweet_id)`. Duplicate ingestion attempts (common with extension re-scraping) must be idempotent -- upsert, not reject.

## C-12: Vercel Serverless Function Timeout

Vercel Hobby tier has a 10-second function execution limit. All API route handlers must complete within 10 seconds. AI categorization batches must be sized to fit within this limit. If categorization of a large batch takes longer, it must be split across multiple invocations triggered by the client.

## C-13: Supabase Free Tier Limits

The architecture must operate within Supabase Free tier limits: 500MB database storage, 2GB file storage, 50,000 monthly active users, 500MB bandwidth per day. Schema design should be storage-efficient (no redundant denormalization, JSONB for sparse fields).

## C-14: No Twitter API Dependency in V1

V1 must not depend on the Twitter API ($100/month minimum). All data ingestion comes through the browser extension. Twitter OAuth 2.0 is used only for user authentication (free tier supports this), not for reading likes/bookmarks via API endpoints.

## C-15: Extension-to-Backend Auth Token Flow

The browser extension must obtain its auth token from the web app's login session. The extension does not perform its own OAuth flow. The user logs in on the web app, and the extension reads the session token (via a shared cookie domain or explicit token transfer in the extension popup).

## C-16: Read-Only V1

ProfessorX V1 does not write to Twitter. No liking, retweeting, replying, or bookmarking from the app. The extension reads only. This is a scope constraint from VISION.md.

## C-17: Monorepo Structure Required

The web app and browser extension must live in a single pnpm workspace monorepo with shared TypeScript types and zod schemas in a `packages/shared` directory. This prevents type drift between the extension's tweet parser and the backend's ingestion API.
