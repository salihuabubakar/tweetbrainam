# 08 — Docker Architecture

## 1. Philosophy

Docker-first development: `docker compose up` gives a complete, reproducible environment. Same base images dev→prod; prod images are multi-stage, minimal, non-root, and identical across environments (config via env only — 12-factor).

## 2. Development: `docker compose.yml`

| Service | Image / build | Ports | Notes |
|---|---|---|---|
| `web` | `apps/web/Dockerfile` (dev target) | 3000 | Next dev server, bind-mount source, `node_modules` in named volume |
| `api` | `apps/api/Dockerfile` (dev target) | 3001 | `tsx watch`, bind-mount source |
| `postgres` | `pgvector/pgvector:pg16` | 5432 | Volume `pgdata`; healthcheck `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 | `--appendonly yes`, volume |
| `mailpit` | `axllent/mailpit` | 8025/1025 | Catches all dev email (Resend SMTP dev mode) |
| `migrate` | `packages/db` runner | — | One-shot: `drizzle-kit migrate` on up, `depends_on: postgres: healthy` |

Notes:
- **Trigger.dev**: dev uses `npx trigger.dev@latest dev` on the host (their CLI needs host tooling; it connects to local services fine). Optional self-hosted Trigger stack profile (`--profile trigger`) if we later self-host.
- `depends_on` with `condition: service_healthy` everywhere; api waits for postgres+redis+migrate.
- One shared `.env` (git-ignored) + committed `.env.example`; compose injects per-service.
- `docker compose --profile e2e up` adds a Playwright container for CI-parity E2E runs.

## 3. Images: multi-stage pattern (both apps)

```dockerfile
# base: node:22-alpine + corepack enable (pnpm)
# deps: pnpm fetch using pruned lockfile (turbo prune --scope=<app> --docker)
# build: turbo build for the app graph
# runner: minimal — copy standalone output only, USER node, tini as PID 1
```

- `apps/web`: Next.js `output: "standalone"` → runner ≈ 150MB.
- `apps/api`: bundle with tsup/esbuild → single `dist/` + prod node_modules.
- `apps/jobs`: built and deployed via `trigger.dev deploy` (Trigger.dev cloud builds it); no self-managed runtime image in MVP.
- All images: non-root user, `HEALTHCHECK` hitting `/healthz`, OCI labels with git SHA, linux/amd64+arm64 via buildx.

## 4. Production topology (MVP scale)

```
                 ┌────────────┐
   Internet ────▶│  Reverse    │  Caddy/Traefik (TLS, HTTP/2)
                 │  proxy      │
                 └───┬────┬───┘
              app.domain  api.domain
                 ┌───▼──┐ ┌──▼───┐
                 │ web  │ │ api  │  (×2 replicas each)
                 └───┬──┘ └──┬───┘
                     └───┬───┘
        ┌──────────┬─────┴──────┬─────────────┐
   Managed PG   Managed Redis   Trigger.dev   Resend / X API / AI APIs
   (pgvector)                   (cloud)       (egress only)
```

- **Postgres and Redis are managed services in production** (Neon/RDS/Supabase-class + Upstash/Elasticache-class) — we containerize them in dev only. Backups/PITR are the provider's job, verified quarterly by restore drill.
- Deploy target: any container host (Railway/Fly/Render to start; compose file + images keep us portable to ECS/K8s later). No Kubernetes until replica count or team size demands it.
- Rollout: build once in CI → push to registry (GHCR) → deploy by image digest → migrations run as a release step before new containers receive traffic → health-gated rollout, instant rollback = previous digest.

## 5. Environment & secrets

| Variable group | Examples | Dev | Prod |
|---|---|---|---|
| Core | `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_URL` | compose defaults | host secrets |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` | dev app creds | prod app creds |
| AI | `GROK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_FAILOVER_ORDER` | personal keys | org keys |
| Crypto | `TOKEN_ENCRYPTION_KEY` (32B base64), `SESSION_SECRET` | generated | KMS/secret manager |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | mailpit override | live |
| Payment (Phase 3) | `PAYMENT_PROVIDER` (`paystack` default; `flutterwave`/`stripe`/`lemonsqueezy`), `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` (or the active provider's equivalent pair) | provider test keys | live keys |
| Jobs | `TRIGGER_SECRET_KEY` | dev project | prod project |
| Observability | `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT` | optional | required |

All parsed and validated at boot by `packages/config` (zod) — a missing/invalid var fails the container immediately, never at request time.
