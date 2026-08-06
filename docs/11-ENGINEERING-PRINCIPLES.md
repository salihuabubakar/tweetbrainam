# 11 — Engineering Principles & Development Rules

The constitution for this codebase. Rules are numbered so PR reviews can cite them ("violates R7"). Change a rule via PR against this document, not by quietly ignoring it.

Quick topic map: naming §9 (R35) · folder rules §9 (R36, R38) · file size §9 (R37) · component organization §10 (R39) · server vs client components §10 (R40) · state management §10 (R41) · styling §10 (R42) · accessibility §10 (R43) · error handling §2 (R9–R10) + §11 (R44) · logging §11 (R45) · testing §3 (R12–R16) · git workflow, branches, commits §4 (R17–R21) + branch naming in R35 · performance budgets §8 (R32–R34) + §12 (R46–R47).

## 1. Architecture rules

- **R1 — Dependencies point inward.** `packages/core` imports nothing internal (zod only). Adapters implement core ports; apps compose. The lint boundary rules (doc 09) are CI-blocking, not advisory.
- **R2 — Providers are plugins.** AI, X, payment, and email SDKs may only be imported inside their adapter package. Business logic sees ports (`AIProvider`, `XClient`, `PaymentProvider`, `Mailer`) and normalized types. Adding a provider must never touch `core`.
- **R3 — One use-case, one file, one verb.** Application logic lives in `core/application/<verb-noun>.ts` (e.g. `approve-draft.ts`). Hono routes and Trigger tasks are thin adapters that parse input, call the use-case, map the result. If a route contains an `if` about business state, the logic is in the wrong layer.
- **R4 — State machines over status writes.** Draft/slot/schedule statuses only change through their transition functions in `core/domain`. No `db.update({status})` from feature code — transitions validate invariants (doc 03 §4) and emit domain events.
- **R5 — Postgres is the only source of truth.** Redis contents must be reconstructible at any moment. Losing Redis may degrade performance, never correctness.
- **R6 — Jobs are idempotent and resumable.** Every Trigger.dev task must tolerate re-execution: idempotency keys for external effects (publish, email), watermarks for ingestion, upserts over inserts. Assume at-least-once delivery always.

## 2. TypeScript rules

- **R7 — Strict everything.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. `any` is banned (lint error); `unknown` + narrowing instead. Type assertions (`as`) require a comment justifying why the compiler can't know.
- **R8 — Parse, don't validate twice.** External data (HTTP bodies, X API responses, LLM output, jsonb columns, env) crosses the boundary through a zod schema in `packages/contracts` exactly once, then flows as trusted types. No re-validation downstream; no unvalidated `JSON.parse` anywhere.
- **R9 — Errors are values at boundaries.** Use-cases return typed results (`Result<T, DomainError>` — discriminated unions, not thrown strings). Throwing is reserved for bugs and infrastructure failures; the API error handler maps `DomainError` → error envelope codes (doc 07 §2). Never throw across a port.
- **R10 — No naked strings for domain concepts.** Statuses, event types, error codes, purposes: always union types exported from `contracts`. String literals appear once, at the definition.
- **R11 — Model time and money precisely.** `timestamptz` + ISO-8601 UTC in transit, user timezone only at render. Money in integer minor units + currency code; never floats.

## 3. Testing rules

- **R12 — The testing pyramid is enforced by layer.** `core` = fast unit tests, zero I/O, ports stubbed (target: <5s for the whole package). Repositories/adapters = integration tests vs Testcontainers. Routes = contract tests against zod schemas. Journeys (onboarding, approve→publish) = one Playwright E2E each, X/AI mocked with MSW.
- **R13 — Every bug fix ships with the test that would have caught it.** No exceptions; the test is the proof of understanding.
- **R14 — Prompts are code.** Prompt templates live in `packages/ai/prompts`, versioned, and gated by the eval harness (golden voice samples + fidelity scoring). A prompt change that drops the eval score below threshold fails CI exactly like a failing unit test.
- **R15 — Tests assert behavior, not implementation.** No asserting on mock call counts when an output assertion exists; no snapshot tests on volatile structures (LLM output, dates).
- **R16 — Deterministic by construction.** `Clock` and id-generation are ports; tests inject fixed values. Any test that sleeps or retries to pass is broken.

## 4. Git & delivery rules

- **R17 — Trunk-based.** Short-lived branches (`feat/…`, `fix/…`, `chore/…`) off `main`, squash-merged within days, not weeks. `main` is always deployable; incomplete features hide behind flags.
- **R18 — Conventional Commits.** `type(scope): summary` — scopes are package/app names (`feat(core): add draft approval invariants`). Enables changelog generation and blame archaeology.
- **R19 — Small PRs, described PRs.** Target ≤400 changed lines. Description states *why*, links the doc/issue, lists the rules it touches. A PR that changes behavior updates the relevant doc in the same PR (see R26).
- **R20 — CI is the gate.** Lint + typecheck + tests + eval harness + boundary check must be green; no admin-merges. Broken `main` is a stop-the-line event: fix or revert within the hour, revert preferred.
- **R21 — Migrations are expand → migrate → contract.** Every migration is backward-compatible one release back; destructive steps ship separately after the code that stops needing the old shape. Migrations are never edited after merge.

## 5. Security rules

- **R22 — Secrets never touch the repo, logs, or client.** Env-injected only, validated at boot (fail-fast). OAuth tokens are encrypted at rest and never serialized into responses, logs, or error reports — enforce with a redaction list in the pino config.
- **R23 — Every mutation is authorized at the use-case, not the route.** Ownership checks (`this draft belongs to this user's account`) live in the application layer so jobs and API enforce identically. Authorization bugs are P0.
- **R24 — External input is hostile, including LLM output.** LLM responses are untrusted input: zod-parse structured outputs, length-cap and sanitize text destined for X, never interpolate model output into prompts for other users, never execute or eval it.
- **R25 — The human-approval invariant is load-bearing.** No code path may create a `publishing` state without a recorded approval event (doc 03 §4). Any change touching the publish path requires a second review focused solely on this invariant.

## 6. Documentation & knowledge rules

- **R26 — Docs live with code and change with code.** Docs 01–11 are the source of architectural truth. A PR that contradicts a doc either updates the doc or gets rejected. New significant decisions append an ADR row to doc 02 §2.
- **R27 — Comment-free by default; self-explanatory code.** Intention-revealing names, small functions, and structure carry the intent — code must read without narration. The only permitted comment is a rare *why* the code cannot express (external provider quirk, documented workaround, performance hack), with a link. Comments narrating *what* the code does, TODO markers, and section banners are removed in review. (Logged as D18 in DECISIONS.md.)
- **R28 — READMEs are runnable.** Every package README: purpose (2 sentences), public surface, how to test it. Root README: clean clone → running stack in ≤3 commands.

## 7. AI-assisted development rules (how we work with Claude/agents)

- **R29 — Same bar, any author.** AI-generated code goes through identical review, tests, and boundary checks. "The model wrote it" is never a defense; the merger owns the code.
- **R30 — Architecture first, generation second.** Agents implement against the approved docs; deviations from documented architecture are raised as questions before code, not discovered in diffs.
- **R31 — Regenerate small, review whole.** Prefer scoped, reviewable generations (one use-case, one component) over sweeping multi-file rewrites that outrun review capacity.

## 8. Performance & cost rules

- **R32 — Measure before optimizing; budget before building.** Budgets: p95 < 200ms non-AI API routes, LCP < 2.5s app views, AI cost per active user reviewed weekly against plan price (roadmap rule). No optimization PRs without a before/after measurement.
- **R33 — N+1 is a review blocker.** List endpoints load their tree in bounded queries (joins/`inArray` batching). Any endpoint whose query count scales with result size gets rejected — this is the most common Drizzle foot-gun.
- **R34 — Pagination is mandatory.** Every list endpoint is cursor-paginated from day one (doc 07 §4); no "we'll add it when it's slow".

## 9. Naming & file conventions

- **R35 — Naming is layered and consistent.**
  | Thing | Convention | Example |
  |---|---|---|
  | Files & folders | `kebab-case` | `approve-draft.ts`, `draft-editor.tsx` |
  | Components, types, zod schemas | `PascalCase` (schemas suffixed `Schema`) | `DraftEditor`, `VoiceTraits`, `ApproveDraftInputSchema` |
  | Variables, functions | `camelCase`; booleans `is/has/can`; handlers `handleX`, callback props `onX` | `isPublishing`, `handleApprove`, `onApprove` |
  | Constants, env vars | `SCREAMING_SNAKE_CASE` | `MAX_THREAD_LENGTH`, `PAYMENT_PROVIDER` |
  | DB tables/columns | `snake_case`, tables plural | `scheduled_posts.publish_at` |
  | Routes/URLs | `kebab-case`, resources plural | `/v1/notification-preferences` |
  | Branches | `type/short-kebab-desc`, issue id when one exists | `feat/drafts-approval-flow`, `fix/142-token-refresh-race` |
  | Trigger tasks | `verb-noun` matching filename | `generate-weekly-plan` |
- **R36 — No junk drawers.** No `utils/`, `helpers/`, or `misc/` folders — name modules by what they do (`format-relative-time.ts`, `chunk-thread.ts`) and colocate them with their feature. A file used by 2+ features moves up only to the nearest shared level.
- **R37 — File size limits.** Soft limit 200 lines, hard limit 400 (CI-warned); components 250. A file at the limit is split by responsibility, not by scrolling position. Functions ≤ 50 lines; more than 3 params → options object.
- **R38 — One primary export per file.** Component/use-case files export one public thing (+ its types). Barrel `index.ts` files exist only at package public boundaries — never inside `apps/` (they wreck tree-shaking and create import cycles).

## 10. Frontend conventions (apps/web)

- **R39 — Component organization is three-tier.** `packages/ui` = pure presentational primitives (no data fetching, no app imports, Storybook-ready). `apps/web/src/components/<feature>/` = feature composites. Route-private pieces live in a `_components/` folder inside their route segment and may not be imported across segments. Within a component file: props type first, component second, local subcomponents/helpers last.
- **R40 — Server Components by default.** `'use client'` only for interactivity: state, effects, event handlers, browser APIs. Push the directive to the leaves — a page never becomes client because one button needs a click handler. Data fetching happens in RSCs; mutations go through server actions or the typed API client. Fetching in `useEffect` is a review blocker.
- **R41 — State lives where it belongs.**
  | State kind | Home |
  |---|---|
  | Server data (drafts, plans, voice) | RSC props; TanStack Query for client-side mutation/polling (job status) |
  | Filters, tabs, pagination | The URL (searchParams) — shareable and back-button-safe |
  | Ephemeral UI (open dialog, editor text) | `useState`/`useReducer` in the component |
  | Cross-cutting client state | Zustand, only after two features demonstrably need it; never React Context for frequently-changing values; no Redux |
- **R42 — Styling is tokens + Tailwind.** All colors/spacing/type ramp come from CSS-variable design tokens in `packages/ui/tokens` — raw hex/px literals in app code are lint errors. Variants via `cva`; conditional classes via `cn()`; class order enforced by the Tailwind Prettier plugin. No CSS-in-JS, no styled-components, no inline style objects except dynamic values. Dark mode ships via tokens, never per-component overrides.
- **R43 — Accessibility is a merge requirement, not a pass.** WCAG 2.1 AA. Semantic HTML first — interactive means `<button>`/`<a>`, never `div onClick`. Every core flow (review → approve → publish) fully keyboard-operable; visible focus states; focus trapped and restored around dialogs/⌘K; every input labeled; AA contrast verified at the token level; `prefers-reduced-motion` respected by all motion. Playwright runs axe checks on core views in CI; new violations fail the build.

## 11. Error handling & logging standards (operational)

- **R44 — Every async UI handles four states.** Loading, empty, error, success — explicitly designed, no infinite spinners. User-facing errors are actionable ("Reconnect your X account", not "Error 500"), mapped from typed error codes (R9/R10). Raw provider or stack messages never reach the UI. Error boundaries per route segment with a retry affordance.
- **R45 — Logging standard.** Pino JSON only; `console.log` is a lint error outside scripts. Levels mean something: `error` = a human should act, `warn` = degraded but self-healing, `info` = domain state change (one line per event, not narration), `debug` = local dev only. Every line carries `request_id` (API) or `run_id` (jobs) plus `user_id` where applicable — that correlation is what makes traces navigable. Redaction list (R22) covers tokens, emails, and post content in non-error levels.

## 12. Performance budgets (frontend addendum to R32)

- **R46 — Route JS budget.** ≤ 300KB gzipped initial JS per app route; any single client dependency > 50KB needs written justification in the PR. `next/image` mandatory for raster assets; fonts self-hosted and preloaded.
- **R47 — Interaction budgets.** INP < 200ms on review/approve actions (the product's core gesture); optimistic UI on approve/reject with server reconciliation; skeletons over spinners for anything > 300ms.

## Definition of Done (every feature)

Code merged to `main` behind a flag if incomplete · use-case unit tests + applicable integration/contract tests green · zod contracts updated · relevant doc updated · error states have user-readable messages · logs/traces added for new failure modes · quota/rate-limit impact considered · works in `docker compose up` from clean clone.
