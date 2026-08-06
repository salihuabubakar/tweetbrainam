import { Hono } from "hono";
import type { AppEnv } from "../types";

export const health = new Hono<AppEnv>()
  .get("/healthz", (c) => c.json({ status: "ok" }))
  .get("/readyz", (c) => c.json({ status: "ok" }));
