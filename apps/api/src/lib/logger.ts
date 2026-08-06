import { type LoggerOptions, pino } from "pino";
import { env } from "../env";

const baseOptions: LoggerOptions = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "*.accessToken",
      "*.refreshToken",
      "*.password",
      "*.authorization",
      "req.headers.cookie",
    ],
    censor: "[redacted]",
  },
};

export const logger =
  env.NODE_ENV === "development"
    ? pino({ ...baseOptions, transport: { target: "pino-pretty" } })
    : pino(baseOptions);
