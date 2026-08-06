# 09 — Monorepo Folder Structure

Tooling: **pnpm workspaces + Turborepo**, TypeScript project references, single version policy for shared deps (syncpack), Node 22.

```
tweetbrainam/
├── apps/
│   ├── web/                          # Next.js 15 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/      # /, /pricing, /privacy, /login
│   │   │   │   ├── (onboarding)/onboarding/[step]/
│   │   │   │   ├── (app)/            # authed shell: sidebar + views
│   │   │   │   │   ├── today/  plan/  drafts/  voice/  analytics/  settings/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/           # app-specific composites (feature-scoped)
│   │   │   │   ├── drafts/  plan/  voice/  shared/
│   │   │   │   └── ...
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # typed hono/client instance
│   │   │   │   ├── auth.ts           # session helpers (server-side)
│   │   │   │   └── ...
│   │   │   └── styles/
│   │   ├── Dockerfile
│   │   └── next.config.ts            # output: 'standalone'
│   │
│   ├── api/                          # Hono service
│   │   ├── src/
│   │   │   ├── index.ts              # boot: env → deps → server
│   │   │   ├── app.ts                # compose middleware + routes, export AppType
│   │   │   ├── middleware/           # session, csrf, rate-limit, error, request-id
│   │   │   └── routes/               # thin HTTP adapters → core use-cases
│   │   │       ├── auth.ts  me.ts  accounts.ts  voice.ts  memory.ts
│   │   │       ├── plans.ts  drafts.ts  schedule.ts
│   │   │       └── internal.ts       # webhooks, healthz
│   │   └── Dockerfile
│   │
│   └── jobs/                         # Trigger.dev v4 project
│       ├── src/trigger/
│       │   ├── analyze-account.ts    # ingestion pipeline
│       │   ├── build-voice-profile.ts
│       │   ├── generate-weekly-plan.ts
│       │   ├── generate-draft.ts
│       │   ├── publish-post.ts
│       │   ├── send-reminders.ts
│       │   ├── ingest-post-metrics.ts     # Phase 2
│       │   ├── refine-voice-profile.ts    # Phase 2
│       │   └── purge-deleted-account.ts
│       └── trigger.config.ts
│
├── packages/
│   ├── core/                         # THE domain — framework-free
│   │   ├── src/
│   │   │   ├── domain/               # entities, value objects, state machines, events
│   │   │   │   ├── content/  intelligence/  identity/  insights/
│   │   │   ├── application/          # use-cases; one file per verb
│   │   │   │   ├── approve-draft.ts  generate-plan.ts  connect-account.ts ...
│   │   │   ├── ports/                # interfaces the outside must satisfy
│   │   │   │   ├── ai-provider.ts  x-client.ts  payment-provider.ts  mailer.ts  repositories.ts  clock.ts
│   │   │   └── index.ts
│   │   └── (zero runtime deps beyond zod; no drizzle/hono/next imports — lint-enforced)
│   │
│   ├── db/                           # Drizzle schema + repositories (implements core ports)
│   │   ├── src/schema/               # one file per table group
│   │   ├── src/repositories/
│   │   ├── migrations/
│   │   └── drizzle.config.ts
│   │
│   ├── ai/                           # AIProvider adapters
│   │   ├── src/providers/grok.ts  openai.ts  anthropic.ts
│   │   ├── src/failover.ts           # chain + circuit breaker
│   │   ├── src/prompts/              # versioned prompt templates per purpose
│   │   └── src/evals/                # golden-sample voice fidelity harness
│   │
│   ├── x-api/                        # X client (implements XClient port)
│   │   └── src/  oauth.ts  tweets.ts  users.ts  rate-budget.ts  errors.ts
│   │
│   ├── payment/                      # PaymentProvider adapters (Phase 3; package exists from day one)
│   │   ├── src/providers/paystack.ts       # default (PAYMENT_PROVIDER=paystack)
│   │   ├── src/providers/flutterwave.ts    # planned
│   │   ├── src/providers/stripe.ts         # planned
│   │   ├── src/providers/lemonsqueezy.ts   # planned
│   │   ├── src/webhook-normalizer.ts       # provider payload → PaymentEvent union
│   │   └── src/index.ts                    # resolvePaymentProvider(env) factory
│   │
│   ├── contracts/                    # zod schemas: API I/O, jsonb payloads, error codes
│   │   └── src/  api/  entities/  errors.ts
│   │
│   ├── email/                        # Resend adapter + react-email templates
│   │   └── src/templates/  plan-ready.tsx  publish-reminder.tsx  publish-failed.tsx
│   │
│   ├── ui/                           # shared shadcn/ui-based design system
│   │   └── src/components/  hooks/  tokens/    # button, status-chip, editor, ...
│   │
│   └── config/                       # typed env (zod), constants, shared tsconfig/eslint
│       ├── src/env.ts
│       ├── eslint/  typescript/      # shareable configs
│       └── src/constants.ts
│
├── docs/                             # ← these ten documents
├── docker/                           # compose files, proxy config, init scripts
│   ├── compose.yml  compose.e2e.yml
├── .github/workflows/                # ci.yml (lint/type/test/build), deploy.yml
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json (or eslint+prettier)
└── package.json
```

## Dependency rules (enforced with eslint-plugin-boundaries or dependency-cruiser)

```
apps/web  ──▶ contracts, ui, config            (talks to api over HTTP only)
apps/api  ──▶ core, contracts, db, ai, x-api, payment, email, config
apps/jobs ──▶ core, contracts, db, ai, x-api, payment, email, config
core      ──▶ (nothing internal; zod only)     # the center depends on no one
db/ai/x-api/payment/email ──▶ core (ports), contracts, config
ui        ──▶ (nothing internal)
```

Key properties: `core` is framework-free and fully unit-testable; swapping Grok→Claude, Paystack→Flutterwave, or Drizzle→anything touches one package; web can never import the database; api and jobs share identical business logic instead of duplicating it. Provider adapters (`ai`, `x-api`, `payment`, `email`) are structurally identical: implement a core port, get selected at the composition root from env config, and are the only places allowed to import a provider SDK (lint-enforced).

## Turborepo pipeline

`build` (dependency-ordered, cached) · `dev` (parallel, persistent) · `lint` · `typecheck` · `test` · `test:integration` (Testcontainers) · `db:generate` / `db:migrate`. Remote caching on in CI.
