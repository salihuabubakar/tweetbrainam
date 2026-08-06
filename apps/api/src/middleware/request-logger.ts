import type { MiddlewareHandler } from "hono";
import { logger } from "../lib/logger";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const startedAt = performance.now();
  await next();
  logger.info(
    {
      request_id: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - startedAt),
    },
    "request",
  );
};
