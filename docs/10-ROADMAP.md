# 10 — Development Roadmap: MVP → Production

Assumes one senior engineer (you) + AI pair, part-to-full time. Durations are focused-work estimates; each phase ends with a demoable, deployed increment. Ship to a live staging URL from Phase 0 onward.

## Phase 0 — Foundation (Week 1–2)

Goal: an empty but production-shaped system deployed end-to-end.

- Monorepo scaffold (pnpm + Turborepo, packages per doc 09), lint/typecheck/test wiring, dependency-boundary rules.
- Docker compose dev environment (postgres+pgvector, redis, mailpit) per doc 08.
- `packages/config` typed env; `packages/contracts` seeded with error codes.
- Drizzle setup + first migration (users, x_accounts, sessions plumbing).
- Hono skeleton with full middleware chain, `/healthz`, error envelope.
- Next.js shell: marketing landing, app layout with sidebar, theme system, `packages/ui` seeded with shadcn.
- CI (lint/type/test/build + docker publish) and deploy pipeline to staging.
- **Exit criteria**: `docker compose up` works from a clean clone; CI green; staging serves the landing page through the real proxy/api topology.

## Phase 1 — MVP core loop (Week 3–8)

Goal: the full loop — *connect → analyze → plan → draft → approve → schedule → publish → remind* — for a single X account. Private alpha (~10 hand-picked users).

| Week | Deliverable |
|---|---|
| 3 | X OAuth PKCE end-to-end; encrypted token storage + refresh; session auth; `/v1/me` |
| 4 | Ingestion pipeline (`analyze-account` task, rate-budgeted, watermarked); onboarding consent + analyzing screens |
| 5 | Voice DNA v1 + Memory extraction (`generateObject` + zod); onboarding voice review + goals steps; `/v1/voice`, `/v1/memory` |
| 6 | Weekly plan generation + Plan view; draft generation with vector few-shot; Drafts list + editor |
| 7 | Approval workflow (versions, edit-diff learning signals); scheduling; `publish-post` task with idempotency + retries; Today view |
| 8 | Reminder emails (react-email + Resend); usage quotas; onboarding steps 7–10 polished; alpha onboarding of first users |

- **Exit criteria**: a new user goes landing→published post in <10 min with no operator help; publish success rate >99% (excluding X outages); zero unapproved publishes (audit-verified).

## Phase 2 — Learn & polish (Week 9–14) — open beta

Goal: the product visibly improves with use; beta opens with a waitlist.

- Metrics ingestion (T+24h/T+7d) and Analytics view; Insight generation.
- Learning loop v2: `refine-voice-profile` consumes learning signals + performance; user-confirmed Voice DNA revisions (diff UI).
- Thread support hardening, media attachments on posts.
- Regenerate-with-guidance everywhere; ⌘K palette; keyboard-first review flow.
- AI eval harness in CI (voice-fidelity score gates prompt changes); prompt versioning.
- Observability hardening: Sentry, OTel traces, alerting on publish failures and job backlogs; load test the publisher.
- Account deletion/export (GDPR) fully automated.
- **Exit criteria**: draft acceptance rate measurably rising for cohort users; W4 retention ≥ 25% in beta; on-call-able dashboards exist.

## Phase 3 — Production & monetization (Week 15–20) — public launch

- Billing activated on the dormant schema via `packages/payment` (`PaymentProvider` port, **Paystack adapter first** — `PAYMENT_PROVIDER=paystack`); free/pro tiers, hosted checkout, webhook-driven subscription state, metered quota display, dunning emails. Flutterwave/Stripe/Lemon Squeezy adapters added only when market demand justifies.
- Provider failover battle-tested (chaos test: kill Grok, drafts still generate); per-plan model tiering.
- Multi-account UI (agency early access) if beta demand supports it — schema already ready.
- Security pass: dependency audit, secret rotation drill, pen-test checklist, rate-limit tuning, X token revocation handling.
- Performance: p95 API < 200ms (non-AI routes), route-level code splitting, image/CDN pass, Core Web Vitals green.
- Launch: pricing page, docs/FAQ, status page, support inbox, ToS/privacy review.
- **Exit criteria**: paying customers, restore-from-backup drill passed, one-command rollback demonstrated, error budget policy written.

## Post-launch track (continuous)

Inspiration inbox → team workspaces → API/webhooks for power users → additional platforms (architecture keeps `platform` open) → mobile companion (React Native — your stack) for review-and-approve on the go.

## Standing engineering rules (all phases)

1. `main` is always deployable; feature flags over long-lived branches.
2. Every feature lands with tests: use-cases unit-tested, routes contract-tested, one E2E per journey.
3. Migrations are backward-compatible one release back (expand→migrate→contract).
4. Prompt changes go through the eval harness like code goes through tests.
5. Weekly cost review: AI spend per active user vs. plan price.

## Biggest schedule risks

X API approval/tier limits (apply for elevated access in Phase 0, not Phase 1); voice-fidelity quality bar taking longer than planned (mitigate: eval harness early, real users in alpha by week 8); scope creep in the design system (mitigate: shadcn defaults first, bespoke polish in Phase 2).
