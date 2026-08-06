# 04 — User Journeys & Onboarding Flow

## 1. Onboarding (first session)

Goal: from landing page to **first approved, scheduled post** in under 10 minutes. The "aha" moment is reading a draft and thinking *"that sounds like me."*

```
Landing → Sign in with X → Consent → Analysis → Voice review → Goals & cadence → First plan → First draft approval → Schedule → Done
```

### Step detail

| # | Step | Screen | What happens | Failure path |
|---|------|--------|--------------|--------------|
| 1 | Landing | Marketing page | Value prop + "Sign in with X" CTA | — |
| 2 | X OAuth | X-hosted consent | PKCE flow; scopes: `users.read tweet.read tweet.write offline.access` | Denied → back to landing with explainer of why each scope is needed |
| 3 | Consent & privacy | `/onboarding/consent` | Plain-language summary: what we read, what we never do (post without approval), how to delete data. Explicit checkbox | Decline → account exists, ingestion blocked |
| 4 | Analysis | `/onboarding/analyzing` | Background job ingests profile + up to 800 recent posts/replies; live progress ("Reading your posts… Learning your style…"). Typically 1–3 min | Ingestion fails → retry; if X rate-limited, email when ready |
| 5 | Voice review | `/onboarding/voice` | Voice DNA presented as editable cards: tone, topics, formats, sample "sounds-like-you" sentences. User confirms or adjusts | Low-signal accounts (<50 posts) → shortened Voice DNA + guided questionnaire instead |
| 6 | Goals & cadence | `/onboarding/goals` | Pick goal (grow audience / build in public / authority / leads), posts per week (default 5), preferred posting windows, timezone | — |
| 7 | First plan | `/onboarding/plan` | AI generates this week's plan (topics + formats + rationale). User can swap/remove slots | Generation fails → provider failover; worst case: notify by email when ready |
| 8 | First draft | `/onboarding/first-draft` | Draft for the next slot shown. Approve / edit / regenerate. Micro-tutorial on the edit-teaches-the-AI loop | — |
| 9 | Schedule | inline | Approved draft scheduled to next posting window; email reminder confirmed | — |
| 10 | Handoff | `/today` | Land on Today view with remaining drafts queued for review | — |

Onboarding state is persisted per step (`onboarding_step` on user) — closing the tab resumes where they left off.

## 2. Recurring journeys

### J1 — Weekly planning ritual (Sunday evening / Monday morning)
1. Trigger.dev generates next week's plan from Voice DNA + Memory + last week's performance.
2. Email: "Your week is planned — 5 drafts ready for review."
3. User opens **Plan**, scans slots, swaps a topic, deletes one, adds an idea from Inspiration (post-MVP).
4. Batch-reviews drafts: approve, approve-with-edit, regenerate-with-note, reject.
5. Approved posts fill the schedule. Total time: ~10 minutes/week.

### J2 — Daily publish moment
1. T-60 min before a scheduled slot: reminder email with post preview + "Publish now / Reschedule / Cancel" links.
2. At slot time, Trigger.dev publishes via X API (idempotent; retries with backoff).
3. Post-publish: status visible in Today; failures alert the user immediately with a one-click retry.

### J3 — Voice correction loop
1. User notices drafts drifting ("too many emojis", "too formal").
2. Opens **Voice**, edits the offending trait or adds a rule ("never use hashtags").
3. Voice DNA gets a new version; next generations use it. Old versions remain viewable (audit + rollback).

### J4 — Learning from performance (post-MVP)
1. 24h/7d after publish, metrics ingested per post.
2. Analytics view surfaces patterns ("threads on your build-log outperform hot takes 3:1").
3. Insights feed the next weekly plan's slot selection.

### J5 — Leaving safely
1. Settings → Danger zone → Delete account.
2. Confirmation → revoke X tokens, purge posts/embeddings/profiles, cancel jobs, send final export link (30-day validity).

## 3. Notification map

| Event | Channel | Timing |
|---|---|---|
| Weekly plan ready | Email | Configurable (default Sun 18:00 local) |
| Drafts awaiting review, slot < 24h away | Email | T-24h |
| Publish reminder | Email | T-60min (configurable / can disable) |
| Publish failed | Email | Immediate |
| Ingestion/analysis complete (if slow) | Email | On completion |

All notifications respect per-user preferences and quiet hours. In-app equivalents mirror every email.
