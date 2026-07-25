import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias — the inquiries inbox lives on /admin/insights alongside KPIs.
// Landing on /admin/inquiries directly (from a shared link, memory, or
// autocomplete) previously 404'd; forward to the real route instead.
export const Route = createFileRoute("/admin/inquiries")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/insights" });
  },
});
