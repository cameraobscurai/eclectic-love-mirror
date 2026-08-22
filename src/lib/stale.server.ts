// Server-only helper: raise a compare-and-swap conflict as a 409.
//
// `setResponseStatus` is what puts 409 on the wire; the thrown AppError is what
// reaches the client's catch block with a readable, branchable message.
// Kept in a `.server.ts` file so `setResponseStatus` never enters a client bundle.

import { setResponseStatus } from "@tanstack/react-start/server";
import { AppError, STALE_MESSAGE } from "@/lib/app-error";

export { STALE_MESSAGE };

export function staleError(message: string = STALE_MESSAGE): AppError {
  setResponseStatus(409);
  return new AppError("STALE", message, 409);
}
