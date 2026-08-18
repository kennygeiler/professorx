# Local development

Verified working on 2026-08-17. This runs the whole app on your machine against a
local Supabase stack in Docker — no hosted Supabase project, no signup.

## What runs where

| Piece | Where |
| --- | --- |
| Web app | http://localhost:3100 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

The project's default port is 3100, not 3000: port 3000 is held by the
long-running DeployAI container on this machine. `apps/web/package.json` and the
extension's `src/lib/config.ts` both carry 3100, so the two agree by default.

## Setup

1. Start the database (needs Docker running):

```bash
cd ~/professorx && supabase start
```

2. Install dependencies and start the web app:

```bash
cd ~/professorx && pnpm install && pnpm dev
```

`apps/web/.env.local` already holds the local Supabase keys, a generated
`API_KEY`, and `LOCAL_USER_ID`. It is gitignored.

3. Build the Chrome extension:

```bash
cd ~/professorx/apps/extension && node build.ts
```

4. Load it in Chrome: `chrome://extensions` → enable Developer mode → **Load
   unpacked** → select `~/professorx/apps/extension`. Open the popup and enter:

   - Twitter handle: your `@handle`
   - API key: the `API_KEY` value from `apps/web/.env.local`
   - Backend URL: `http://localhost:3100` (already prefilled)

   Then click **Sync Likes**. It opens your likes page, scrolls it, and posts
   batches to `/api/tweets/ingest`. Watch the overlay in the bottom-right.

If the extension was connected before the 3100 change, click **Disconnect** and
reconnect — the old URL is stored in `chrome.storage` and overrides the default.
A wrong backend URL fails silently in a confusing way: the scraper POSTs to
whatever is on that port and then redirects you there, so you land on an
unrelated app and no tweets arrive.

## AI features

The AI routes run on Claude via `@anthropic-ai/sdk` and need `ANTHROPIC_API_KEY`
in `apps/web/.env.local` — get one from console.anthropic.com/settings/keys.
Without it, AI categorization (`/api/categorize`), AI search
(`/api/tweets/ai-search`), and selector healing (`/api/selectors/heal`) return
503 with the reason. Browsing, filtering, and keyword search work without a key.

The batch routes run at `low` effort: assigning known categories and matching a
search query are scoped classification tasks, and it keeps categorizing a large
library affordable. Categorization handles 50 tweets per request, about 40
seconds a round.

## Migrations 006 and 007

Two schema bugs blocked every write. Both are fixed by migrations in
`supabase/migrations/`, so a fresh `supabase start` now comes up working.

- **006_grants.sql** — no role had DML on the app tables. Hosted Supabase adds
  those grants through default privileges; a local stack does not, so every
  query through the admin client failed with `permission denied for table
  tweets`. The app connects only as `service_role`, so that is the only role
  granted.
- **007_drop_auth_users_fk.sql** — 005 meant to drop the `auth.users` foreign
  key but dropped the `users_pkey` constraint instead. The FK from 001,
  `users_id_fkey`, survived, so creating the local user row failed with
  `violates foreign key constraint "users_id_fkey"`. Local single-user mode has
  no Supabase Auth user, so the FK can never be satisfied.

If you re-point this repo at the hosted project, check whether that database
also carries `users_id_fkey` — the same bug applies there.

## `LOCAL_USER_ID` must be a UUID

`public.users.id` is a `UUID` column, so the `LOCAL_USER_ID=local` the docs used
to recommend fails on insert with `invalid input syntax for type uuid`. The
README, `SETUP_PROMPT.md`, and `.env.example` now all carry a UUID.

## Verified

- `supabase start` applies migrations 001–007 clean.
- `POST /api/tweets/ingest` with the `API_KEY` bearer token inserts a row.
- The extension's DOM scrape against x.com: 800 tweets synced from a real likes
  page, rendering in the library at http://localhost:3100.
- `GET /api/tweets/search?q=...` and `GET /api/tweets` return matches.
- `POST /api/tweets/ai-search` returns semantic matches (48 for "film and
  movies", against 33 from keyword search).
- `POST /api/categorize` categorizes 50 tweets per call with no batch errors.

Not verified: `/api/selectors/heal`, which only runs when x.com changes its DOM
and the scraper's selectors stop matching.
