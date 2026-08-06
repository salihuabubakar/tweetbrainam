# CLAUDE.md — Agent instructions for TweetBrainam

You are working in a production-grade AI SaaS monorepo. Architecture is decided and documented; implement against it. When a task conflicts with `docs/`, raise the conflict before writing code — do not silently deviate (R30).

## What this is

AI Content Brain for X creators: learns a user's voice from their posts (OAuth-consented), builds versioned Voice DNA + Memory Profile, generates weekly plans and drafts, schedules and publishes approved posts, learns from edits and performance.

**Inviolable invariant: no code path may reach the `publishing` state without a recorded human approval event.** Changes near the publish path get extra scrutiny (R25).

## Source of truth

`docs/00-INDEX.md` → PRD (01), TDD (02, includes ADR table), Domain Model (03), DB Schema (06), API (07), Docker (08), Monorepo (09), Roadmap (10), Engineering Principles (11, rules R1–R47). `DECISIONS.md` logs architectural decisions. A change in behavior requires the matching doc update in the same PR (R26).

## Architecture in 30 seconds

- Three deployables: `apps/web` (Next.js 15), `apps/api` (Hono), `apps/jobs` (Trigger.dev v4).
- `packages/core` is the framework-free center: `domain/` (entities, state machines, events), `application/` (one use-case per file, `verb-noun.ts`), `ports/` (interfaces).
- Adapter packages implement ports: `db` (Drizzle), `ai` (Grok/OpenAI/Anthropic), `x-api`, `payment` (Paystack default, `PAYMENT_PROVIDER` env), `email` (Resend).
- `packages/contracts` holds every zod schema (API I/O, jsonb payloads, error codes). Web talks to api only through the typed `hono/client`.
- Postgres is the sole source of truth; Redis is reconstructible; all async work is idempotent Trigger.dev tasks.

## Hard rules for generated code

1. **No comments.** Write self-explanatory code: intention-revealing names, small functions, early returns. The only permitted comment is a rare `why` for an external quirk or documented workaround, with a link. Never emit comments that narrate what the code does, TODO markers, or section banners.
2. Dependency direction (lint-enforced, CI-blocking): `core` imports nothing internal; provider SDKs only inside their adapter package; `apps/web` never imports `db` or `core`.
3. Business logic lives in `core/application` use-cases returning typed `Result` values. Routes and Trigger tasks stay thin: parse → call use-case → map result.
4. Status changes go through domain state-machine transitions, never direct `db.update({status})`.
5. All external input — HTTP bodies, X API responses, **LLM output**, jsonb, env — is parsed through a `contracts` zod schema exactly once at the boundary.
6. `strict` TypeScript, no `any`, no unjustified `as`. Files ≤400 lines, functions ≤50, one primary export per file, kebab-case filenames.
7. Frontend: Server Components by default, `'use client'` at leaves; no `useEffect` fetching; state per R41 (server → RSC/TanStack Query, filters → URL, ephemeral → useState); Tailwind with design tokens only — no raw hex/px; WCAG 2.1 AA semantics.
8. Never log or serialize tokens/secrets; authorization happens in use-cases, not routes.
9. Every use-case you write ships with unit tests (stub ports, inject `Clock`); every bug fix ships with the regression test.
10. Migrations: generate with drizzle-kit, expand → migrate → contract, never edit a merged migration.

## Commands

```bash
pnpm dev · pnpm build · pnpm lint · pnpm typecheck
pnpm test · pnpm test:integration
pnpm db:generate · pnpm db:migrate
docker compose up
```

## Git

Branch `type/short-kebab-desc`; Conventional Commits with package scope (`feat(core): …`); small PRs that cite the rules they touch; `main` always deployable.

## When unsure

Prefer the smaller, scoped change (R31). Check the ADR table in `docs/02-TDD.md` §2 and `DECISIONS.md` before introducing any new library, pattern, or provider — if it's not covered, propose it as a decision first, don't just add it.
