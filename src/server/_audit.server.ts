// Append-only audit log writer for privileged admin mutations.
//
// .server.ts suffix → TanStack/Vite import-protection blocks this file from
// the client bundle. Call only from inside createServerFn handlers.
//
// Fire-and-forget: caller should `void audit(...)` or `await` without
// throwing — a failed audit must never bubble up and cancel the underlying
// mutation. If audit writes start failing, surface via console.error.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

export interface AuditArgs {
  actorId: string;
  entity: string;          // 'inventory_items' | 'style_boards' | 'inquiries' | ...
  entityId: string;        // uuid of the affected row
  action: string;          // 'update_images' | 'set_card_bg' | 'send_board' | 'email_failed' | ...
  before?: unknown;        // previous shape (only the mutated fields, not the whole row)
  after?: unknown;         // new shape (only the mutated fields)
  /**
   * Extra metadata to merge into the auto-collected { ip, ua } envelope.
   * Use for action-specific context: HTTP status from a failed email send,
   * upstream error code, batch id, etc.
   */
  metadata?: Record<string, unknown>;
}

export async function audit(args: AuditArgs): Promise<void> {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
    ua = getRequestHeader("user-agent") ?? null;
  } catch {
    // Outside a request context — fine, leave nulls.
  }

  const { error } = await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: args.actorId,
    entity: args.entity,
    entity_id: args.entityId,
    action: args.action,
    before: args.before ?? null,
    after: args.after ?? null,
    metadata: { ip, ua, ...(args.metadata ?? {}) },
  });

  if (error) {
    console.error("[audit] failed to write audit row", {
      entity: args.entity,
      entityId: args.entityId,
      action: args.action,
      error: error.message,
    });
  }
}
