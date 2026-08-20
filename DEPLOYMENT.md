# DEPLOYMENT.md

| Piece | Where it runs | How it gets there |
|---|---|---|
| `apps/web` | Railway service | `apps/web/Dockerfile` |
| `apps/api` | Railway service | `apps/api/Dockerfile` |
| `apps/jobs` | **Trigger.dev cloud** | `pnpm --filter @tweetbrainam/jobs run deploy` |
| Postgres + pgvector | **Neon** | managed |
| Redis | Railway template | managed |

`apps/jobs` has no Dockerfile on purpose. D9 put all background work on Trigger.dev, which runs your tasks on their infrastructure — there is no worker process to host. Deploying the API without also running `trigger deploy` means nothing is ever analysed, planned, drafted or published.

Postgres sits outside Railway deliberately. Railway's Postgres is a container with a volume, so backups and upgrades would be yours; Neon is managed with point-in-time recovery. The database holds encrypted X tokens, which cannot be regenerated — losing it means every user reconnects. One extra connection string buys real recovery.

## Before the first deploy

**Prove a post reaches X.** Schedule one at least three hours out and let it fire locally. Three hours is deliberate: X access tokens expire after two, so a shorter test skips the refresh path (D37) and proves less than it appears to.

**Generate production secrets.** Never reuse the development ones.

```bash
openssl rand -base64 32          # TOKEN_ENCRYPTION_KEY
npx web-push generate-vapid-keys # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

`TOKEN_ENCRYPTION_KEY` encrypts every stored X token. Losing it means every connected account has to reconnect; leaking it means someone can post as your users. It belongs in your host's secret store, not in a file.

## Database

Neon, with pgvector enabled. Run once against the production branch:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then apply migrations. This is a release step, not something the app does at boot — two instances starting together would race:

```bash
DATABASE_URL="<production url>" pnpm --filter @tweetbrainam/db db:migrate
```

Never `db:push` against production. Drizzle's push diffs live schema and will happily drop a column it can't account for.

Neon's pooled connection string is the right one for the API. If a migration hangs, use the direct (unpooled) string for that command only.

## Environment

`X_REDIRECT_URI` must point at the **web** origin, not the API. The browser reaches the API through Next's `/api` proxy so the session cookie lands on the origin the app runs on — this is D-level important, and getting it wrong breaks every protected route in production while working perfectly on localhost, where ports share a cookie jar.

### apps/web

| Variable | Notes |
|---|---|
| `API_ORIGIN` | Internal URL of the API service. Server-to-server only; the browser never sees it |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Build arg, not a runtime variable.** Inlined into the client bundle |

### apps/api

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` — boot fails on placeholder X credentials or the dev encryption key |
| `PORT` | Defaults to 3001 |
| `APP_URL` | Public web origin |
| `DATABASE_URL` | Neon pooled connection string |
| `REDIS_URL` | Sessions and OAuth state |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | From the X developer portal |
| `X_REDIRECT_URI` | `https://<web-origin>/api/v1/auth/x/callback` |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes, base64 |
| `TRIGGER_SECRET_KEY` | Without it, every job is skipped with a warning and nothing visibly fails |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Push signing |
| `SENTRY_DSN` | Optional |

### apps/jobs (set in the Trigger.dev dashboard)

Everything the API has, minus `PORT`, `APP_URL` and `REDIS_URL`, plus:

| Variable | Notes |
|---|---|
| `GROQ_API_KEY` | Default AI provider (D21) |
| `COHERE_API_KEY` | Embeddings (D26). Without it retrieval falls back to keyword + recency |
| `GROQ_MODEL` / `GROK_MODEL` / `OPENAI_MODEL` | Optional overrides (D33) |
| `AI_FAILOVER_ORDER` | `groq,grok,openai` |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | Required — the worker refreshes tokens itself (D37) |
| `INGESTION_MAX_POSTS` | Caps posts read per run |

The jobs worker holds only one AI key today, so `AI_FAILOVER_ORDER` currently has no fallback: if Groq is down or rate-limits, generation fails outright. A paid key with a low cap on a second provider is cheap insurance.

## Deploy

```bash
# 1. Migrations first — schema before the code that expects it
DATABASE_URL="<production url>" pnpm --filter @tweetbrainam/db db:migrate

# 2. Background tasks
pnpm --filter @tweetbrainam/jobs run deploy

# 3. Services
docker build -f apps/api/Dockerfile -t tweetbrainam-api .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY="<public key>" \
  -t tweetbrainam-web .
```

Both images build from the **repo root**, not their own directory — they need the workspace lockfile and the shared packages.

## Railway setup

One project, four services: **api**, **web**, **redis** (from the Redis template), and nothing for Postgres — that lives on Neon.

For **api** and **web**, point each at this repo and leave **Root Directory** at the default — that keeps the build context at the repo root, which both Dockerfiles need for the lockfile and `packages/`. The Dockerfile itself is chosen with a service variable rather than a UI field:

```
RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile   # on the api service
RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile   # on the web service
```

A `railway.json` would not work here: it is per-repo, and these two services need different values from the same repo.

Set every service to the same region as the others and as Neon. Railway defaults new services to US West, and region is per service, not per project — private networking only works within a region.

### Wiring the services together

`REDIS_URL` should be a reference variable, not a pasted string:

```
REDIS_URL=${{Redis.REDIS_URL}}
```

`API_ORIGIN` on the **web** service points at the API over Railway's private network, which keeps API traffic off the public internet and out of your egress bill:

```
API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3001
```

Private domains are plain HTTP — that's fine, the traffic never leaves Railway's network. Only the **web** service needs a public domain. The API does not: the browser reaches it through Next's `/api` proxy. Exposing it publicly would give the session cookie a second origin it could land on, which is the failure D-level noted in the env section.

### Build-time vs runtime variables

Railway separates these, and getting it wrong is silent:

Railway passes service variables into a Docker build only when the Dockerfile declares a matching `ARG` — and in a multi-stage build the `ARG` must be repeated in every stage that needs it. Two variables on **web** are consumed at build time:

| Variable | Why it must exist at build |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Inlined into the client bundle. Missing means notifications ship reporting themselves unconfigured |
| `API_ORIGIN` | `next.config` resolves the `/api` rewrite destination during the build and writes it into the route manifest. Missing means the manifest keeps the `http://localhost:3001` fallback and every proxied request fails `ECONNREFUSED` |

Both are still set as ordinary service variables; the `ARG` lines in `apps/web/Dockerfile` are what let the build see them. Everything else is read at boot.

The API binds to `::` rather than `0.0.0.0`. Railway's private network is IPv6, so an IPv4-only listener is unreachable from sibling services even when the address is right.

### Neon connection strings

Use the **pooled** string for `DATABASE_URL` on the API. Use the **direct** (unpooled) string for `db:migrate` — migrations hold advisory locks that pooling interferes with.

Enable pgvector once, against the production branch:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Deploy order on a fresh project

1. Create the Neon database, enable pgvector, run migrations with the direct string
2. Add the Redis template to the Railway project
3. Deploy **api** with its variables, no public domain
4. Deploy **web** with the VAPID build arg and a public domain
5. Set `X_REDIRECT_URI` in the X developer portal *and* on the api service to `https://<web-domain>/api/v1/auth/x/callback`
6. `pnpm --filter @tweetbrainam/jobs run deploy`, then set the jobs variables in the Trigger.dev dashboard

## After deploying

- Sign in with X on the production origin. If you land back on the login page, the session cookie is on the wrong origin — check `X_REDIRECT_URI` and `API_ORIGIN`
- Turn on notifications in Settings. "Not configured on this deployment" means the VAPID build arg was missing
- Watch the Trigger.dev dashboard through one analysis run
- Schedule a real post and let it publish

## Rollback

Application containers roll back by redeploying the previous image. Migrations do not — Drizzle generates forward-only SQL. Any migration that drops or renames a column needs an expand/contract split across two releases if you want to be able to go back.
