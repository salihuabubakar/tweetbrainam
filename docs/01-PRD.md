# 01 — Product Requirements Document (PRD)

**Product**: TweetBrainam
**Status**: Draft for approval · **Owner**: Salihu · **Date**: 2026-08-05

## 1. Problem

Creators, founders, and developers on X know consistency compounds — but consistent posting fails for three reasons:

1. **Blank-page cost**: deciding *what* to post daily is a recurring creative tax.
2. **Voice erosion**: generic AI tools produce content that sounds like AI, not the author. Audiences notice; authenticity is the entire asset.
3. **No feedback loop**: creators rarely connect what they post to what performed, so they don't improve.

Existing tools (Typefully, Hypefury, generic ChatGPT workflows) schedule well or generate text, but none maintain a persistent, evolving model of *who the user is* and write from that model.

## 2. Solution

TweetBrainam is an **AI Content Brain**. With explicit permission (X OAuth), it analyzes the user's profile, posts, and replies to build a **Voice DNA** (how they write) and a **Memory Profile** (what they know, care about, and are working on). From this it:

- generates a **weekly content plan** aligned to the user's goals and cadence,
- drafts posts in the user's voice for each planned slot,
- lets the user **approve/edit/reject** each draft (human always in the loop),
- **schedules and publishes** approved posts via the X API,
- **reminds** users before publishing,
- **learns** from every edit and from post performance to improve future drafts.

The AI assists; the human decides. Nothing is ever posted without approval.

## 3. Target users

| Persona | Description | Core need |
|---|---|---|
| **Indie founder** | Building in public, X is a distribution channel | Consistency without daily creative overhead |
| **Developer/creator** | Grows audience via technical content | Posts that sound like them, not like AI |
| **Professional/consultant** | X as a credibility and lead channel | Strategic, goal-aligned content plan |
| **Ghostwriter/agency** (post-MVP) | Manages several client accounts | Per-client voice fidelity at scale |

## 4. Value proposition

"Stay consistent on X without losing your voice." Every competitor optimizes scheduling or raw generation. TweetBrainam optimizes **authenticity over time** — the product gets more *you* the longer you use it.

## 5. Core features

### MVP (Phase 1)

| ID | Feature | Description |
|---|---|---|
| F1 | Sign in with X | OAuth 2.0 PKCE; scopes for read + write + offline access |
| F2 | Profile ingestion | Fetch profile, recent posts, and replies; store for analysis |
| F3 | Voice DNA v1 | AI-built style profile: tone, vocabulary, structure, formats, topics. Versioned; user can review and adjust |
| F4 | Memory Profile v1 | Structured facts: interests, audience, goals, projects, opinions. User-editable |
| F5 | Weekly content plan | AI proposes N slots/week (user-set cadence) with topic + format + rationale per slot |
| F6 | Draft generation | Per-slot drafts in user's voice; regenerate with guidance; single posts + threads |
| F7 | Approval workflow | Approve / edit / reject. Edits are captured as learning signals |
| F8 | Scheduling & publishing | Queue approved posts; Trigger.dev publishes at scheduled time via X API |
| F9 | Reminders | Email (Resend) before scheduled publish and when a plan/drafts are ready for review |
| F10 | Usage limits | Per-user generation quotas (free beta), enforced server-side |

### Post-MVP (Phases 2–3)

| ID | Feature |
|---|---|
| F11 | Performance ingestion — pull impressions/likes/replies for published posts |
| F12 | Learning loop v2 — edit-diff and performance signals feed Voice DNA revisions |
| F13 | Analytics view — what's working, best formats/times/topics |
| F14 | Billing — subscriptions and tiered plans via provider-agnostic payment layer (Paystack default; Flutterwave/Stripe/Lemon Squeezy adapters) |
| F15 | Multi-provider AI — user/plan-level model selection (Grok, OpenAI, Claude) |
| F16 | Multi-account & teams — agencies, ghostwriters |
| F17 | Inspiration inbox — save links/notes that seed future plan slots |

## 6. Explicit non-goals (MVP)

- No auto-posting without approval — ever a hard product rule, not just an MVP cut.
- No reply automation / engagement bots (X policy risk).
- No support for other platforms (LinkedIn, Threads) in MVP; architecture keeps `platform` fields open.
- No mobile app; responsive web only.
- No public API.

## 7. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Activation: connected X → approved first post | ≥ 40% |
| Weekly retention (W4) | ≥ 30% |
| Draft acceptance rate (approved w/ minor edits ÷ generated) | ≥ 50%, trending up per user |
| Posts published via TweetBrainam / active user / week | ≥ 3 |
| Voice fidelity (user-rated "sounds like me" on drafts) | ≥ 4/5 avg |

Draft acceptance rate trending upward per user is the single most important signal — it proves the learning loop works.

## 8. Constraints & risks

| Risk | Impact | Mitigation |
|---|---|---|
| X API pricing/policy changes | Existential | Provider-agnostic ingestion layer; cache aggressively; stay within Basic/Pro tier budgets; monitor policy |
| X API rate limits | Degraded UX | Redis-backed rate budgeting per account; queue + backoff; ingest incrementally |
| AI voice quality below bar | Churn | Voice DNA versioning + eval harness with golden examples; human review loop is the product |
| Token/cost blowout | Margin | Per-user quotas, cost tracking per generation, model tiering (cheap models for classification, strong for drafting) |
| Storing user tokens | Security | Encrypt at rest (AES-256-GCM), least-privilege scopes, token rotation, no tokens to client |
| AI provider outage | Downtime | Provider abstraction with failover order |

## 9. Compliance

- X Developer Agreement: human approval before posting keeps us clearly in "tools" territory; no spam/automation patterns.
- GDPR/data rights: export + delete account (cascading purge of posts, embeddings, profiles). Data processed only with OAuth consent; revocation triggers purge of ingested content.
- AI transparency: users always see and control what the AI knows about them (Memory Profile is fully visible/editable).
