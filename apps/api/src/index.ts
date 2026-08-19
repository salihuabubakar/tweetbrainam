import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createAppDeps } from "./deps";
import { env } from "./env";
import { logger } from "./lib/logger";

const app = createApp(createAppDeps());

// Binds dual-stack rather than the 0.0.0.0 default: Railway's private network
// is IPv6, so an IPv4-only listener is unreachable from sibling services.
serve({ fetch: app.fetch, port: env.PORT, hostname: "::" }, (info) => {
  logger.info({ port: info.port }, "api listening");
});
