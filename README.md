# readXlater

Your Twitter likes and bookmarks, organized and searchable with AI. Never lose a tweet again.

## What it does

readXlater syncs your Twitter/X liked tweets and bookmarks via a Chrome extension that scrolls your profile automatically. AI categorizes everything into topics. You search, filter, and browse your saved tweets like a personal library.

**Zero Twitter API costs.** The Chrome extension scrapes tweets from the DOM — no API keys or rate limits.

## Features

- **Chrome extension sync** — auto-scrolls your likes/bookmarks page, extracts tweets from the DOM
- **AI categorization** — GPT-4o-mini assigns 1-2 categories per tweet, auto-creates new categories
- **Full-text search** — PostgreSQL FTS across tweet text and author names
- **AI-powered search** — semantic search for queries like "tweet about investing advice"
- **Filters** — by category, source (likes/bookmarks), media type (photos/videos/quotes), time range
- **Reclassify** — tap any category badge to move a tweet, AI learns from your corrections
- **Category management** — create, edit, delete, merge categories with color coding
- **Fibonacci time slider** — non-linear time navigation for browsing tweet history
- **Multi-category support** — tweets can belong to up to 2 categories
- **Quote tweet embeds** — quoted tweets render as nested cards
- **Link previews** — URLs in tweets shown as clickable chips
- **Video/GIF playback** — videos play inline with controls, GIFs autoplay
- **Dark mode** — zinc/Twitter blue color scheme, mobile-responsive

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI GPT-4o-mini |
| Auth | NextAuth.js v5 with Twitter OAuth 2.0 |
| Extension | Chrome Manifest V3, esbuild |
| Hosting | Vercel |

## Project structure

```
apps/
  web/                    # Next.js web application
    app/                  # App router pages and API routes
    components/           # React components
    lib/                  # Services, auth, hooks, Supabase client
  extension/              # Chrome extension
    src/
      scraper.ts          # DOM scraper with auto-scroll
      background.ts       # Service worker — tab management, batching
      popup/              # Extension popup UI
      lib/                # Auth, batch sender
    manifest.json
packages/
  shared/                 # Shared schemas and constants
supabase/
  migrations/             # Database migrations
```

## Prerequisites

- Node.js 18+
- pnpm
- A Supabase project
- An OpenAI API key
- A Twitter/X developer app (for OAuth login only — not for tweet fetching)
- Chrome browser (for the extension)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/kennygeiler/professorx.git
cd professorx
pnpm install
```

### 2. Supabase setup

Create a new Supabase project. Run the migrations in order:

```bash
# In the Supabase SQL editor, run each file in supabase/migrations/:
# 001_initial_schema.sql
# 002_rls_policies.sql
# 003_indexes.sql
# 004_search_vector_trigger.sql
# 005_fix_users_fk.sql
```

### 3. Twitter OAuth app

1. Go to [developer.x.com](https://developer.x.com)
2. Create a new app with OAuth 2.0
3. Set callback URL to `http://localhost:3000/api/auth/callback/twitter` (and your production URL)
4. Enable scopes: `users.read`, `tweet.read`, `like.read`, `bookmark.read`, `offline.access`
5. Copy the Client ID and Client Secret

### 4. Environment variables

Create `apps/web/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth
AUTH_SECRET=generate-a-random-string-here
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Twitter OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
```

Generate `AUTH_SECRET` with: `openssl rand -base64 32`

### 5. Run the web app

```bash
cd apps/web
pnpm dev
```

Open http://localhost:3000 and sign in with Twitter.

### 6. Build and load the Chrome extension

```bash
cd apps/extension
pnpm build    # or: npx tsx build.ts
```

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select the `apps/extension` folder
4. Click the extension icon in the toolbar

### 7. Connect the extension

1. In the web app, go to Settings
2. Click "Copy Extension Token"
3. In the extension popup, enter your Twitter handle and paste the token
4. Click Connect

### 8. Sync your tweets

1. Click "Sync Likes & Bookmarks" in the extension popup
2. A tab opens to your Twitter likes page and scrolls automatically
3. Tweets are extracted from the DOM and sent to your backend
4. When done, click "Categorize" in the web app to organize with AI

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Set all environment variables from step 4
4. Set `AUTH_URL` to your Vercel domain
5. Update Twitter OAuth callback URL to your Vercel domain

### Extension

Update the default backend URL in `apps/extension/src/lib/auth.ts` to your production domain, then rebuild.

## How the extension works

The Chrome extension does NOT use the Twitter API. It:

1. Opens `x.com/{yourhandle}/likes` in a foreground tab
2. Programmatically scrolls the page (`window.scrollTo`)
3. Extracts tweet data from DOM elements (`article[data-testid="tweet"]`)
4. Sends batches of 50 tweets to the backend `/api/tweets/ingest` endpoint
5. Stops when no new tweets appear after several scroll attempts
6. Repeats for bookmarks (`x.com/i/bookmarks`)

This means:
- **Zero API costs** — reads the same DOM you see when browsing Twitter
- **No rate limits** — scrolls at human-like speed
- **Works with any account** — uses your existing Twitter login session
- **Media included** — extracts photo URLs, video posters, metrics

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tweets/ingest` | POST | Ingest tweets from extension (JWT auth) |
| `/api/tweets` | GET | List tweets with pagination |
| `/api/tweets/search` | GET | Search/filter tweets |
| `/api/tweets/ai-search` | POST | AI-powered semantic search |
| `/api/categories` | GET/POST | List or create categories |
| `/api/categories/[id]` | PATCH/DELETE | Update or delete a category |
| `/api/categories/merge` | POST | Merge two categories |
| `/api/categorize` | POST | Run AI categorization |
| `/api/categorize/remaining` | GET | Count uncategorized tweets |
| `/api/corrections` | POST | Reclassify a tweet |
| `/api/settings` | GET/PATCH | User settings |
| `/api/auth/extension-token` | GET | Generate extension JWT |

## Database schema

- **users** — user accounts with AI memory and settings (JSONB)
- **tweets** — tweet content, media, metrics, source type
- **categories** — user categories with colors and tweet counts
- **tweet_categories** — junction table (supports multi-category)

Full-text search via PostgreSQL `tsvector` on tweet text + author name.

## License

MIT

## Author

Kenny Geiler — [outsidekenny.com](https://outsidekenny.com)
