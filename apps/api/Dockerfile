# Build context is the repo root, not apps/api:
#   docker build -f apps/api/Dockerfile -t tweetbrainam-api .
#
# The workspace packages export TypeScript source rather than compiled output
# (see each package.json "exports"), so there is nothing to compile ahead of
# time and the API runs through tsx. Moving to a bundled build later means
# adding esbuild and externalising only the npm dependencies — worth doing if
# cold start ever matters, unnecessary before then.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile --prod=false --filter @tweetbrainam/api...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app ./

# Runs as an unprivileged user; the node image ships one.
USER node
EXPOSE 3001

CMD ["pnpm", "--filter", "@tweetbrainam/api", "start"]
