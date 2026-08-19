# Build context is the repo root, not apps/web:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=... \
#     -t tweetbrainam-web .
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so this has to
# be present here — setting it at runtime does nothing. Without it the
# notifications card renders as "not configured on this deployment".
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @tweetbrainam/web build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next.config.ts sets output: "standalone", which emits a self-contained server
# plus only the node_modules it actually reached.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
