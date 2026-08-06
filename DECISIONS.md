# DECISIONS.md — Architectural Decision Log

Append-only. Statuses: **accepted** · **superseded by Dxx** · **deprecated**. New decisions require a PR adding a row here (and an ADR row in `docs/02-TDD.md` §2 when architectural). Never edit an accepted decision's rationale — supersede it.

## Product decisions

| ID | Date | Decision | Status | Rationale |
|---|---|---|---|---|
| D1 | 2026-08-05 | Human approval required before any publish — permanent product rule, not an MVP cut | accepted | Authenticity is the product; also keeps us clearly compliant with X automation policy |
| D2 | 2026-08-05 | X OAuth 2.0 (PKCE) is the only sign-in method | accepted | Posting requires X OAuth anyway; one flow, zero friction; email captured for notifications |
| D3 | 2026-08-05 | Billing is post-MVP; free beta with server-enforced quotas; billing schema dormant from day one | accepted | Validate the learning loop before monetizing; avoid later migration pain |
| D4 | 2026-08-05 | Schema models user→many X accounts; MVP UI exposes one | accepted | Agencies/ghostwriters are a likely expansion; migration would be painful later |
| D5 | 2026-08-05 | Memory Profile is fully visible and editable by the user | accepted | Trust is a feature; the user always controls what the AI knows about them |
| D6 | 2026-08-05 | Web-only responsive MVP; no mobile app, no non-X platforms; `platform` fields kept open | accepted | Focus; architecture leaves the door open |

## Architecture decisions (mirrors ADR table in docs/02-TDD.md §2)

| ID | Date | Decision | Status | Rationale |
|---|---|---|---|---|
| D7 (A1) | 2026-08-05 | Standalone Hono API service, not Next.js API routes | accepted | Independent scaling/deploys; one API surface for web and jobs; `hono/client` keeps end-to-end types |
| D8 (A2) | 2026-08-05 | Pragmatic Clean Architecture: domain/application/ports in `packages/core`; adapters outside | accepted | Ports where volatility is high (AI, X, payments, email); no ceremony around CRUD |
| D9 (A3) | 2026-08-05 | Trigger.dev v4 for all background work | accepted | Managed retries/observability/scheduling over self-hosted BullMQ/pg-boss |
| D10 (A4) | 2026-08-05 | `AIProvider` port; Grok default with OpenAI/Anthropic adapters and failover chain | accepted | Model churn is certain; abstraction protects core IP |
| D11 (A5) | 2026-08-05 | pgvector in Postgres for embeddings | accepted | One database to operate; revisit only past ~5M rows |
| D12 (A6) | 2026-08-05 | Server sessions in Redis, httpOnly cookie; no client-held JWT | accepted | Instant revocation; smaller attack surface |
| D13 (A7) | 2026-08-05 | X tokens encrypted at rest (AES-256-GCM), never sent to client | accepted | Blast-radius control |
| D14 (A8) | 2026-08-05 | Single zod contracts package shared by web/api/jobs | accepted | One source of truth for I/O types |
| D15 (A9) | 2026-08-05 | UUIDv7 app-generated IDs | accepted | Time-ordered index locality; generatable in any layer |
| D16 (A10) | 2026-08-05 | pnpm + Turborepo monorepo with CI-enforced dependency boundaries | accepted | Shared types without publish overhead; boundaries keep the core clean |
| D17 (A11) | 2026-08-06 | `PaymentProvider` port in core, adapters in `packages/payment`; **Paystack default** via `PAYMENT_PROVIDER`; Flutterwave/Stripe/Lemon Squeezy compatible; generic provider columns in DB | accepted | Provider choice varies by market (Paystack for NG/Africa launch) and is volatile; switching is env change + data migration. Supersedes the earlier Stripe-specific assumption |
| D18 | 2026-08-06 | Comment-free, self-explanatory code as the default; comments only for external quirks/workarounds with links | accepted | Names and structure carry intent; narration comments rot and hide real signal |
| D19 | 2026-08-06 | Biome (lint+format) + dependency-cruiser (boundary enforcement); root `compose.yaml` for `docker compose up` DX | accepted | One fast tool for lint/format; dependency-cruiser enforces R1/R2 boundaries that Biome can't express. Resolves the deferred lint-tooling decision |

## Deferred decisions (revisit when triggered)

| Topic | Default until then | Trigger to revisit |
|---|---|---|
| Self-hosting Trigger.dev vs cloud | Cloud | Cost at scale or data-residency requirement |
| Dedicated vector store | pgvector | >5M embedding rows or recall/latency problems |
| Kubernetes | Container host (Railway/Fly/Render class) | Replica count or team size demands it |
| Additional payment adapters | Paystack only | Market demand outside Paystack coverage |
| SSE/streaming for generation status | 202 + polling | User-visible latency complaints |
