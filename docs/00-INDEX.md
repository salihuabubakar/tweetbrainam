# TweetBrainam — Project Foundation Documents

Planning docs for review and approval before implementation. Drop this `docs/` folder into the repo root and keep it versioned.

| # | Document | File |
|---|----------|------|
| 1 | Product Requirements Document | `01-PRD.md` |
| 2 | Technical Design Document | `02-TDD.md` |
| 3 | Domain Model | `03-DOMAIN-MODEL.md` |
| 4 | User Journeys & Onboarding | `04-USER-JOURNEYS.md` |
| 5 | Information Architecture | `05-INFORMATION-ARCHITECTURE.md` |
| 6 | Database Schema | `06-DATABASE-SCHEMA.md` |
| 7 | API Architecture | `07-API-ARCHITECTURE.md` |
| 8 | Docker Architecture | `08-DOCKER-ARCHITECTURE.md` |
| 9 | Monorepo Folder Structure | `09-MONOREPO-STRUCTURE.md` |
| 10 | Development Roadmap | `10-ROADMAP.md` |
| 11 | Engineering Principles & Development Rules | `11-ENGINEERING-PRINCIPLES.md` |

## Locked decisions (approved 2026-08-05)

- **Auth**: X OAuth 2.0 (PKCE) is the primary and only sign-in method. Email captured for notifications.
- **Billing**: Post-MVP. Free beta with usage limits at launch; plans/subscriptions modeled in the schema from day one. Payment is provider-agnostic behind a `PaymentProvider` port (`packages/payment`); **Paystack is the default adapter**, with Flutterwave/Stripe/Lemon Squeezy as drop-in alternatives selected via `PAYMENT_PROVIDER`.
- **Accounts**: Schema supports many X accounts per user; MVP UI exposes one.
- **Stack**: Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, Hono, PostgreSQL, Drizzle, Redis, Docker, Trigger.dev, Resend, AI provider abstraction (Grok first; OpenAI/Claude adapters).
