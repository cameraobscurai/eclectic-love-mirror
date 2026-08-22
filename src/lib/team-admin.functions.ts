// Admin-only server functions to manage user roles (grant/revoke staff).
// Uses supabaseAdmin because listing auth.users requires service role.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, invalidateRoleCache } from "@/integrations/supabase/admin-middleware";

type Role = "admin" | "staff" | "user";

const roleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["staff", "admin"]),
});

const isDuplicate = (e: { code?: string; message?: string } | null) =>
  e?.code === "23505" || /duplicate key/i.test(e?.message ?? "");

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Response(usersErr.message, { status: 500 });

    const { data: rolesRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Response(rolesErr.message, { status: 500 });

    const byUser = new Map<string, Role[]>();
    for (const r of rolesRows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      byUser.set(r.user_id, arr);
    }

    return usersData.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: byUser.get(u.id) ?? [],
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => roleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !isDuplicate(error)) {
      throw new Response(error.message, { status: 500 });
    }
    invalidateRoleCache(data.userId);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => roleInput.parse(d))
  .handler(async ({ data, context }) => {
    // Guard: never let the last admin (or yourself) be locked out.
    if (data.role === "admin") {
      const { data: admins, error: adminErr } = await context.supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (adminErr) throw new Response(adminErr.message, { status: 500 });
      if ((admins ?? []).length <= 1) {
        throw new Response("Cannot revoke the last remaining admin", { status: 400 });
      }
      if (data.userId === context.userId) {
        throw new Response("You cannot revoke your own admin role", { status: 400 });
      }
    }

    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Response(error.message, { status: 500 });
    invalidateRoleCache(data.userId);
    return { ok: true };
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ email: z.string().email().max(254) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (error) throw new Response(error.message, { status: 500 });
    if (!invited.user) throw new Response("No user returned", { status: 500 });

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: invited.user.id, role: "staff" });
    if (roleErr && !isDuplicate(roleErr)) {
      // Compensating rollback: don't leave a roleless auth user behind, which
      // would make a retry fail forever on "user already exists".
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id).catch(() => {});
      throw new Response(roleErr.message, { status: 500 });
    }
    invalidateRoleCache(invited.user.id);
    return { ok: true, userId: invited.user.id, email };
  });
