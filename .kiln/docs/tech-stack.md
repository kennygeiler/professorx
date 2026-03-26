# Tech Stack -- ProfessorX

## Languages

| Language | Where | Rationale |
|----------|-------|-----------|
| TypeScript 5.x | Everywhere (web app, extension, shared types) | Type safety across the full stack; single language for one developer |

## Frameworks and Libraries

### Web Application

| Dependency | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Next.js | 15.x (App Router) | Full-stack React framework | SSR, API routes, Vercel zero-config, largest React ecosystem |
| React | 19.x | UI library | Bundled with Next.js 15 |
| Shadcn/ui | latest | Component library | Copy-paste components (not a dependency), Tailwind-based, accessible, customizable |
| Tailwind CSS | 4.x | Utility CSS | Fast styling, mobile-first responsive design, pairs with Shadcn/ui |
| NextAuth.js (Auth.js) | 5.x | Authentication | Built-in Twitter OAuth 2.0 PKCE provider, Supabase adapter |
| @supabase/supabase-js | 2.x | Database client | Typed Supabase queries, RLS-aware, serverless-compatible |
| openai | 4.x | OpenAI API client | GPT-4o-mini categorization + text-embedding-3-small |
| zod | 3.x | Schema validation | API input validation, type inference, shared with extension |

### Browser Extension

| Dependency | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Chrome Extension Manifest V3 | -- | Extension platform | Required for Chrome extensions as of 2024; service worker model |
| TypeScript | 5.x | Type safety | Shared types with web app |
| (no framework) | -- | Content script + service worker | Extensions are lightweight; React adds unnecessary bundle size |

### Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager (fast, disk-efficient, workspace support for monorepo) |
| ESLint + Prettier | Linting and formatting |
| Vitest | Unit testing (Vite-native, fast, Jest-compatible API) |
| Playwright | E2E testing (if needed; same tool as researched for scraping) |

## External Services

| Service | Tier | Purpose | Cost |
|---------|------|---------|------|
| Vercel | Hobby (free) | Next.js hosting, CDN, serverless functions | $0/mo |
| Supabase | Free (500MB, 50K MAU) | PostgreSQL, Auth, RLS, pgvector | $0/mo |
| OpenAI API | Pay-per-use | GPT-4o-mini categorization, text-embedding-3-small embeddings | ~$0.01/1K tweets |

## AI Models

| Model | Use Case | Pricing (as of mid-2025) |
|-------|----------|-------------------------|
| GPT-4o-mini | Tweet categorization | $0.15/1M input, $0.60/1M output |
| text-embedding-3-small | Semantic search embeddings (V1.1) | $0.02/1M tokens, 1536 dims |

## Repository Structure

```
professorx/
  apps/
    web/                   # Next.js 15 app
      app/                 # App Router pages and layouts
        api/               # Route handlers
        (main)/            # Main library view
        settings/          # Settings page
      components/          # React components
      lib/                 # Utilities, AI service, Supabase client
      types/               # Shared TypeScript types
    extension/             # Chrome Extension (Manifest V3)
      manifest.json
      background.ts        # Service worker
      content.ts           # Content script (x.com)
      popup/               # Extension popup UI
  packages/
    shared/                # Shared types, constants, schemas (zod)
  pnpm-workspace.yaml
  tsconfig.base.json
```

**Monorepo rationale:** A pnpm workspace monorepo keeps the web app and extension in one repo with shared TypeScript types and zod schemas. This prevents type drift between the extension's tweet parsing and the backend's ingestion API.

## Version Pinning Policy

- Pin major versions in package.json (e.g., `"next": "^15.0.0"`)
- Lock exact versions via pnpm-lock.yaml
- Supabase schema migrations tracked in `supabase/migrations/`
- No version drift between extension and web app shared types (monorepo enforces this)
