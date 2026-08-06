# Contributing to TweetBrainam

The full rulebook is [`docs/11-ENGINEERING-PRINCIPLES.md`](docs/11-ENGINEERING-PRINCIPLES.md) (R1–R47). This file is the working summary; when they disagree, the principles doc wins.

## Workflow

1. Branch off `main`: `type/short-kebab-desc` — `feat/drafts-approval-flow`, `fix/142-token-refresh-race`, `chore/bump-drizzle`. Issue id included when one exists.
2. Keep branches short-lived (days). Incomplete features merge behind a flag; `main` is always deployable (R17).
3. Commits follow Conventional Commits with package/app scopes (R18):
   ```
   feat(core): add draft approval invariants
   fix(x-api): handle 429 retry-after on publish
   docs(prd): clarify voice fidelity metric
   ```
4. Open a small PR (≤400 changed lines target). The description states *why*, links the relevant doc or issue, and cites any rules it touches (R19).
5. CI must be green — lint, typecheck, tests, prompt evals, dependency-boundary check. No admin merges (R20). Broken `main` = fix or revert within the hour, revert preferred.

## Code style

- **Self-explanatory code, no comments.** Code must read without narration: intention-revealing names, small functions (≤50 lines), one primary export per file. Comments are allowed only for the rare *why* that code cannot express — an external provider quirk or a documented workaround, with a link. Comments that describe *what* the code does are removed in review (R27).
- TypeScript strict; `any` is banned; assertions need justification (R7).
- External data crosses the boundary through a zod schema in `packages/contracts` exactly once (R8).
- Use-cases return typed `Result` values; throwing is for bugs and infrastructure only (R9).
- Naming, file-size limits (200 soft / 400 hard), folder rules: R35–R38. No `utils/` dumping grounds.
- Frontend: Server Components by default, `'use client'` at the leaves (R40); state placement per R41; token-based Tailwind only, no raw hex/px (R42); WCAG 2.1 AA with axe checks in CI (R43).

## Testing (R12–R16)

| Layer | Kind | Requirement |
|---|---|---|
| `packages/core` | Unit, zero I/O | Whole package runs <5s; ports stubbed; deterministic (inject `Clock`/ids) |
| Adapters & repositories | Integration | Testcontainers postgres/redis |
| API routes | Contract | Validated against `packages/contracts` schemas |
| Core journeys | E2E (Playwright) | Onboarding and approve→publish; X/AI mocked via MSW |
| Prompts | Eval harness | Voice-fidelity score gates prompt changes like tests gate code (R14) |

Every bug fix ships with the test that would have caught it (R13). Tests assert behavior, not mock call counts (R15).

## Database changes

Migrations are expand → migrate → contract, backward-compatible one release back, generated with `pnpm db:generate`, committed, and never edited after merge (R21). No `db push` outside local dev.

## Non-negotiables (blocking review items)

- Any path that could publish without a recorded human approval event (R25) — requires a second, dedicated review if you touch publishing.
- Secrets or tokens in code, logs, or client payloads (R22).
- Authorization checks in routes instead of use-cases (R23).
- Unparsed LLM output flowing into the domain or into another user's context (R24).
- N+1 queries on list endpoints (R33); unpaginated lists (R34).
- Fetching in `useEffect` (R40).

## Definition of Done

Merged behind a flag if incomplete · tests at every applicable layer green · contracts updated · relevant `docs/` file updated in the same PR (R26) · error states have actionable user-facing messages · logs/traces for new failure modes · quota and rate-limit impact considered · `docker compose up` works from a clean clone.
