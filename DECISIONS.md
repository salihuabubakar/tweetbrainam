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
| D20 | 2026-08-06 | Manual post import (paste) as a first-class ingestion path alongside the X API | accepted | X free tier returns 402 for timeline reads; paste path unblocks voice-quality validation without a $200/mo commitment, and permanently serves thin or newly-created accounts |
| D21 | 2026-08-06 | **Groq is the default AI provider** (`AI_FAILOVER_ORDER=groq,grok,openai`); all three implemented as one OpenAI-compatible adapter | accepted | Groq's free tier makes voice-quality iteration free; its API is OpenAI-compatible, so one adapter covers Groq, Grok, and OpenAI. Supersedes the Grok-first assumption in D10. Note: **Groq** (inference host) ≠ **Grok** (xAI model) |
| D22 | 2026-08-06 | Account deletion is a hard `DELETE` on `users`, relying on FK `ON DELETE CASCADE` throughout; the X token is revoked at X first, best-effort | accepted | The consent screen promises erasure, so soft-delete would make us liars. Every table already cascades from `users`; orphaned Trigger.dev publish runs fail closed because `publishScheduledPost` returns a non-retryable `not_found`. Revocation is best-effort because a token X has already invalidated must not block the user's deletion |
| D23 | 2026-08-06 | Changing cadence or timezone clears `postingWindows` rather than truncating them | accepted | `resolvePostingWindows` only trims a configured list, so raising the cadence would silently keep too few slots. Clearing hands the decision back to the inference path, which re-derives posting times from when the user actually posts |
| D24 | 2026-08-06 | Every publish run is tracked in `scheduled_posts.trigger_run_id`; a single `PublishScheduler` cancels the old run before arming a new one | accepted | The column existed but was never written, so rescheduling moved `publish_at` while the original run stayed armed at the old time, and cancelling left a run alive. DB checks made it fail closed rather than double-post, but posts could fire at the wrong time or fail for no visible reason |
| D25 | 2026-08-06 | Draft prompts include the user's real posts, retrieved by embedding similarity when an embedding key is set and by keyword + recency when it isn't; `EmbeddingProvider` port keeps both behind one interface | accepted | The prompt previously described the user's voice without ever showing it — the largest available quality lever was unused. Making the fallback first-class means voice fidelity does not depend on the user holding a paid API key, consistent with the Groq-first stance in D21 |
| D26 | 2026-08-06 | **Cohere `embed-v4.0` is the default embedding provider** (`COHERE_API_KEY`), with OpenAI `text-embedding-3-small` as fallback; `output_dimension: 1536` on both | accepted | Cohere's trial tier is free, matching the cost constraint that made Groq the default LLM. Pinning Cohere to 1536 dimensions makes it drop-in compatible with the existing `vector(1536)` column and with OpenAI, so switching providers never requires a migration or a re-embed. Cohere v3+ also requires `input_type`, so the port carries an explicit `EmbeddingPurpose` — `document` when indexing posts, `query` when retrieving for a draft |

| D27 | 2026-08-06 | Memory facts are archived, never deleted; extraction only adds, never overwrites; user-provided facts outrank extracted ones in the prompt | accepted | The model re-reads the same posts on every rebuild, so overwriting would repeatedly discard corrections the user made by hand. Archiving keeps provenance for the Phase 2 learning loop. A confidence floor of 0.5 plus normalised duplicate matching stops the profile filling with restatements of the same fact |

| D28 | 2026-08-06 | Weekly planning runs as an hourly sweep that selects users whose *local* time is Sunday 17:00, rather than per-user Trigger.dev schedules | accepted | Per-user schedules would put lifecycle state in Trigger.dev that has to stay in sync with the database on signup, timezone change, and account deletion — three new failure modes. An hourly sweep keeps the decision in `packages/core` where it is unit-testable, and `generateWeeklyPlan` is already idempotent per `weekStart`, so a repeated hour cannot double-plan |
| D29 | 2026-08-06 | The planning week is derived from the user's local calendar date via `nextMondayInZone`, not from the UTC timestamp | accepted | For a user behind UTC, their Sunday evening is already Monday in UTC, so `nextMondayOf(now)` would skip a week and plan eight days out instead of one. Deriving the date in the user's zone first fixes it; a test pins both readings |

| D30 | 2026-08-06 | **7-day free trial** (`trial` plan code, `trial_ends_at`) with caps counted for the life of the trial under the period `"trial"`, not per calendar month; expiry is read-only, never a locked door | accepted | Seven days guarantees one Sunday, so every trial sees the weekly planning run at least once — the thing the product is actually for. Monthly buckets would have handed anyone signing up on the 30th a fresh allowance two days in. Read-only expiry matters because there is no checkout to send anyone to yet; deleting access to work they made would be the wrong lesson. Column defaults stay `free_beta`/`active` so an unexpected row is never silently a trial, and accounts with no subscription row fall back to a grandfathered `free_beta` |
| D31 | 2026-08-06 | **Web Push replaces email for F9.** No `EmailSender`, no Resend, no email capture in onboarding | accepted | X OAuth returns no email address, so `users.email` is always null — F9 was unbuildable as specified. Push needs no address and lands the user directly in the review queue. Subscriptions are keyed on endpoint so one person is reachable on several devices, and are deleted only on 404/410 from the push service; a transient failure must not silently unsubscribe anyone. iOS requires Home Screen install, so the UI detects that case and explains it rather than showing a control that cannot work |
| D32 | 2026-08-06 | PWA service worker caches only content-hashed static assets and an offline page; `/api/*` is never cached under any strategy | accepted | Almost all app state is live server data. A cached draft queue or a stale approval state would let someone believe they had approved a post they had not — for a product whose promise is that nothing publishes without consent, a stale cache is a correctness bug, not a performance win |

## Deferred decisions (revisit when triggered)

| Topic | Default until then | Trigger to revisit |
|---|---|---|
| Self-hosting Trigger.dev vs cloud | Cloud | Cost at scale or data-residency requirement |
| Dedicated vector store | pgvector | >5M embedding rows or recall/latency problems |
| Kubernetes | Container host (Railway/Fly/Render class) | Replica count or team size demands it |
| Additional payment adapters | Paystack only | Market demand outside Paystack coverage |
| SSE/streaming for generation status | 202 + polling | User-visible latency complaints |
