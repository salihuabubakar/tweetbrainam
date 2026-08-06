import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createAppDeps } from "./deps";
import { env } from "./env";
import { logger } from "./lib/logger";

const app = createApp(createAppDeps());

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port }, "api listening");
});
