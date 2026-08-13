import type { ErrorEnvelope } from "@tweetbrainam/contracts";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { AppDeps } from "./deps";
import { env } from "./env";
import { ApiError } from "./lib/errors";
import { logger } from "./lib/logger";
import { requestLogger } from "./middleware/request-logger";
import { createSessionMiddleware } from "./middleware/session";
import { createAuthRoutes } from "./routes/auth";
import { createDraftRoutes } from "./routes/drafts";
import { health } from "./routes/health";
import { createMeRoutes } from "./routes/me";
import { createMemoryRoutes } from "./routes/memory";
import { createNotificationRoutes } from "./routes/notifications";
import { createOnboardingRoutes } from "./routes/onboarding";
import { createPlanRoutes } from "./routes/plans";
import { createScheduleRoutes } from "./routes/schedule";
import { createSettingsRoutes } from "./routes/settings";
import { createVoiceRoutes } from "./routes/voice";
import type { AppEnv } from "./types";

const errorEnvelope = (code: ErrorEnvelope["error"]["code"], message: string, id: string) => ({
  error: { code, message, requestId: id },
});

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.use(requestId());
  app.use(requestLogger);
  app.use(secureHeaders());
  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true,
    }),
  );
  app.use(createSessionMiddleware(deps.sessions));

  app.route("/", health);
  app.route("/", createAuthRoutes(deps));
  app.route("/", createMeRoutes(deps));
  app.route("/", createOnboardingRoutes(deps));
  app.route("/", createVoiceRoutes(deps));
  app.route("/", createMemoryRoutes(deps));
  app.route("/", createNotificationRoutes(deps));
  app.route("/", createPlanRoutes(deps));
  app.route("/", createDraftRoutes(deps));
  app.route("/", createScheduleRoutes(deps));
  app.route("/", createSettingsRoutes(deps));

  app.notFound((c) =>
    c.json(errorEnvelope("not_found", "Route not found.", c.get("requestId")), 404),
  );

  app.onError((err, c) => {
    const id = c.get("requestId");
    if (err instanceof ApiError) {
      return c.json(errorEnvelope(err.code, err.message, id), err.status);
    }
    logger.error({ request_id: id, err }, "unhandled error");
    return c.json(errorEnvelope("internal", "Something went wrong.", id), 500);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
