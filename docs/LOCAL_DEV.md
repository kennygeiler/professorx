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

Port 3100 instead of the README's 3000 because 3000 was already taken on this
machine. If 3000 is free, use it and skip the backend-URL edit in step 4.

## Setup

1. Start the database (needs Docker running):

```bash
cd ~/professorx && supabase start
```

2. Install dependencies and start the web app:

```bash
cd ~/professorx && pnpm install && pnpm --filter web exec next dev --port 3100
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
   - Backend URL: `http://localhost:3100` (the field is prefilled with 3000)

   Then click **Sync Likes**. It opens your likes page, scrolls it, and posts
   batches to `/api/tweets/ingest`. Watch the overlay in the bottom-right.

## AI features

`OPENAI_API_KEY` in `apps/web/.env.local` is empty. Browsing, filtering, and
keyword search work without it. AI categorization (`/api/categorize`), AI search
(`/api/tweets/ai-search`), and selector healing (`/api/selectors/heal`) need a
key from platform.openai.com.

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

`public.users.id` is a `UUID` column. The README and `SETUP_PROMPT.md` both say
`LOCAL_USER_ID=local`, which fails on insert with `invalid input syntax for type
uuid`. `.env.local` uses a generated UUID instead. Those docs still need
correcting.

## Verified

- `supabase start` applies migrations 001–007 clean.
- `POST /api/tweets/ingest` with the `API_KEY` bearer token inserts a row.
- The inserted tweet renders in the library at http://localhost:3100.
- `GET /api/tweets/search?q=...` and `GET /api/tweets` return it.
- The smoke-test row was deleted afterward; the database is empty and ready for
  a real sync.

Not verified: the extension's actual DOM scrape against x.com (needs a logged-in
browser session), and every OpenAI-backed route.
