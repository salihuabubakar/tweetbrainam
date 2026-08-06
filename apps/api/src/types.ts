import type { RequestIdVariables } from "hono/request-id";

export type AppEnv = {
  Variables: RequestIdVariables & {
    userId?: string;
  };
};

export const SESSION_COOKIE = "tb_session";
