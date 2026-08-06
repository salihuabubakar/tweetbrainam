# 07 — API Architecture (Hono)

## 1. Principles

- REST, versioned under `/v1`. Resource-oriented; state changes via explicit action endpoints (`/approve`, `/publish-now`) rather than PATCHing status fields — statuses are state machines, not data.
- Every request/response validated by zod schemas from `packages/contracts` (`@hono/zod-validator`). The Hono `AppType` is exported; `apps/web` consumes it via `hono/client` for end-to-end types with zero codegen.
- Auth: session cookie (httpOnly, SameSite=Lax) set by the auth flow. CSRF token required on mutations. No tokens in the browser.
- OpenAPI spec generated from the zod schemas (`hono-openapi`) — docs stay in lockstep with code.

## 2. Middleware chain (order matters)

```
requestId → logger(pino) → CORS(web origin) → securityHeaders → session
→ csrf(mutations) → rateLimit(redis) → [route] → errorHandler
```

Error envelope (every non-2xx):
```json
{ "error": { "code": "draft_not_editable", "message": "Approved drafts are locked.", "requestId": "…" } }
```
Codes are a typed union in `packages/contracts` — the web app switches on `code`, never on message text.

## 3. Endpoints (v1)

### Auth & session
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/auth/x/start` | Begin PKCE flow (redirect) |
| GET | `/v1/auth/x/callback` | Exchange code, create session |
| POST | `/v1/auth/logout` | Destroy session |
| GET | `/v1/me` | Current user + primary account + onboarding step |
| PATCH | `/v1/me` | Update profile/preferences/timezone |
| DELETE | `/v1/me` | Request account deletion (async purge) |

### Accounts & intelligence
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/accounts` | Connected X accounts + status |
| POST | `/v1/accounts/:id/reanalyze` | Re-run ingestion + voice build (quota-gated) |
| GET | `/v1/accounts/:id/analysis-status` | Progress for onboarding screen |
| GET | `/v1/voice` | Active Voice DNA (+ `?version=` history) |
| PATCH | `/v1/voice` | Edit traits/rules → new user_edit version |
| POST | `/v1/voice/activate/:version` | Roll back/forward |
| GET | `/v1/memory` | List memory facts (filter by category/status) |
| POST | `/v1/memory` / PATCH `/v1/memory/:id` / DELETE `/v1/memory/:id` | Manage facts |

### Planning & drafting
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/plans/current` | This week's plan + slots + draft statuses |
| POST | `/v1/plans/generate` | Generate/regenerate week (idempotent per week) |
| PATCH | `/v1/plans/slots/:id` | Edit topic/format/time; skip |
| POST | `/v1/plans/slots/:id/regenerate-draft` | New draft for slot, optional guidance note |
| GET | `/v1/drafts?status=needs_review` | List drafts |
| POST | `/v1/drafts` | Ad-hoc draft (from topic or raw idea) |
| GET | `/v1/drafts/:id` | Draft + versions |
| PUT | `/v1/drafts/:id/content` | User edit → new version (captures learning signal) |
| POST | `/v1/drafts/:id/approve` | Approve + schedule `{publishAt}` |
| POST | `/v1/drafts/:id/reject` | Reject with optional reason |

### Schedule & publishing
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/schedule?from&to` | Scheduled/published posts window |
| PATCH | `/v1/schedule/:id` | Reschedule |
| POST | `/v1/schedule/:id/cancel` | Cancel (reverts draft to approved) |
| POST | `/v1/schedule/:id/publish-now` | Immediate publish |
| POST | `/v1/schedule/:id/retry` | Retry a failed publish |

### Insights, notifications, usage
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/metrics/posts?window=d7` | Per-post metrics (Phase 2) |
| GET | `/v1/insights` / POST `/v1/insights/:id/dismiss` | Recommendations (Phase 2) |
| GET/PATCH | `/v1/notification-preferences` | Notification settings |
| GET | `/v1/usage` | Quota consumption vs plan limits |

### Internal (service-to-service, HMAC-signed, not public)
`/internal/webhooks/resend` (delivery events) · `/internal/webhooks/payment/:provider` (Phase 3 — the `:provider` param selects the adapter that verifies the signature and normalizes the payload; one route serves Paystack, Flutterwave, Stripe, or Lemon Squeezy identically) · `/healthz` · `/readyz`.

Billing routes (Phase 3, provider-agnostic — the client never learns which provider is active):
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/billing/subscription` | Current plan, status, period, quota limits |
| POST | `/v1/billing/checkout` | Returns hosted checkout URL from the active provider |
| POST | `/v1/billing/cancel` | Cancel at period end |

Trigger.dev tasks do **not** call HTTP endpoints — they import application-layer use-cases directly from `packages/core` (same process model, no network hop, same types).

## 4. Semantics & conventions

- **Pagination**: cursor-based (`?cursor=&limit=`), `nextCursor` in response. No offsets.
- **Idempotency**: `Idempotency-Key` header honored on `approve`, `publish-now`, `plans/generate`; keys stored in Redis 24h.
- **Long-running work**: generation endpoints return `202 { jobId }`; clients poll status endpoints (SSE later if needed). No request blocks on an LLM.
- **Rate limits**: 60 req/min/session default; generation endpoints additionally quota-checked against `usage_records`. `429` includes `Retry-After`.
- **Timestamps**: ISO-8601 UTC in transit; client renders in user timezone.

## 5. Versioning & evolution

Additive changes (new fields/endpoints) don't bump the version. Breaking changes → `/v2` alongside `/v1` with a deprecation window. The zod contracts package is versioned with the repo, so web/api/jobs can never drift within a deploy.
