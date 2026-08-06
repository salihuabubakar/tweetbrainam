# TweetBrainam

An AI Content Brain for X (Twitter) creators. TweetBrainam learns each user's writing style, interests, and goals from their own posts (with explicit OAuth consent), builds a versioned **Voice DNA** and **Memory Profile**, then plans, drafts, schedules, and publishes content that sounds like *them* — with a human approving every post.

**Hard product rule: nothing is ever published without explicit human approval.**

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui |
| API | Hono (standalone service, typed end-to-end via `hono/client`) |
| Data | PostgreSQL 16 + pgvector · Drizzle ORM · Redis (cache/sessions/rate limits) |
| Jobs | Trigger.dev v4 (ingestion, generation, publishing, reminders) |
| AI | Provider abstraction — Grok default, OpenAI/Claude adapters |
| Payments | Provider abstraction — Paystack default (Phase 3); Flutterwave/Stripe/Lemon Squeezy compatible |
| Email | Resend + react-email |
| Infra | Docker-first · pnpm + Turborepo monorepo · GitHub Actions CI |

## Quickstart

```bash
git clone <repo> && cd tweetbrainam
cp .env.example .env        # fill in X + AI credentials
docker compose up            # postgres, redis, mailpit, migrations, web :3000, api :3001
```

Trigger.dev tasks in dev: `pnpm --filter jobs dev` (runs the Trigger CLI against local services).

## Repository layout

```
apps/       web (Next.js) · api (Hono) · jobs (Trigger.dev)
packages/   core (domain — framework-free) · db · ai · x-api · payment · email
            contracts (zod schemas) · ui (design system) · config (typed env)
docs/       01-PRD … 11-ENGINEERING-PRINCIPLES — the source of architectural truth
docker/     compose files, proxy config
```

Dependency direction is enforced in CI: everything points inward to `packages/core`, which imports nothing but zod. Provider SDKs (X, AI, payment, email) may only be imported inside their adapter package.

## Common commands

```bash
pnpm dev                 # all apps in parallel (turbo)
pnpm build               # dependency-ordered build
pnpm lint && pnpm typecheck
pnpm test                # unit (core is <5s, zero I/O)
pnpm test:integration    # Testcontainers postgres/redis
pnpm db:generate         # drizzle-kit generate (commit the migration)
pnpm db:migrate          # apply migrations
```

## Documentation

Start with [`docs/00-INDEX.md`](docs/00-INDEX.md). The PRD (what we're building), TDD (how), and Engineering Principles (the rules, cited as R1–R47 in reviews) are binding — PRs that contradict them must update them or will be rejected.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Working with an AI agent? It reads [CLAUDE.md](CLAUDE.md). Architectural decisions and their history live in [DECISIONS.md](DECISIONS.md).
