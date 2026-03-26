<!-- status: complete -->
# Architecture -- ProfessorX

## Overview

ProfessorX is a personal Twitter likes/bookmarks organizer. It is a mobile-first web application backed by a browser extension for data ingestion. The system has three main subsystems: (1) a Chrome browser extension that scrapes the user's own Twitter likes/bookmarks from the DOM, (2) a Next.js web application serving the UI and API layer, and (3) Supabase as the persistence and auth layer. AI categorization runs server-side via OpenAI API calls from Next.js API routes.

## Components

### 1. Browser Extension (Chrome Manifest V3)

**Purpose:** Primary data ingestion. Reads the user's liked and bookmarked tweets from Twitter's DOM and internal XHR responses.

**Boundary:** Runs entirely in the user's browser. Communicates with the Next.js backend via authenticated REST calls. Never stores tweet data locally beyond a transient send queue.

**Key responsibilities:**
- Intercept Twitter's internal API responses (XHR/fetch) on `x.com` to capture tweet data as the user scrolls their likes/bookmarks pages
- Parse tweet objects from intercepted responses (text, author, media, timestamps, metrics)
- Batch and send parsed tweets to the ProfessorX backend API (`POST /api/tweets/ingest`)
- Authenticate with the backend using the user's session token (obtained during OAuth login on the web app)
- Show a small badge/popup indicating sync status (syncing, up-to-date, error)

**Technology:** TypeScript, Chrome Extension Manifest V3 (service worker + content script + popup)

**Distribution:** Sideloaded (developer mode) for V1 friends-first launch. Chrome Web Store for V2.

### 2. Next.js Web Application

**Purpose:** UI layer, API layer, AI orchestration. This is the main product surface.

**Boundary:** Deployed on Vercel. Serves the React frontend and hosts serverless API routes. Communicates with Supabase (database) and OpenAI (AI categorization/embeddings).

**Sub-components:**

#### 2a. Frontend (React, App Router)

- Single-page tweet library view with search bar, category filter chips, and time filter chips
- Tweet cards rendered in Twitter-native visual style (Shadcn/ui components)
- Category management UI (create, rename, merge, delete categories)
- Reclassification flow: tap category on a tweet card to change it; optional "why?" prompt
- Collapsible footer with about section (audio message) and donation link
- Settings page: toggle likes vs bookmarks sync, manage categories

#### 2b. API Routes (Next.js Route Handlers)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tweets/ingest` | POST | Receive batched tweets from browser extension |
| `/api/tweets/search` | GET | Full-text search with filters (category, time, author) |
| `/api/tweets` | GET | Paginated tweet list with filters |
| `/api/categories` | GET/POST/PATCH/DELETE | CRUD for user categories |
| `/api/categorize` | POST | Trigger AI categorization for uncategorized tweets |
| `/api/corrections` | POST | Store a reclassification + reason |
| `/api/auth/[...nextauth]` | * | NextAuth.js Twitter OAuth 2.0 handlers |

#### 2c. AI Orchestration Layer

- **Categorization service:** Calls GPT-4o-mini with system prompt containing (a) user's category list, (b) top 5-10 relevant corrections from AI memory, (c) extracted category rules, and (d) the tweet text. Returns category assignment as JSON.
- **AI memory manager:** Reads/writes the user's correction store (JSONB column in Supabase). Selects relevant corrections by category match and recency. Extracts category rules from user explanations. Caps at 200 corrections with timestamp decay.
- **Embedding service (V1.1):** Generates text-embedding-3-small vectors on tweet ingestion. Stores in pgvector column for semantic search.

### 3. Supabase (PostgreSQL + Auth)

**Purpose:** Persistence, authentication, row-level security.

**Boundary:** Managed service. Accessed from Next.js API routes via Supabase client SDK. Never accessed directly from the browser extension or frontend (all access goes through API routes).

**Schema (core tables):**

```
users
  id UUID PK
  twitter_id TEXT UNIQUE
  twitter_handle TEXT
  display_name TEXT
  ai_memory JSONB          -- few-shot correction store
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

tweets
  id UUID PK
  user_id UUID FK -> users.id
  twitter_tweet_id TEXT UNIQUE(user_id, twitter_tweet_id)
  author_handle TEXT
  author_display_name TEXT
  text TEXT
  tweet_created_at TIMESTAMPTZ
  media JSONB              -- array of {type, url, alt_text}
  metrics JSONB            -- {likes, retweets, replies, quotes}
  quoted_tweet JSONB       -- embedded quote tweet data
  source_type TEXT         -- 'like' | 'bookmark'
  raw_data JSONB           -- original tweet object for future use
  search_vector TSVECTOR   -- generated full-text search column
  -- embedding VECTOR(1536) -- V1.1: pgvector column
  ingested_at TIMESTAMPTZ
  categorized_at TIMESTAMPTZ

categories
  id UUID PK
  user_id UUID FK -> users.id
  name TEXT
  tweet_count INTEGER DEFAULT 0
  sort_order INTEGER
  created_at TIMESTAMPTZ

tweet_categories
  tweet_id UUID FK -> tweets.id
  category_id UUID FK -> categories.id
  confidence FLOAT         -- AI confidence score
  assigned_by TEXT          -- 'ai' | 'user'
  assigned_at TIMESTAMPTZ
  PRIMARY KEY (tweet_id, category_id)
```

**Row-Level Security:** All tables have RLS policies ensuring `user_id = auth.uid()`. No user can access another user's data.

**Indexes:**
- `tweets.search_vector` -- GIN index for full-text search
- `tweets(user_id, tweet_created_at DESC)` -- primary listing query
- `tweets(user_id, twitter_tweet_id)` -- dedup on ingestion
- `tweet_categories(category_id)` -- category filter queries
- `categories(user_id, sort_order)` -- category list ordering

## Data Flow

### Ingestion Flow
```
User browses x.com/likes
  -> Extension content script intercepts XHR responses
  -> Parses tweet objects from Twitter's internal API JSON
  -> Batches tweets (max 50 per request)
  -> POST /api/tweets/ingest (with auth token)
  -> API route validates auth, deduplicates by twitter_tweet_id
  -> Inserts new tweets into Supabase tweets table
  -> Triggers async categorization for uncategorized tweets
```

### Categorization Flow
```
New tweets arrive (uncategorized)
  -> Categorization service loads user's category list
  -> Loads user's AI memory (corrections + rules)
  -> Sends batch to GPT-4o-mini (up to 10 tweets per call)
  -> Receives category assignments with confidence scores
  -> Writes to tweet_categories table
  -> Updates category tweet_count
```

### Search Flow
```
User types in search bar (3+ characters, 200ms debounce)
  -> GET /api/tweets/search?q=...&category=...&timeRange=...
  -> API builds PostgreSQL query:
     - FTS: ts_query against search_vector
     - Category filter: JOIN tweet_categories
     - Time filter: WHERE tweet_created_at >= cutoff
  -> Returns paginated results
  -> Frontend renders tweet cards
```

### Reclassification Flow
```
User taps category on tweet card -> selects new category
  -> Optional "why?" prompt (with skip/skip-always)
  -> POST /api/corrections {tweet_id, old_category, new_category, reason}
  -> Updates tweet_categories
  -> Appends correction to user's ai_memory JSONB
  -> Extracts category_rule from reason (if provided)
  -> Future categorizations use updated memory
```

## Deployment Model

| Component | Host | Cost |
|-----------|------|------|
| Next.js app | Vercel Hobby (free) | $0/mo |
| Database | Supabase Free (500MB, 50K MAU) | $0/mo |
| AI categorization | OpenAI API (pay-per-use) | ~$0.01/1K tweets |
| AI embeddings (V1.1) | OpenAI API (pay-per-use) | ~$0.001/1K tweets |
| Browser extension | User's Chrome (sideloaded) | $0 |

**Total launch cost:** $0/month fixed + negligible per-use AI costs.

**Scaling triggers:**
- 500MB database: upgrade Supabase to Pro ($25/mo) at ~50K tweets stored
- 100GB bandwidth: upgrade Vercel to Pro ($20/mo) if traffic grows
- Chrome Web Store: $5 one-time developer fee for V2 distribution

## Security Considerations

- All API routes require authenticated session (NextAuth.js session token)
- Browser extension authenticates via token obtained from web app login flow
- Supabase RLS ensures per-user data isolation at the database level
- OpenAI API key stored as Vercel environment variable, never exposed to client
- Twitter OAuth tokens stored in Supabase session table, encrypted at rest
- No server-side scraping -- user credentials never leave user's device
- Extension permissions scoped to `x.com` only (content script match pattern)
