// Typed application errors for server functions.
//
// A thrown `Response` crosses the server-fn RPC boundary as `[object Response]`
// on the client, so we throw a real Error (message survives serialization) and
// set the HTTP status separately via `setResponseStatus`. Callers get both:
// a 409 on the wire and a branchable `STALE:` message in the catch block.

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(`${code}: ${message}`);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/** True for the compare-and-swap conflict raised by admin write paths. */
export function isStaleError(e: unknown): boolean {
  if (e instanceof AppError) return e.code === "STALE";
  const msg = (e as { message?: unknown } | null)?.message;
  return typeof msg === "string" && msg.startsWith("STALE");
}

export const STALE_MESSAGE =
  "someone else edited this item. Refresh and try again.";
