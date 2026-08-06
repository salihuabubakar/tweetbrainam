import type { ErrorCode } from "@tweetbrainam/contracts";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: ContentfulStatusCode,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = (message = "Sign in required.") =>
  new ApiError("unauthorized", message, 401);

export const notFound = (message = "Resource not found.") =>
  new ApiError("not_found", message, 404);
