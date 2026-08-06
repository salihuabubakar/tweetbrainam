# 05 — Information Architecture

## 1. Site map

```
tweetbrainam.com
├── Marketing (public, apps/web — route group (marketing))
│   ├── /                    Landing
│   ├── /pricing             Pricing (post-MVP)
│   ├── /blog                Content marketing (post-MVP)
│   ├── /privacy, /terms     Legal
│   └── /login               Sign in with X
│
├── Onboarding (auth required, route group (onboarding))
│   └── /onboarding/[step]   consent → analyzing → voice → goals → plan → first-draft
│
└── App (auth + connected account, route group (app))
    ├── /today               Default view: today's queue + pending reviews
    ├── /plan                Weekly plan: calendar of slots, drag to reschedule
    ├── /drafts              All drafts by status; editor with regenerate-with-note
    ├── /voice               Voice DNA (versioned traits) + Memory Profile (facts)
    ├── /analytics           Performance (post-MVP; hidden until data exists)
    └── /settings
        ├── /settings/account        Profile, timezone, delete account
        ├── /settings/connection     X account status, scopes, reconnect
        ├── /settings/preferences    Cadence, posting windows, goals
        ├── /settings/notifications  Channels, timing, quiet hours
        └── /settings/billing        Plan & invoices (post-MVP)
```

## 2. Primary navigation

Left sidebar (Linear-style, collapsible): **Today · Plan · Drafts · Voice · Analytics · Settings**. Global `⌘K` command palette from day one (navigation + actions: "new draft", "regenerate", "approve all"). No AI-chat pane anywhere — the AI expresses itself through plans, drafts, and explanations attached to them, never through a chatbot.

## 3. View-by-view content priority

| View | Primary object | Key actions | Empty state |
|---|---|---|---|
| **Today** | Next scheduled post + review queue | Approve, edit, reschedule, publish now | "This week is planned — nothing needs you right now" |
| **Plan** | Week grid of slots (topic, format, status chip) | Swap topic, regenerate slot, add/remove slot, drag-reschedule | CTA: generate this week's plan |
| **Drafts** | Draft list filtered by status (`needs_review` default) | Open editor, approve, reject, regenerate with guidance | Link to Plan |
| **Voice** | Voice DNA trait cards + memory fact list | Edit trait, add rule, delete fact, view versions | Only pre-analysis (rerun analysis CTA) |
| **Analytics** | Per-post metrics + pattern insights | Filter by format/topic/time | "Publish a few posts and insights appear here" |
| **Settings** | Config forms | Save, reconnect X, delete account | — |

## 4. Object statuses surfaced in UI

- **Draft**: `generating · needs_review · approved · rejected · archived`
- **Scheduled post**: `scheduled · publishing · published · failed · canceled`
- **Plan slot**: `empty · drafting · ready · approved · published · skipped`
- **X connection**: `connected · token_expired · revoked · rate_limited`

Status chips use one consistent color system across all views.

## 5. Design principles (per project brief)

- Premium, calm SaaS aesthetic: Linear/Vercel/Raycast register. Dense but breathable; typography-led hierarchy; dark + light themes from day one.
- Motion is purposeful only: status transitions, draft-arrival, publish confirmation. No decorative animation.
- Accessibility: WCAG 2.1 AA, full keyboard operability (approve/edit/skip via shortcuts), visible focus states, `prefers-reduced-motion` respected.
- Every AI output carries a "why" affordance — the rationale behind a slot or draft is one click away. Trust is a UI feature.
