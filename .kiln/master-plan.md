# Master Plan -- ProfessorX

**Project:** ProfessorX -- Twitter Likes/Bookmarks Organizer
**Type:** Greenfield
**Stack:** Next.js 15 + TypeScript + Shadcn/ui + Supabase + GPT-4o-mini + Chrome Extension (Manifest V3)
**Repo Structure:** pnpm monorepo (apps/web, apps/extension, packages/shared)

---

## Architecture Summary

Three-component system: (1) Chrome browser extension for client-side tweet ingestion via XHR interception, (2) Next.js 15 web app serving mobile-first UI + API routes + AI orchestration, (3) Supabase for PostgreSQL persistence with RLS + auth. AI categorization via GPT-4o-mini with few-shot JSON memory. PostgreSQL FTS for search in V1, pgvector deferred to V1.1. Zero monthly hosting cost at launch.

## Critical Constraints

- C-1: No server-side scraping -- all Twitter data via client-side extension only
- C-2: All data access through Next.js API routes (no direct Supabase from client)
- C-3: RLS on all tables (user_id = auth.uid())
- C-5: Mobile-first responsive design (375px min)
- C-8: AI batch max 10 tweets per call
- C-9: AI memory cap 200 corrections
- C-12: Vercel Hobby 10-second function timeout
- C-14: No Twitter API dependency in V1
- C-17: pnpm monorepo required

---

### Milestone: Foundation and Project Scaffolding

**Goal:** Establish the monorepo structure, tooling, and shared packages so all subsequent milestones build on a consistent foundation.

**Deliverables:**
- pnpm workspace with `apps/web`, `apps/extension`, `packages/shared`
- `tsconfig.base.json` at root with path aliases
- Next.js 15 app bootstrapped in `apps/web` with App Router
- Tailwind CSS 4 + Shadcn/ui initialized
- ESLint + Prettier configured across workspace
- Shared zod schemas in `packages/shared` for tweet data, category data, API payloads
- Shared TypeScript types in `packages/shared/types`
- `.env.example` with all required environment variables documented
- Basic `apps/web/app/layout.tsx` with mobile-first viewport meta, font loading

**Files to create/modify:**
```
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
.env.example
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
packages/shared/src/types/tweet.ts
packages/shared/src/types/category.ts
packages/shared/src/types/api.ts
packages/shared/src/schemas/tweet.ts
packages/shared/src/schemas/category.ts
packages/shared/src/schemas/api.ts
apps/web/package.json
apps/web/tsconfig.json
apps/web/next.config.ts
apps/web/tailwind.config.ts
apps/web/app/layout.tsx
apps/web/app/globals.css
apps/web/components/ui/ (shadcn init)
apps/extension/package.json
apps/extension/tsconfig.json
```

**Acceptance criteria:**
- [ ] `pnpm install` succeeds from repo root
- [ ] `pnpm --filter web dev` starts Next.js dev server without errors
- [ ] `packages/shared` types importable from both `apps/web` and `apps/extension`
- [ ] Zod schemas validate a sample tweet object and reject invalid data
- [ ] ESLint passes across all workspaces with `pnpm lint`
- [ ] Tailwind utility classes render in browser at localhost

**Dependencies:** None (first milestone)

---

### Milestone: Database Schema and Supabase Setup

**Goal:** Create the Supabase project configuration, database schema, RLS policies, and server-side Supabase client utilities.

**Deliverables:**
- Supabase migration files for all core tables: `users`, `tweets`, `categories`, `tweet_categories`
- RLS policies on every table scoping to `user_id = auth.uid()`
- GIN index on `tweets.search_vector`
- Composite index on `tweets(user_id, tweet_created_at DESC)`
- Unique constraint on `tweets(user_id, twitter_tweet_id)`
- Index on `tweet_categories(category_id)`
- Index on `categories(user_id, sort_order)`
- Database trigger to auto-update `search_vector` tsvector column on tweet insert/update
- Server-side Supabase client helper in `apps/web/lib/supabase/server.ts`
- Supabase admin client for service-role operations in `apps/web/lib/supabase/admin.ts`
- Generated TypeScript types from Supabase schema

**Files to create/modify:**
```
supabase/config.toml
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_indexes.sql
supabase/migrations/004_search_vector_trigger.sql
apps/web/lib/supabase/server.ts
apps/web/lib/supabase/admin.ts
apps/web/lib/supabase/types.ts (generated)
```

**Acceptance criteria:**
- [ ] `supabase db push` applies all migrations without errors
- [ ] RLS policies prevent cross-user data access (test with two different auth.uid values)
- [ ] Inserting a tweet auto-populates the `search_vector` column
- [ ] Full-text search query `SELECT * FROM tweets WHERE search_vector @@ to_tsquery('english', 'keyword')` returns expected results
- [ ] Unique constraint prevents duplicate `(user_id, twitter_tweet_id)` inserts
- [ ] TypeScript types match the schema

**Dependencies:** Milestone 1 (Foundation)

---

### Milestone: Authentication System

**Goal:** Implement Twitter OAuth 2.0 login via NextAuth.js v5 with Supabase session storage. Provide token mechanism for browser extension auth.

**Deliverables:**
- NextAuth.js v5 configuration with Twitter OAuth 2.0 PKCE provider
- Supabase adapter for session/user storage
- Auth API route at `apps/web/app/api/auth/[...nextauth]/route.ts`
- Auth middleware protecting API routes (session validation)
- Auth context provider for frontend
- Token endpoint for extension: `GET /api/auth/extension-token` returns a signed JWT for extension-to-backend auth
- Auth utility functions: `getCurrentUser()`, `requireAuth()`, `validateExtensionToken()`

**Files to create/modify:**
```
apps/web/lib/auth/config.ts
apps/web/lib/auth/middleware.ts
apps/web/lib/auth/utils.ts
apps/web/app/api/auth/[...nextauth]/route.ts
apps/web/app/api/auth/extension-token/route.ts
apps/web/components/providers/auth-provider.tsx
apps/web/app/login/page.tsx
```

**Acceptance criteria:**
- [ ] User can log in via Twitter OAuth and see their Twitter handle displayed
- [ ] Unauthenticated API requests return 401
- [ ] Session persists across page refreshes
- [ ] Extension token endpoint returns a valid JWT containing user_id
- [ ] JWT validation correctly authenticates extension API calls
- [ ] Logout clears session completely

**Dependencies:** Milestone 2 (Database)

---

### Milestone: Tweet Ingestion API

**Goal:** Build the server-side API that receives batched tweet data from the browser extension, deduplicates, and stores in Supabase.

**Deliverables:**
- `POST /api/tweets/ingest` route handler accepting batched tweet payloads (max 50 per request)
- Zod validation of incoming tweet data using shared schemas
- Upsert logic: deduplicate on `(user_id, twitter_tweet_id)`, update if newer data
- Extension token auth on ingestion endpoint
- Response includes count of new vs updated tweets
- Error handling: partial success (some tweets fail validation, others succeed)
- Rate limiting awareness (respect C-12: complete within 10 seconds)

**Files to create/modify:**
```
apps/web/app/api/tweets/ingest/route.ts
apps/web/lib/services/tweet-ingestion.ts
packages/shared/src/schemas/ingest.ts
packages/shared/src/constants.ts (batch size limits)
```

**Acceptance criteria:**
- [ ] POST with 50 valid tweets returns 200 with `{inserted: N, updated: M, errors: []}`
- [ ] Duplicate tweets are upserted, not rejected
- [ ] Invalid tweet objects in batch are skipped; valid ones still insert
- [ ] Unauthenticated requests return 401
- [ ] Request with >50 tweets returns 400
- [ ] Endpoint completes within 10 seconds for a 50-tweet batch
- [ ] search_vector auto-populated for all inserted tweets

**Dependencies:** Milestone 2 (Database), Milestone 3 (Auth)

---

### Milestone: Chrome Extension

**Goal:** Build the Manifest V3 Chrome extension that intercepts Twitter XHR responses on x.com, parses tweet data, and sends batches to the backend.

**Deliverables:**
- `manifest.json` with Manifest V3 configuration, host permissions for `x.com`
- Content script that intercepts `fetch`/`XMLHttpRequest` on x.com to capture tweet API responses
- Tweet parser that extracts structured data from Twitter's internal API JSON format
- Batching logic: accumulate tweets and send every 50 or every 10 seconds (whichever comes first)
- Service worker (background.ts) managing auth token storage and batch sending
- Popup UI showing: sync status, tweet count synced, login link (if not authenticated)
- Token transfer: popup opens web app login page, receives token back via message passing
- Error handling: retry queue for failed sends, exponential backoff

**Files to create/modify:**
```
apps/extension/manifest.json
apps/extension/src/content.ts
apps/extension/src/background.ts
apps/extension/src/popup/popup.html
apps/extension/src/popup/popup.ts
apps/extension/src/popup/popup.css
apps/extension/src/lib/tweet-parser.ts
apps/extension/src/lib/batch-sender.ts
apps/extension/src/lib/auth.ts
apps/extension/src/lib/types.ts
apps/extension/build.ts (esbuild config)
```

**Acceptance criteria:**
- [ ] Extension loads in Chrome developer mode without errors
- [ ] Navigating to x.com/likes triggers tweet interception
- [ ] Intercepted tweets are parsed into the shared tweet schema format
- [ ] Batches are sent to POST /api/tweets/ingest with valid auth token
- [ ] Popup displays current sync status (syncing/idle/error) and tweet count
- [ ] Failed sends are retried with exponential backoff
- [ ] Extension works on x.com/bookmarks as well as x.com/likes
- [ ] No console errors or content security policy violations

**Dependencies:** Milestone 4 (Ingestion API), shared schemas from Milestone 1

---

### Milestone: Core UI -- Tweet Library View

**Goal:** Build the main mobile-first tweet library page: paginated tweet list with tweet cards rendered in Twitter-native style.

**Deliverables:**
- Main library page at `apps/web/app/(main)/page.tsx`
- Tweet card component matching Twitter's visual style (Shadcn/ui + Tailwind)
- Tweet card displays: author avatar, handle, text, media (images/video thumbnails), quote tweets, metrics, timestamp, category badge
- Infinite scroll pagination (cursor-based)
- `GET /api/tweets` route handler with cursor pagination, sorted by `tweet_created_at DESC`
- Loading skeleton states for tweet cards
- Empty state when no tweets exist (prompt to install extension)
- Mobile-first layout: 375px min width, full-width cards, thumb-reachable controls

**Files to create/modify:**
```
apps/web/app/(main)/page.tsx
apps/web/app/(main)/layout.tsx
apps/web/components/tweets/tweet-card.tsx
apps/web/components/tweets/tweet-list.tsx
apps/web/components/tweets/tweet-media.tsx
apps/web/components/tweets/quote-tweet.tsx
apps/web/components/tweets/tweet-metrics.tsx
apps/web/components/tweets/tweet-skeleton.tsx
apps/web/components/tweets/empty-state.tsx
apps/web/app/api/tweets/route.ts
apps/web/lib/services/tweet-queries.ts
```

**Acceptance criteria:**
- [ ] Tweet library page renders at `/` with paginated tweet cards
- [ ] Tweet cards display author info, text, media, metrics, timestamp
- [ ] Infinite scroll loads next page when scrolling near bottom
- [ ] Loading skeletons show during data fetch
- [ ] Empty state shows when user has zero tweets
- [ ] Layout is mobile-first: cards fill width on 375px viewport
- [ ] Touch targets are at least 44x44px
- [ ] Page loads within 2 seconds on 3G throttled connection

**Dependencies:** Milestone 2 (Database), Milestone 3 (Auth)

---

### Milestone: Search and Filtering

**Goal:** Implement live search, category filter chips, and time filter chips on the tweet library view.

**Deliverables:**
- Search bar component with 3-character trigger and 200ms debounce
- `GET /api/tweets/search` route handler using PostgreSQL full-text search
- Category filter chip row: top 7 categories by tweet count, "+ N more" overflow
- `GET /api/categories` route handler returning user's categories with counts
- Time filter chips: 1d, 3d, 1w, 2w, 1m, 3m, 6m, 1y, All
- Combined filtering: search + category + time range composable
- URL state sync: filters reflected in URL query params for shareability
- Clear all filters button

**Files to create/modify:**
```
apps/web/components/search/search-bar.tsx
apps/web/components/search/category-chips.tsx
apps/web/components/search/time-chips.tsx
apps/web/components/search/filter-bar.tsx
apps/web/app/api/tweets/search/route.ts
apps/web/app/api/categories/route.ts
apps/web/lib/services/search-service.ts
apps/web/lib/hooks/use-search.ts
apps/web/lib/hooks/use-filters.ts
```

**Acceptance criteria:**
- [ ] Typing 3+ characters triggers search with results updating live
- [ ] Search debounces at 200ms (no excessive API calls)
- [ ] Category chips show top 7 categories; overflow shows "+ N more"
- [ ] Tapping a category chip filters tweets to that category
- [ ] Time chips filter tweets to the selected time range
- [ ] All three filters compose correctly (search + category + time)
- [ ] Filters sync to URL query params
- [ ] Clear button resets all filters
- [ ] Empty search results show "No tweets found" message

**Dependencies:** Milestone 6 (Core UI), Milestone 2 (Database -- FTS index)

---

### Milestone: AI Categorization Engine

**Goal:** Build the AI categorization service that assigns categories to uncategorized tweets using GPT-4o-mini with few-shot memory.

**Deliverables:**
- Categorization service: sends batches of up to 10 tweets to GPT-4o-mini
- System prompt construction: category list + top 5-10 relevant corrections + extracted rules
- `POST /api/categorize` route handler (triggered after ingestion or manually)
- AI memory manager: reads/writes JSONB ai_memory on users table
- Correction store: appends corrections, enforces 200-entry cap with timestamp decay
- Rule extraction: parses user explanations into category rules
- Default categories seeded on first categorization (if user has none)
- `POST /api/corrections` route handler for reclassification
- Confidence score returned per assignment
- Error handling: partial batch failures, timeout protection (C-12)

**Files to create/modify:**
```
apps/web/lib/services/categorization.ts
apps/web/lib/services/ai-memory.ts
apps/web/lib/services/prompt-builder.ts
apps/web/app/api/categorize/route.ts
apps/web/app/api/corrections/route.ts
apps/web/lib/services/category-rules.ts
packages/shared/src/types/ai-memory.ts
packages/shared/src/constants.ts (update with AI constants)
```

**Acceptance criteria:**
- [ ] Uncategorized tweets get assigned categories via GPT-4o-mini
- [ ] Batch size never exceeds 10 tweets per API call
- [ ] System prompt includes user's category list and relevant corrections
- [ ] Corrections are stored in ai_memory JSONB with timestamp
- [ ] Memory caps at 200 entries; oldest evicted when full
- [ ] User explanations are parsed into category rules
- [ ] Categorization completes within 10 seconds per batch (C-12)
- [ ] POST /api/corrections updates tweet_categories and ai_memory
- [ ] Default categories are created for new users on first run

**Dependencies:** Milestone 2 (Database), Milestone 3 (Auth)

---

### Milestone: Category Management and Reclassification UI

**Goal:** Build the UI for managing categories and reclassifying tweets, including the "why?" prompt flow.

**Deliverables:**
- Category management page at `/settings/categories`
- CRUD operations: create, rename, merge, delete categories
- `PATCH /api/categories/[id]` and `DELETE /api/categories/[id]` route handlers
- Category merge logic: reassign all tweets from source to target category
- Reclassification flow on tweet card: tap category badge -> select new category -> optional "why?" prompt
- "Why?" modal with text input, "Skip" button, "Skip always" toggle (persisted in localStorage)
- Category badge on tweet card showing assigned category with color

**Files to create/modify:**
```
apps/web/app/settings/page.tsx
apps/web/app/settings/categories/page.tsx
apps/web/components/categories/category-manager.tsx
apps/web/components/categories/category-form.tsx
apps/web/components/categories/merge-dialog.tsx
apps/web/components/tweets/reclassify-modal.tsx
apps/web/components/tweets/category-badge.tsx
apps/web/app/api/categories/[id]/route.ts
apps/web/lib/services/category-management.ts
```

**Acceptance criteria:**
- [ ] User can create a new category from settings page
- [ ] User can rename an existing category
- [ ] User can merge two categories (all tweets reassigned)
- [ ] User can delete a category (tweets become uncategorized)
- [ ] Tapping category badge on tweet card opens reclassification modal
- [ ] Reclassification modal shows category list for selection
- [ ] "Why?" prompt appears after reclassification (unless "skip always" is set)
- [ ] "Skip always" persists across sessions via localStorage
- [ ] Category badge displays on each tweet card with the assigned category

**Dependencies:** Milestone 6 (Core UI), Milestone 8 (AI Engine)

---

### Milestone: About Footer, Settings, and Polish

**Goal:** Add the collapsible about/donation footer, settings page, and final UI polish for V1 launch readiness.

**Deliverables:**
- Collapsible footer component with about section and donation link
- Audio maker message: HTML5 audio player with Kenny's recorded message
- Donation link (external, non-pushy placement)
- Settings page: toggle likes vs bookmarks sync, manage extension connection
- Error boundary components for graceful failure handling
- Loading states and transitions for all interactive elements
- Accessibility audit: keyboard navigation, screen reader labels, ARIA attributes
- Muted/calm color palette applied consistently (design principle from VISION.md)
- PWA manifest for mobile add-to-homescreen

**Files to create/modify:**
```
apps/web/components/layout/footer.tsx
apps/web/components/layout/about-section.tsx
apps/web/components/layout/audio-player.tsx
apps/web/components/layout/header.tsx
apps/web/app/settings/page.tsx (update)
apps/web/components/ui/error-boundary.tsx
apps/web/app/manifest.json
apps/web/public/audio/ (maker message audio file)
```

**Acceptance criteria:**
- [ ] Footer collapses/expands on tap
- [ ] Audio player plays maker message without autoplay
- [ ] Donation link opens in new tab
- [ ] Settings page shows sync toggles (likes/bookmarks)
- [ ] Error boundaries catch and display friendly error messages
- [ ] All interactive elements have loading/transition states
- [ ] Keyboard navigation works through all major UI flows
- [ ] Color palette matches muted/calm design direction
- [ ] PWA manifest enables "Add to Home Screen" on mobile

**Dependencies:** Milestone 6 (Core UI), Milestone 9 (Category Management)

---

## Build Order Summary

```
M1: Foundation          ------>  M2: Database  ------>  M3: Auth
                                      |                    |
                                      v                    v
                                 M4: Ingestion API    M6: Core UI
                                      |                    |
                                      v                    v
                                 M5: Extension        M7: Search/Filter
                                                           |
                                 M8: AI Engine  <----------+
                                      |
                                      v
                                 M9: Category Mgmt UI
                                      |
                                      v
                                 M10: Polish/Footer
```

## Risk Mitigations

1. **Twitter DOM changes breaking extension:** Tweet parser should be resilient -- extract from XHR JSON responses (more stable than DOM scraping). Keep parser isolated for easy updates.
2. **Vercel 10s timeout on AI calls:** Batch size capped at 10 tweets. If categorization needs more, client triggers multiple sequential calls.
3. **Supabase 500MB limit:** JSONB fields (media, metrics, raw_data) are the largest consumers. Monitor with `pg_total_relation_size`. Defer raw_data storage if space is tight.
4. **Extension auth token expiry:** Service worker should detect 401 responses and prompt re-login via popup.
