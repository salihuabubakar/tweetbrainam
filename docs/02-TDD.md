# 02 — Technical Design Document (TDD)

## 1. System overview

```
                        ┌─────────────────────────────┐
                        │        apps/web (Next.js)    │
   Browser ───────────▶ │  RSC + client components     │
                        │  BFF: session cookie ↔ API   │
                        └──────────────┬──────────────┘
                                       │ typed client (hono/client)
                        ┌──────────────▼──────────────┐
                        │        apps/api (Hono)       │
                        │  REST /v1, authn/z, zod I/O  │
                        └──┬─────────┬─────────┬──────┘
                           │         │         │
                 ┌─────────▼──┐ ┌────▼───┐ ┌───▼──────────────┐
                 │ PostgreSQL │ │ Redis  │ │ apps/jobs         │
                 │ (Drizzle)  │ │ cache/ │ │ (Trigger.dev v4)  │
                 │ + pgvector │ │ ratelim│ │ ingest·plan·      │
                 └────────────┘ └────────┘ │ draft·publish·    │
                                           │ metrics·remind    │
                                           └──┬────────┬──────┘
                                              │        │
                                     ┌────────▼──┐  ┌──▼────────────┐
                                     │  X API    │  │ AI providers   │
                                     │ OAuth+REST│  │ Grok→OpenAI→   │
                                     └───────────┘  │ Claude (@core) │
                                                    └───────────────┘
                                     Resend (email) ◀── jobs/api
```

Three deployable units — `web`, `api`, `jobs` — sharing typed packages from the monorepo (see doc 09). Postgres is the single source of truth; Redis is ephemeral (cache, rate limits, locks); Trigger.dev owns all async work.

## 2. Key architectural decisions (ADR summary)

| # | Decision | Choice | Rationale / rejected alternatives |
|---|---|---|---|
| A1 | API placement | **Standalone Hono service**, not Next API routes | Independent scaling & deploys; jobs and web share one API surface; Hono RPC still gives end-to-end types. Rejected: Hono-in-Next (couples API lifecycle to frontend deploys) |
| A2 | Layering | **Clean Architecture, pragmatic** — `domain` (entities, ports) / `application` (use-cases) / `infrastructure` (Drizzle, X, AI, Resend adapters) / `interface` (Hono routes, Trigger tasks) | Ports & adapters where volatility is high (AI, X, email); no ceremonial layers around CRUD |
| A3 | Background work | **Trigger.dev v4** for all async (ingestion, generation, publishing, reminders, metrics) | Managed retries/observability/scheduling; keeps API request-scoped. Rejected: BullMQ (more infra to own), pg-boss (weaker DX) |
| A4 | AI abstraction | `AIProvider` port: `generateText`, `generateObject` (structured, zod-validated), `embed`. Adapters: Grok (default), OpenAI, Anthropic. Failover chain + per-task model tiering | Model churn is certain; abstraction is core IP protection |
| A5 | Embeddings | **pgvector** in Postgres | One database to operate; scale to a dedicated vector store only if proven necessary |
| A6 | Auth/session | X OAuth 2.0 PKCE → server session, httpOnly cookie, Redis-backed session store with sliding expiry | No JWT-in-localStorage; revocation is instant |
| A7 | Token storage | X access/refresh tokens encrypted **AES-256-GCM** (app-level key via env/KMS), never sent to client | Blast-radius control if DB leaks |
| A8 | Validation | **Zod schemas in `packages/contracts`** shared by web, api, jobs | Single source of truth for I/O types |
| A9 | IDs | UUIDv7 (time-ordered) app-generated | Index locality + generatable in any layer |
| A10 | Multi-account | `x_accounts` separate from `users` (1:N) from day one | Locked product decision; avoids painful migration |
| A11 | Payments | **`PaymentProvider` port in `core`, adapters in `packages/payment`** — same pattern as A4 (AI) and the X client. Default adapter: **Paystack**, selected via `PAYMENT_PROVIDER` env. Adapters planned: Flutterwave, Stripe, Lemon Squeezy | Provider choice varies by market (Paystack for NG/Africa launch) and is volatile; business logic (quotas, entitlements, subscription state) must never import a provider SDK. All provider-specific ids/payloads live in generic columns (`provider_customer_id`, provider `metadata` jsonb) |

## 3. Core flows

### 3.1 Auth (X OAuth PKCE)
1. `GET /v1/auth/x/start` → generate `state` + `code_verifier` (Redis, 10 min TTL) → redirect to X authorize URL.
2. Callback: verify state → exchange code → fetch profile → upsert `users` + `x_accounts` (tokens encrypted) → create session → redirect to `/onboarding` or `/today`.
3. Refresh: X access tokens expire in 2h. A token-refresh helper in `infrastructure/x` refreshes on-demand (with a Redis lock to prevent stampedes) and rotates stored tokens. Refresh failure → mark connection `revoked`, notify user.

### 3.2 Ingestion & Voice DNA build
1. `analyze-account` task (triggered post-OAuth or manually): paginate user tweets + replies (respecting X rate budget in Redis), normalize, store in `ingested_posts`, embed (pgvector).
2. `build-voice-profile` task: sample corpus → structured LLM extraction (`generateObject`) → traits: tone, formality, vocabulary quirks, sentence rhythm, emoji/hashtag policy, recurring formats, topics, opinions, sample-sounds-like sentences → write `voice_profiles` (new version).
3. `build-memory-profile`: extract stable facts (projects, audience, expertise, goals) → `memory_facts` (user-editable, source-linked).

### 3.3 Weekly plan → drafts
1. Scheduled task per user (their configured day/time): `generate-weekly-plan` — inputs: Voice DNA, memory facts, cadence, goals, recent performance, recent topics (anti-repetition) → creates `content_plans` + `plan_slots`.
2. `generate-draft` per slot (fan-out): prompt = voice profile + slot brief + few-shot user posts (vector-retrieved similar posts) → `drafts` (version 1) with `ai_generations` audit row (model, tokens, cost, latency). Retries: task-level default (3 attempts, exponential backoff). A failed attempt that will be retried leaves the draft/slot in `generating`/`drafting` — the use-case only writes the terminal `failed`/`empty` state once retries are exhausted (via the task's `onFailure` hook), so polling clients never see the status flap mid-retry.
3. User edits create new `draft_versions`; the diff between AI text and approved text becomes a `learning_signals` row.

### 3.4 Publishing
1. Approval sets `scheduled_posts` row (slot time, idempotency key).
2. Trigger.dev delayed run at publish time: re-check status (user may cancel), refresh token if needed, `POST /2/tweets` (thread = sequential replies), store `x_post_id`.
3. Retries: 3 attempts, exponential backoff, only on retryable errors (5xx/429 — respecting `retry-after`); duplicate-content 403 → fail with user-facing reason. All publishes idempotent via idempotency key check before send.

### 3.5 Learning loop (Phase 2)
`ingest-post-metrics` (24h/7d after publish) → `post_metrics` → periodic `refine-voice-profile` proposes a new Voice DNA version from accumulated `learning_signals` + performance; user is shown the diff and confirms (no silent voice drift).

### 3.6 Billing (Phase 3, architecture fixed now)

`PaymentProvider` port (defined in `core/ports/payment-provider.ts`):

- `createCustomer(user)` → `providerCustomerId`
- `createCheckoutSession(customer, plan)` → hosted checkout URL (all four target providers support hosted checkout)
- `cancelSubscription(providerSubscriptionId)` / `getSubscription(...)`
- `verifyWebhook(rawBody, signature)` → typed `PaymentEvent` union (`subscription_activated | payment_succeeded | payment_failed | subscription_canceled`)

Application use-cases (`activate-subscription`, `handle-payment-event`, `enforce-quota`) consume only this port and the normalized `PaymentEvent` union. Webhooks arrive at `/internal/webhooks/payment/:provider`; the matching adapter verifies the signature and normalizes the payload before anything touches the domain. Provider selection is boot-time config (`PAYMENT_PROVIDER=paystack`), resolved once in the composition root — switching providers is an env change plus data migration, not a code change.

## 4. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Observability | Pino structured logs w/ `request_id`; OpenTelemetry traces (api + jobs); Sentry for errors; Trigger.dev dashboard for job health; `/healthz` + `/readyz` |
| Rate limiting | Redis sliding-window: per-session API limits; per-account X API budget ledger; per-user AI generation quotas |
| Caching | Redis: session store, X profile cache, hot Voice DNA read-through; explicit TTLs; no cache as source of truth |
| Security | httpOnly/SameSite=Lax cookies, CSRF token on mutations, strict CSP, secrets via env (Doppler/1Password in CI), encrypted OAuth tokens, audit trail on AI generations and publishes |
| Testing | Vitest unit (domain + application, ports mocked); integration vs Testcontainers Postgres/Redis; contract tests on zod schemas; Playwright E2E on onboarding + approve→publish (X API mocked via MSW); AI eval harness with golden voice samples scored for fidelity |
| CI/CD | GitHub Actions: lint (Biome or ESLint+Prettier), typecheck, test, build, docker publish; Turborepo remote cache; migrations applied via `drizzle-kit migrate` release step before deploy |
| Config | Typed env parsing (zod) in `packages/config`; fail-fast at boot |

## 5. Capacity assumptions (first 12 months)

≤ 5k users, ≤ 25k drafts/week, ≤ 5k publishes/week. Single Postgres (with replica when needed), single Redis, 2× api instances behind LB. No premature sharding; pgvector fine at this scale (< 5M embedding rows). Cost ceiling for AI enforced by quotas, tracked per generation.
