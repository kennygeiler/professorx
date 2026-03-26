# Architecture Handoff -- ProfessorX

**Generated:** 2026-03-25
**Milestone Count:** 10

## Milestone Index

| # | Name | Key Dependencies |
|---|------|-----------------|
| M1 | Foundation and Project Scaffolding | None |
| M2 | Database Schema and Supabase Setup | M1 |
| M3 | Authentication System | M2 |
| M4 | Tweet Ingestion API | M2, M3 |
| M5 | Chrome Extension | M4 |
| M6 | Core UI -- Tweet Library View | M2, M3 |
| M7 | Search and Filtering | M6, M2 |
| M8 | AI Categorization Engine | M2, M3 |
| M9 | Category Management and Reclassification UI | M6, M8 |
| M10 | About Footer, Settings, and Polish | M6, M9 |

## Architecture Summary

Three-component system:
1. **Chrome Extension (Manifest V3):** Client-side tweet ingestion via XHR interception on x.com. Parses Twitter's internal API JSON, batches tweets, sends to backend.
2. **Next.js 15 Web App:** Mobile-first UI (Shadcn/ui + Tailwind), API routes for all data access, AI orchestration layer for categorization.
3. **Supabase:** PostgreSQL with RLS, full-text search (tsvector), auth. All access via API routes only.

AI: GPT-4o-mini for categorization with few-shot JSON memory (corrections stored in JSONB, cap 200).

## Key File Paths

- Master plan: `.kiln/master-plan.md`
- Architecture docs: `.kiln/docs/architecture.md`
- Tech stack: `.kiln/docs/tech-stack.md`
- Constraints: `.kiln/docs/arch-constraints.md`
- Research: `.kiln/docs/research.md`
- Vision: `.kiln/docs/VISION.md`

## Build Constraints

- All API routes must complete within 10 seconds (Vercel Hobby)
- AI batches: max 10 tweets per GPT-4o-mini call
- AI memory: max 200 corrections per user
- No server-side Twitter scraping -- extension only
- No direct Supabase access from frontend or extension
- RLS on every table
- Mobile-first: 375px min, 44x44px touch targets
- pnpm monorepo with shared types/schemas
- Manifest V3 only for extension
