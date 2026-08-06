# 03 — Domain Model

## 1. Bounded contexts

| Context | Responsibility | Key aggregates |
|---|---|---|
| **Identity & Access** | Users, sessions, X account connections, consent | User, XAccount |
| **Intelligence** | What the AI knows: ingested corpus, Voice DNA, memory, learning signals | VoiceProfile, MemoryFact, IngestedPost, LearningSignal |
| **Content** | Planning, drafting, approval, scheduling, publishing | ContentPlan, Draft, ScheduledPost |
| **Insights** | Post performance and derived recommendations | PostMetric, Insight |
| **Notifications** | Reminders and transactional email | Notification, NotificationPreference |
| **Billing** (dormant in MVP) | Plans, subscriptions, quotas | Plan, Subscription, UsageRecord |

Contexts communicate through application services and domain events — never by reaching into each other's tables from feature code.

## 2. Entity relationship overview

```
User 1──N XAccount
User 1──N Session
XAccount 1──N IngestedPost ──1 Embedding (pgvector)
XAccount 1──N VoiceProfile (versioned; one active)
User 1──N MemoryFact
XAccount 1──N ContentPlan 1──N PlanSlot
PlanSlot 1──0..1 Draft 1──N DraftVersion
Draft 1──0..1 ScheduledPost ──0..1 PublishedPost(x_post_id)
ScheduledPost 1──N PostMetric (snapshots)
Draft/DraftVersion ──N LearningSignal
User 1──N Notification;  User 1──1 NotificationPreference
User 1──0..1 Subscription ──1 Plan;  User 1──N UsageRecord
* (AIGeneration audits every LLM call, FK to whatever it produced)
```

## 3. Entities

### Identity & Access
- **User** — id, email (from X or asked at onboarding), name, timezone, `onboarding_step`, preferences (cadence, posting windows, goals), status (`active|suspended|deleted`). Root identity.
- **XAccount** — id, user_id, x_user_id, handle, display name, avatar, encrypted access/refresh tokens, granted scopes, connection status (`connected|token_expired|revoked|rate_limited`), ingestion watermark (`last_ingested_post_id`). *One user : many accounts (MVP UI: one).*
- **Session** — server session (Redis-backed) referencing user; sliding expiry.

### Intelligence
- **IngestedPost** — normalized copy of user's X post/reply: text, type (`post|reply|quote`), created_at, public metrics at ingest, embedding ref. Purged on account deletion/revocation.
- **VoiceProfile** — versioned aggregate. `traits` (structured JSON validated by zod: tone, formality, vocabulary, rhythm, emoji/hashtag policy, formats, do/don't rules), `topics`, `sample_sentences`, `source` (`analysis|user_edit|refinement`), `is_active`. Invariant: exactly one active version per XAccount.
- **MemoryFact** — atomic, user-visible fact: category (`project|audience|expertise|goal|opinion|preference`), content, confidence, source (`extracted|user_provided`), status (`active|archived`). Fully user-editable — transparency is a product rule.
- **LearningSignal** — captured evidence for refinement: type (`edit_diff|rejection|regeneration_note|rating|performance`), payload (e.g. AI text vs approved text), processed flag.

### Content
- **ContentPlan** — one per XAccount per ISO week. status (`draft|active|completed`), rationale summary.
- **PlanSlot** — belongs to plan: topic, format (`single|thread`), angle/rationale, target datetime, status (`empty|drafting|ready|approved|published|skipped`).
- **Draft** — the post being shaped. Current status (`generating|needs_review|approved|rejected|archived`), content = ordered list of tweet segments (1 = single post), link to slot (nullable — ad-hoc drafts allowed).
- **DraftVersion** — immutable snapshot per change: content, author (`ai|user`), generation ref. Enables diffing (learning) and undo.
- **ScheduledPost** — approval output: draft_id, publish_at, idempotency_key, status (`scheduled|publishing|published|failed|canceled`), x_post_id(s) when live, failure reason.

### Insights
- **PostMetric** — snapshot per published post at T+24h/T+7d: impressions, likes, replies, reposts, bookmarks, profile clicks.
- **Insight** — derived recommendation ("threads outperform singles 3:1 for you"), inputs traceable, status (`active|dismissed`).

### Notifications
- **Notification** — type, channel (`email|in_app`), payload, status (`pending|sent|failed`), dedupe key.
- **NotificationPreference** — per-type toggles, reminder lead time, quiet hours.

### Billing (schema-ready, dormant; provider-agnostic)
- **Plan** — code (`free_beta|pro|team`), limits (generations/mo, accounts, scheduled posts).
- **Subscription** — user_id, plan_id, `payment_provider` (`paystack|flutterwave|stripe|lemonsqueezy`, nullable until paid), `provider_customer_id` / `provider_subscription_id` (opaque strings, nullable), status, period bounds. No provider SDK types ever appear on the entity.
- **UsageRecord** — metered events (`draft_generated|plan_generated|post_published`) for quota enforcement and future billing.
- **PaymentEvent** (value object) — normalized webhook event (`subscription_activated|payment_succeeded|payment_failed|subscription_canceled`) produced by a `PaymentProvider` adapter; the only payment shape the domain understands.

### Audit
- **AIGeneration** — every LLM call: provider, model, purpose (`voice_analysis|memory_extraction|plan|draft|refinement`), token counts, cost, latency, and FK to produced artifact. Powers cost control and quality debugging.

## 4. Post lifecycle (the core state machine)

```
PlanSlot: empty ─▶ drafting ─▶ ready ─▶ approved ─▶ published
                     │            │         │
                     └── skipped ◀┴─────────┘

Draft: generating ─▶ needs_review ─▶ approved ─▶ (locked)
            │             │  ▲            
            ▼             ▼  │ (regenerate/edit = new DraftVersion)
          failed       rejected ─▶ archived

ScheduledPost: scheduled ─▶ publishing ─▶ published
                   │             │
                   ▼             ▼
               canceled       failed ─▶ (user retry ⇒ scheduled)
```

Invariants enforced in the application layer:
1. A ScheduledPost can only be created from an `approved` Draft.
2. `publishing → published` requires an X post id; failures always carry a user-readable reason.
3. Approved drafts are immutable; changing one reverts it to `needs_review` and cancels its schedule.
4. Nothing reaches `publishing` without a human approval event in the audit trail.

## 5. Domain events (in-process, handled by application layer / enqueued to jobs)

`XAccountConnected`, `IngestionCompleted`, `VoiceProfileActivated`, `WeeklyPlanGenerated`, `DraftGenerated`, `DraftApproved`, `DraftEdited` (spawns LearningSignal), `PostPublished`, `PostPublishFailed`, `MetricsIngested`, `AccountDeletionRequested`.
