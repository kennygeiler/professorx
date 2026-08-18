# AI Setup Prompt

Copy and paste this entire prompt into Claude Code, Cursor, Windsurf, or any AI coding assistant to set up readXlater automatically.

---

## The Prompt

```
I just cloned readXlater and need to set it up locally. Here's what I need you to do:

1. **Create a Supabase project** — guide me through creating one at supabase.com if I don't have one. I need the project URL, anon key, and service role key.

2. **Run database migrations** — there are 7 SQL migration files in supabase/migrations/. Run them in order (001 through 007) against my Supabase project using the SQL editor.

3. **Get an Anthropic API key** — remind me to get one from console.anthropic.com/settings/keys if I don't have one.

4. **Generate an API key** — run `openssl rand -hex 32` and save the output.

5. **Create .env.local** — copy apps/web/.env.example to apps/web/.env.local and fill in:
   - NEXT_PUBLIC_SUPABASE_URL (from step 1)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (from step 1)
   - SUPABASE_SERVICE_ROLE_KEY (from step 1)
   - API_KEY (from step 4)
   - LOCAL_USER_ID (a UUID — generate with `uuidgen | tr 'A-Z' 'a-z'`)
   - ANTHROPIC_API_KEY (from step 3)

6. **Install dependencies** — run `pnpm install` from the repo root.

7. **Start the dev server** — run `cd apps/web && pnpm dev`.

8. **Build the Chrome extension** — run `cd apps/extension && npx tsx build.ts`.

9. **Tell me how to load the extension** in Chrome and connect it with my API key and Twitter handle.

10. **Verify everything works** — open http://localhost:3000, confirm the empty state shows setup instructions. Then I'll sync via the extension.

The repo is at: {paste your local path here}
```

---

## What the AI will do

Any modern AI coding assistant (Claude Code, Cursor, Windsurf, Copilot) can execute this prompt. It will:

- Walk you through each service signup
- Run the shell commands for you
- Create and fill your .env.local
- Build the extension
- Verify the setup works

Total time: ~10 minutes. Supabase's free tier covers the database; Anthropic API usage is pay-as-you-go.

---

## If you already have accounts

Shorter version — paste this:

```
Set up readXlater locally. I already have:
- Supabase project URL: [paste]
- Supabase anon key: [paste]
- Supabase service role key: [paste]
- Anthropic API key: [paste]

Create .env.local from the example, fill in my keys, generate an API_KEY,
run the database migrations, install deps, start the dev server, and build
the Chrome extension. The repo is at: [paste path]
```
