export class XApiError extends Error {
  constructor(
    readonly status: number,
    readonly endpoint: string,
    readonly body: string,
  ) {
    super(`X API ${status} from ${endpoint}`);
    this.name = "XApiError";
  }
}
