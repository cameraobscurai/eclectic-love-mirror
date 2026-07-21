// @ts-nocheck
/* eslint-disable */
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCT EDIT DRAWER v3 — reconciled against the codebase investigation
 * Eclectic Hive · exported as <ProductEditDrawer/> (no collision with the
 * inline EditDrawer in admin.products.tsx — that one gets deleted on port)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * EVERY INVESTIGATOR CONCERN, RESOLVED IN THIS FILE:
 *
 *  §5 STATUS ENUM — STATUS_OPTIONS now uses the REAL item_status enum
 *     (available | reserved | sold | draft) with EH-voice labels. If a row
 *     carries a legacy/unknown value (the old inline drawer wrote "hold"),
 *     the select surfaces it as-is instead of blanking. No migration.
 *
 *  §4 AUDIT SHAPE — recentChanges now takes RAW listProductAudit rows
 *     ({id, at, actor_id, action, before, after, metadata} with whole-row
 *     JSON snapshots). flattenAuditRows() inside this file diffs the
 *     snapshots into per-field entries. The route passes audit straight
 *     through — the transform is NOT the route's problem anymore.
 *
 *  §7 UNDO SEMANTICS — Undo extracts the ONE field's raw prior value from
 *     the snapshot and ships a single-field patch via onSave. It can never
 *     stomp later edits to other fields. onUndo prop is GONE — one less
 *     thing to wire. Undo only renders for fields the current role may edit.
 *
 *  §7 DROPPED FIELDS — decisions, not silence:
 *       origin           → restored, staff-editable, in Details (provenance
 *                          is a real merchandising field for this business)
 *       og_image         → admin-only, in a new Advanced group
 *       manual_injection → admin-only toggle, Advanced group
 *       manual_order     → intentionally no field here: it's written by the
 *                          drag-reorder surface at /admin/photos, which is
 *                          its real UI. Documented, not dropped.
 *
 *  §7 NAME COLLISION — export renamed to ProductEditDrawer.
 *
 *  §3/§7 ROLE — drawer defaults to role="staff" (least privilege) so it is
 *     safe before the getMyRole plumbing lands. Server recipe below.
 *
 * ── PORT RECIPE (matches the investigator's ship order) ──────────────────────
 *
 *  STEP 2 · admin-middleware.ts — attach the matched role:
 *     .server(async ({ next, context }) => {
 *       ...same query, but keep the result:
 *       const matched = (data ?? []).map(r => r.role);
 *       if (!matched.length) throw new Response(..., { status: 403 });
 *       return next({ context: { role: matched.includes("admin") ? "admin" : "staff" } });
 *     })
 *
 *  STEP 3 · products-admin.functions.ts — split the allowlist and branch:
 *     const STAFF_EDITABLE_FIELDS = ["title","description","price","status",
 *       "category","materials","origin","images","quantity","quantity_label",
 *       "dimensions_raw","public_ready","hidden_note","editorial_order",
 *       "manual_order","card_background_url","upscaled_cover_url",
 *       "cover_focal_x","cover_focal_y","width_cm","height_cm","depth_cm",
 *       "weight_kg"] as const;
 *     const ADMIN_ONLY_FIELDS = ["slug","meta_title","meta_description",
 *       "og_image","manual_injection"] as const;
 *     // in updateProduct.handler:
 *     const allowed = context.role === "admin"
 *       ? [...STAFF_EDITABLE_FIELDS, ...ADMIN_ONLY_FIELDS]
 *       : STAFF_EDITABLE_FIELDS;
 *     (rms_id stays out of both lists — correctly locked today.)
 *
 *  STEP 4 · tiny role read for the client:
 *     export const getMyRole = createServerFn({ method: "POST" })
 *       .middleware([requireStaffOrAdmin])
 *       .handler(async ({ context }) => ({ role: context.role }));
 *
 *  STEP 5 · admin.products.tsx — replace the inline EditDrawer block
 *     (lines ~251–550) with:
 *       <ProductEditDrawer
 *         product={row}
 *         categories={cats}                       // listDistinctCategories, unchanged
 *         role={myRole}                           // from getMyRole
 *         recentChanges={audit}                   // RAW listProductAudit rows — passthrough
 *         categoryPriceStats={stats}              // select category, price from inventory_items
 *         liveUrl={`${LIVE_ORIGIN}/collection/${row.slug}`}
 *         onSave={(patch) => upd({ data: { id, patch } }).then(refetchRowAndAudit)}
 *         onOpenPhotos={() => setPhotoEditor(true)}  // existing ImageOrderEditor, untouched
 *         onClose={...}
 *       />
 *
 *  DEFERRED (agreed) · server-side mirror of client validate() — hardening
 *     pass. Suggested shape: reject non-finite/negative price + quantity,
 *     non-integer quantity, in updateProduct before the .update() call.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from "react";

/* ═════════════ TOKENS (src/styles.css + glass.ts) ═════════════ */

const T = {
  paper: "#fafaf7",
  white: "#ffffff",
  charcoal: "#1a1a1a",
  sand: "#d4cdc4",
  warmGray: "#8a8a8a",
  destructive: "#8c2f22",
  serif: "'Saol Display', ui-serif, Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  trackLabel: "0.15em",
  trackWide: "0.2em",
  trackUltra: "0.26em",
  hairline: "1px solid rgba(26,26,26,0.12)",
  hairlineSoft: "1px solid rgba(26,26,26,0.08)",
};

const micro = (size = 10, track = T.trackUltra, color = "rgba(26,26,26,0.5)") => ({
  fontFamily: T.sans, fontSize: size, letterSpacing: track,
  textTransform: "uppercase", color, fontWeight: 500,
});

/* ═════════════ STATUS — real item_status enum, EH voice ═════════════ */

const STATUS_OPTIONS = [
  { value: "available", label: "In rotation" },
  { value: "reserved", label: "Reserved / on hold" },
  { value: "draft", label: "Draft — not yet site-ready" },
  { value: "sold", label: "Sold — kept for records" },
];

/* ═════════════ FIELD METADATA ═════════════ */

const FIELD_META = {
  title: {
    group: "basics", label: "Name", type: "text", staffEditable: true,
    help: "Shown on the collection page, in inquiries, and in proposals.",
    validate: (v) => (!v || !String(v).trim() ? "Every piece needs a name." : null),
  },
  category: {
    group: "basics", label: "Category", type: "category", staffEditable: true,
    help: "Which shelf of the archive this lives on.",
  },
  status: {
    group: "basics", label: "Status", type: "status", staffEditable: true,
    help: "Drafts and sold pieces stay in the system; only what's in rotation belongs on the site.",
  },
  description: {
    group: "story", label: "Description", type: "textarea", staffEditable: true,
    help: "A sentence or two in the Hive voice. Clients read this in Quick View.",
  },
  dimensions_raw: {
    group: "details", label: "Dimensions", type: "text", staffEditable: true,
    help: 'As written on the tag — e.g. 30"W × 30"D × 29"H. Planners live by these.',
  },
  materials: {
    group: "details", label: "Materials", type: "text", staffEditable: true,
    help: "Oak, brass, bouclé — comma-separated is fine.",
  },
  origin: {
    group: "details", label: "Origin", type: "text", staffEditable: true,
    help: "Where it came from — maker, market, or a story worth keeping.",
  },
  quantity: {
    group: "details", label: "Quantity on hand", type: "number", staffEditable: true,
    help: "How many can go out to a single event.",
    validate: (v) =>
      v !== "" && v != null && (!Number.isFinite(+v) || +v < 0 || !Number.isInteger(+v))
        ? "Whole numbers only — like 4 or 12." : null,
  },
  quantity_label: {
    group: "details", label: "Counted as", type: "text", staffEditable: true,
    help: 'Optional unit — "sets", "pairs", "per dozen".',
  },
  price: {
    group: "details", label: "Rental rate", type: "price", staffEditable: true,
    help: "Per event, in dollars. Used in proposals and quotes — never shown on the public site.",
    validate: (v) =>
      v !== "" && v != null && (!Number.isFinite(+v) || +v < 0)
        ? "The rate needs to be a number, like 85 or 85.50." : null,
  },
  public_ready: {
    group: "visibility", label: "Visible on site", type: "toggle", staffEditable: true,
    help: "Controls whether this piece appears in the public collection.",
  },
  editorial_order: {
    group: "visibility", label: "Sort order", type: "number", staffEditable: true,
    help: "Lower numbers appear first in the category. Blank = automatic.",
    validate: (v) => (v !== "" && v != null && !Number.isFinite(+v) ? "Needs to be a number." : null),
  },
  hidden_note: {
    group: "visibility", label: "Team note", type: "textarea", staffEditable: true,
    help: "Only the team sees this — condition, sourcing, staging warnings.",
  },
  slug: {
    group: "system", label: "Web address", type: "locked", staffEditable: false,
    help: "Changing this breaks saved links. Ask Darian.",
  },
  rms_id: {
    group: "system", label: "RMS id", type: "locked", staffEditable: false, neverEditable: true,
    help: "Ties this piece to the rental-system import.",
  },
  meta_title: { group: "seo", label: "Meta title", type: "text", staffEditable: false, adminOnly: true, help: "Search-result headline override." },
  meta_description: { group: "seo", label: "Meta description", type: "textarea", staffEditable: false, adminOnly: true, help: "Search-result blurb override." },
  og_image: { group: "advanced", label: "Social share image", type: "text", staffEditable: false, adminOnly: true, help: "URL override for link previews (Open Graph)." },
  manual_injection: {
    group: "advanced", label: "Manual injection", type: "toggle", staffEditable: false, adminOnly: true,
    help: "Marks a hand-added piece so the RMS importer never overwrites it.",
  },
  /* manual_order intentionally has no field here: it is written by the
     drag-reorder surface at /admin/photos, which is its real UI. */
};

const GROUPS = [
  { id: "basics", title: "Basics" },
  { id: "photos", title: "Photos" },
  { id: "story", title: "Story" },
  { id: "details", title: "Details & rate" },
  { id: "visibility", title: "Visibility & order" },
  { id: "system", title: "System" },
  { id: "seo", title: "Search (SEO)", adminOnly: true },
  { id: "advanced", title: "Advanced", adminOnly: true },
];

/* ═════════════ AUDIT FLATTEN — raw admin_audit_log rows → per-field diffs ═══
 * Input rows: {id, at, actor_id, action, before, after, metadata} where
 * before/after are whole-row JSON snapshots (or null on insert).
 * Also accepts already-flat rows ({field, ...}) for forward compatibility.  */

const AUDIT_SKIP_KEYS = new Set(["id", "updated_at", "created_at", "images"]);

function displayAuditValue(field, v) {
  if (field === "public_ready") return v ? "visible" : "hidden";
  if (field === "manual_injection") return v ? "on" : "off";
  if (v == null || v === "") return "—";
  const s = String(v);
  return s.length > 42 ? s.slice(0, 39) + "…" : s;
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function flattenAuditRows(rows, limit = 8) {
  const out = [];
  for (const r of rows ?? []) {
    if (!r) continue;
    if ("field" in r) { out.push(r); continue; } /* already flat */
    const before = r.before ?? {};
    const after = r.after ?? {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      if (AUDIT_SKIP_KEYS.has(k)) continue;
      const b = before[k];
      const a = after[k];
      if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) continue;
      out.push({
        id: `${r.id}:${k}`,
        field: k,
        rawBefore: b === undefined ? null : b, /* exact prior value for Undo */
        before: displayAuditValue(k, b),
        after: displayAuditValue(k, a),
        when: timeAgo(r.at),
      });
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/* ═════════════ READINESS — the business rules, one function ═════════════ */

function computeReadiness(values, product) {
  const checks = [
    { id: "photo", label: "At least one photo", pass: (product?.images?.length ?? 0) > 0 },
    { id: "title", label: "Named", pass: !!String(values.title ?? "").trim() },
    { id: "category", label: "On a shelf (category)", pass: !!values.category },
    { id: "dims", label: "Dimensions on record", pass: !!String(values.dimensions_raw ?? "").trim() },
    { id: "desc", label: "Described in the Hive voice", pass: String(values.description ?? "").trim().length >= 20 },
    { id: "rate", label: "Rate set for proposals", pass: values.price !== "" && values.price != null && +values.price > 0, internal: true },
  ];
  const missing = checks.filter((c) => !c.pass);
  const publicMissing = missing.filter((c) => !c.internal);
  return { checks, missing, publicMissing, ready: missing.length === 0, publicReadyOk: publicMissing.length === 0 };
}

/* ═════════════ FORM ENGINE (RHF stand-in — swappable on port) ═════════════ */

function useDraft(product) {
  const initial = useMemo(() => {
    const v = {};
    for (const k of Object.keys(FIELD_META)) {
      const raw = product?.[k];
      v[k] = raw == null ? (FIELD_META[k].type === "toggle" ? false : "") : raw;
    }
    return v;
  }, [product]);

  const [values, setValues] = useState(initial);
  useEffect(() => setValues(initial), [initial]);

  const dirty = useMemo(() => {
    const d = {};
    for (const k of Object.keys(FIELD_META))
      if (String(values[k] ?? "") !== String(initial[k] ?? "")) d[k] = true;
    return d;
  }, [values, initial]);

  const errors = useMemo(() => {
    const e = {};
    for (const [k, meta] of Object.entries(FIELD_META)) {
      const err = meta.validate?.(values[k]);
      if (err) e[k] = err;
    }
    return e;
  }, [values]);

  return {
    values, dirty, errors,
    dirtyCount: Object.keys(dirty).length,
    hasErrors: Object.keys(errors).length > 0,
    setField: (k, v) => setValues((s) => ({ ...s, [k]: v })),
    reset: () => setValues(initial),
    buildPatch: () => {
      const patch = {};
      for (const k of Object.keys(dirty)) {
        const meta = FIELD_META[k];
        let v = values[k];
        if (meta.type === "number" || meta.type === "price") v = v === "" ? null : +v;
        if (meta.type === "toggle") v = !!v;
        patch[k] = v;
      }
      return patch;
    },
  };
}

/* ═════════════ ATOMS ═════════════ */

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 style={micro()}>{children}</h3>
      <div className="flex-1" style={{ borderTop: T.hairlineSoft }} />
    </div>
  );
}

function HelpText({ children, error }) {
  return (
    <p style={{ fontFamily: T.sans, fontSize: 11, lineHeight: 1.5, marginTop: 5, color: error ? T.destructive : "rgba(26,26,26,0.42)" }}>
      {error || children}
    </p>
  );
}

function DirtyDot({ show }) {
  return <span aria-hidden style={{ display: "inline-block", width: 5, height: 5, marginLeft: 7, background: T.charcoal, opacity: show ? 1 : 0, transition: "opacity 160ms", verticalAlign: "middle" }} />;
}

const inputBase = {
  fontFamily: T.sans, fontSize: 13, color: T.charcoal, width: "100%",
  background: T.white, border: T.hairline, borderRadius: 0, padding: "9px 11px", outline: "none",
};

function TextField({ k, meta, value, onChange, error, dirty, rows, trailing }) {
  const [focus, setFocus] = useState(false);
  const style = { ...inputBase, borderColor: error ? T.destructive : focus ? T.charcoal : "rgba(26,26,26,0.12)", resize: "vertical" };
  const shared = {
    id: `f-${k}`, value: value ?? "", style,
    onFocus: () => setFocus(true), onBlur: () => setFocus(false),
    onChange: (e) => onChange(e.target.value),
    "aria-invalid": !!error, "aria-describedby": `h-${k}`,
  };
  return (
    <div className="mb-5">
      <label htmlFor={`f-${k}`} style={micro(10, T.trackLabel, "rgba(26,26,26,0.62)")}>
        {meta.label}<DirtyDot show={dirty} />
      </label>
      <div style={{ marginTop: 6 }}>
        {rows ? <textarea rows={rows} {...shared} /> : (
          <input type="text" inputMode={meta.type === "number" || meta.type === "price" ? "decimal" : undefined} {...shared} />
        )}
      </div>
      {trailing}
      <span id={`h-${k}`}><HelpText error={error}>{meta.help}</HelpText></span>
    </div>
  );
}

function SelectField({ k, meta, value, onChange, dirty, options }) {
  /* Legacy-value guard (§5): if the row carries a value outside the option
     set (old inline drawer once wrote "hold"), surface it rather than blank. */
  const opts = useMemo(() => {
    const v = value ?? "";
    if (v && !options.some((o) => o.value === v)) {
      return [...options, { value: v, label: `${v} (legacy value)` }];
    }
    return options;
  }, [options, value]);
  return (
    <div className="mb-5">
      <label htmlFor={`f-${k}`} style={micro(10, T.trackLabel, "rgba(26,26,26,0.62)")}>
        {meta.label}<DirtyDot show={dirty} />
      </label>
      <div style={{ marginTop: 6, position: "relative" }}>
        <select id={`f-${k}`} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputBase, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: "pointer" }}>
          <option value="" disabled>Choose…</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span aria-hidden style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "rgba(26,26,26,0.5)", pointerEvents: "none" }}>▾</span>
      </div>
      <HelpText>{meta.help}</HelpText>
    </div>
  );
}

function ToggleField({ k, meta, value, onChange, dirty, warning }) {
  const on = !!value;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={`f-${k}`} style={{ ...micro(10, T.trackLabel, "rgba(26,26,26,0.62)"), cursor: "pointer" }}>
          {meta.label}<DirtyDot show={dirty} />
        </label>
        <button id={`f-${k}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}
          style={{ width: 44, height: 24, padding: 2, borderRadius: 0, cursor: "pointer", border: T.hairline, background: on ? T.charcoal : T.white, transition: "background 180ms", flexShrink: 0 }}>
          <span aria-hidden style={{ display: "block", width: 18, height: 18, background: on ? T.paper : T.sand, transform: on ? "translateX(20px)" : "translateX(0)", transition: "transform 180ms cubic-bezier(0.4,0,0.2,1), background 180ms" }} />
        </button>
      </div>
      <HelpText>{meta.help}</HelpText>
      {warning}
    </div>
  );
}

function LockedChip({ meta, value }) {
  return (
    <div className="mb-5">
      <span style={micro(10, T.trackLabel, "rgba(26,26,26,0.45)")}>{meta.label}</span>
      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
        <span style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(26,26,26,0.55)", background: "rgba(26,26,26,0.04)", border: T.hairlineSoft, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="4" y="11" width="16" height="10" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {value || "—"}
        </span>
      </div>
      <HelpText>{meta.help}</HelpText>
    </div>
  );
}

/* ═════════════ PREVIEW — faithful public tile (ProductTile + QuickView) ════ */

function SpecRow({ label, value }) {
  return (
    <div style={{ paddingTop: 10 }}>
      <p style={micro(8.5, T.trackWide, "rgba(26,26,26,0.4)")}>{label}</p>
      <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(26,26,26,0.8)", marginTop: 3 }}>{value}</p>
    </div>
  );
}

function PreviewTile({ values, product, sketch }) {
  const hidden = !values.public_ready;
  const qty = values.quantity !== "" && values.quantity != null
    ? `${values.quantity}${values.quantity_label ? ` ${values.quantity_label}` : ""}` : null;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ background: T.white, border: T.hairlineSoft, filter: hidden ? "grayscale(1)" : "none", opacity: hidden ? 0.55 : 1, transition: "opacity 240ms, filter 240ms" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "5 / 4", background: T.white, overflow: "hidden" }}>
          {(product?.images?.length ?? 0) > 0 ? (
            <div style={{ position: "absolute", left: "50%", bottom: "8%", transform: "translateX(-50%)", width: "72%" }}>{sketch}</div>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#f5f3ef" }}>
              <span style={micro(8.5, T.trackWide, "rgba(26,26,26,0.35)")}>Awaiting photography</span>
            </div>
          )}
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <p style={{
            fontFamily: T.sans, fontSize: 11, lineHeight: 1.4, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "rgba(26,26,26,0.8)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            minHeight: "2.8em",
          }}>
            {String(values.title ?? "").trim() || "Untitled piece"}
          </p>
        </div>
      </div>
      {hidden && (
        <div style={{ position: "absolute", top: 10, left: 10, background: T.charcoal, padding: "5px 9px" }}>
          <span style={micro(8, T.trackWide, T.paper)}>Hidden from site</span>
        </div>
      )}
      <div style={{ borderTop: T.hairlineSoft, marginTop: 12 }}>
        {String(values.dimensions_raw ?? "").trim() && <SpecRow label="Dimensions" value={values.dimensions_raw} />}
        {qty && <SpecRow label="Stocked" value={qty} />}
        {String(values.description ?? "").trim() && (
          <div style={{ paddingTop: 10 }}>
            <p style={{ fontFamily: T.serif, fontSize: 12.5, lineHeight: 1.6, color: "rgba(26,26,26,0.72)", fontStyle: "italic" }}>
              {values.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadinessCard({ readiness, isDraftStatus }) {
  const { checks, ready } = readiness;
  const passCount = checks.filter((c) => c.pass).length;
  return (
    <div style={{ border: T.hairline, background: T.white, padding: 16, marginTop: 18 }}>
      <div className="flex items-center justify-between">
        <p style={micro(9, T.trackUltra, "rgba(26,26,26,0.5)")}>
          {isDraftStatus ? "Prep before it goes live" : "Site readiness"}
        </p>
        <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(26,26,26,0.45)" }}>{passCount} / {checks.length}</p>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3" style={{ padding: "5px 0" }}>
            <span aria-hidden style={{
              width: 12, height: 12, flexShrink: 0, marginTop: 2, display: "grid", placeItems: "center",
              border: c.pass ? `1px solid ${T.charcoal}` : "1px solid rgba(26,26,26,0.25)",
              background: c.pass ? T.charcoal : "transparent", transition: "background 200ms, border-color 200ms",
            }}>
              {c.pass && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={T.paper} strokeWidth="3.5"><path d="M20 6L9 17l-5-5" /></svg>}
            </span>
            <span style={{ fontFamily: T.sans, fontSize: 11.5, lineHeight: 1.45, color: c.pass ? "rgba(26,26,26,0.75)" : "rgba(26,26,26,0.45)" }}>
              {c.label}{c.internal && <span style={{ ...micro(7.5, T.trackLabel, "rgba(26,26,26,0.35)"), marginLeft: 6 }}>Internal</span>}
            </span>
          </li>
        ))}
      </ol>
      {ready && (
        <div style={{ marginTop: 14, border: `1px solid ${T.charcoal}`, padding: "9px 12px", textAlign: "center" }}>
          <span style={{ fontFamily: T.serif, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: T.charcoal }}>
            Ready for the archive
          </span>
        </div>
      )}
    </div>
  );
}

function RateContext({ category, price, stats }) {
  const s = stats?.[category];
  if (!s) return null;
  const p = price !== "" && price != null ? +price : null;
  const outlier = p != null && Number.isFinite(p) && p > 0 && (p > s.max * 3 || (p < s.min / 3 && p > 0));
  return (
    <p style={{ fontFamily: T.sans, fontSize: 11, lineHeight: 1.5, marginTop: 5, color: outlier ? T.destructive : "rgba(26,26,26,0.42)" }}>
      {outlier
        ? `That's well outside the ${category} range ($${s.min}–$${s.max}) — double-check before it lands in a proposal.`
        : `${category ? category[0].toUpperCase() + category.slice(1) : ""} in the archive runs $${s.min}–$${s.max} · most pieces around $${s.median}.`}
    </p>
  );
}

/* ═════════════ THE DRAWER (portable) ═════════════ */

export function ProductEditDrawer({
  product, categories, role = "staff", recentChanges = [], categoryPriceStats = {},
  onSave, onClose, onOpenPhotos, liveUrl, sketch,
}) {
  const draft = useDraft(product);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isAdmin = role === "admin";
  const readiness = computeReadiness(draft.values, product);
  const isDraftStatus = draft.values.status === "draft";
  const wasLive = !!product?.public_ready;
  const nowLive = !!draft.values.public_ready;

  /* Raw audit rows in → flat per-field diffs, computed here (§4). */
  const flatChanges = useMemo(() => flattenAuditRows(recentChanges), [recentChanges]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const requestClose = () => (draft.dirtyCount > 0 ? setConfirmDiscard(true) : onClose());

  const save = async () => {
    if (draft.hasErrors || draft.dirtyCount === 0 || saving) return;
    setSaving(true);
    try {
      await onSave(draft.buildPatch());
      setSavedAt(Date.now());
      setConfirmDiscard(false);
    } finally { setSaving(false); }
  };

  /* Undo = single-field patch from the snapshot's exact prior value (§7).
     Cannot stomp other fields; only offered where this role may edit. */
  const canUndoField = (field) => {
    const meta = FIELD_META[field];
    return !!meta && !meta.neverEditable && (isAdmin || meta.staffEditable);
  };
  const undoChange = async (c) => {
    if (saving || !canUndoField(c.field)) return;
    setSaving(true);
    try {
      await onSave({ [c.field]: c.rawBefore ?? null });
      setSavedAt(Date.now());
    } finally { setSaving(false); }
  };

  const visibilityWarning = (() => {
    if (nowLive && !readiness.publicReadyOk) {
      const gaps = readiness.publicMissing.map((c) => c.label.toLowerCase()).join(", ");
      return (
        <p style={{ fontFamily: T.sans, fontSize: 11, lineHeight: 1.55, marginTop: 6, color: T.destructive }}>
          It will appear with gaps clients can see: {gaps}. It can still go live — your call.
        </p>
      );
    }
    if (wasLive && !nowLive) {
      return (
        <p style={{ fontFamily: T.sans, fontSize: 11, lineHeight: 1.55, marginTop: 6, color: "rgba(26,26,26,0.55)" }}>
          This piece leaves the public collection at the next site publish. Nothing is deleted.
        </p>
      );
    }
    return null;
  })();

  const fieldControl = (k) => {
    const meta = FIELD_META[k];
    const editable = !meta.neverEditable && (isAdmin || meta.staffEditable);
    if (meta.type === "locked" || !editable) {
      if (isAdmin && meta.type === "locked" && !meta.neverEditable) {
        return <TextField key={k} k={k} meta={meta} value={draft.values[k]} dirty={draft.dirty[k]} error={draft.errors[k]} onChange={(v) => draft.setField(k, v)} />;
      }
      return <LockedChip key={k} meta={meta} value={product?.[k]} />;
    }
    const common = { key: k, k, meta, value: draft.values[k], dirty: draft.dirty[k], error: draft.errors[k], onChange: (v) => draft.setField(k, v) };
    if (meta.type === "toggle") return <ToggleField {...common} warning={k === "public_ready" ? visibilityWarning : null} />;
    if (meta.type === "status") return <SelectField {...common} options={STATUS_OPTIONS} />;
    if (meta.type === "category") return <SelectField {...common} options={(categories || []).map((c) => ({ value: c, label: c }))} />;
    if (meta.type === "textarea") return <TextField {...common} rows={4} />;
    if (meta.type === "price") return (
      <TextField {...common}
        trailing={!common.error ? <RateContext category={draft.values.category} price={draft.values.price} stats={categoryPriceStats} /> : null} />
    );
    return <TextField {...common} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Edit ${product?.title ?? "product"}`}>
      <button onClick={requestClose} aria-label="Close editor" className="absolute inset-0 w-full"
        style={{
          background: "linear-gradient(to bottom, rgba(26,26,26,0.10), rgba(26,26,26,0.24))",
          backdropFilter: "blur(6px) saturate(1.05) brightness(0.92)",
          WebkitBackdropFilter: "blur(6px) saturate(1.05) brightness(0.92)",
          border: "none", cursor: "pointer",
        }} />

      <aside className="relative h-full w-full flex flex-col" style={{
        maxWidth: 920, background: T.paper, borderLeft: T.hairline,
        boxShadow: "-24px 0 64px -32px rgba(26,26,26,0.35)",
        animation: "eh-drawer-in 320ms cubic-bezier(0.32,0.72,0,1) both",
      }}>
        <style>{`
          @keyframes eh-drawer-in { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
          @media (prefers-reduced-motion: reduce) { aside { animation: none !important } }
          .eh-cols { display: grid; grid-template-columns: minmax(0,1fr) 292px; gap: 0; height: 100%; }
          .eh-preview-col { border-left: ${T.hairlineSoft}; }
          @media (max-width: 860px) { .eh-cols { grid-template-columns: minmax(0,1fr) } .eh-preview-col { display: none } }
        `}</style>

        <header style={{ padding: "20px 26px 16px", borderBottom: T.hairline, background: T.white }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p style={micro(9, T.trackUltra, "rgba(26,26,26,0.4)")}>
                {draft.values.category || "Uncategorized"}
                {product?.rms_id ? <span style={{ marginLeft: 10, letterSpacing: T.trackLabel }}>№ {product.rms_id}</span> : null}
              </p>
              <h2 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: 25, lineHeight: 1.15, letterSpacing: "-0.01em", color: T.charcoal, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {draft.values.title || product?.title || "Untitled piece"}
              </h2>
            </div>
            <button onClick={requestClose} style={{ ...micro(10, T.trackLabel, "rgba(26,26,26,0.55)"), background: "none", border: "none", cursor: "pointer", padding: "4px 2px", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.charcoal)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(26,26,26,0.55)")}>Close</button>
          </div>
          <div className="flex items-center gap-4" style={{ marginTop: 10 }}>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" style={{ ...micro(9, T.trackLabel, "rgba(26,26,26,0.55)"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                View on live site
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
              </a>
            )}
            <span style={micro(9, T.trackLabel, nowLive ? "rgba(26,26,26,0.55)" : "rgba(140,47,34,0.8)")}>
              {nowLive ? "● In the public collection" : "○ Hidden from site"}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          <div className="eh-cols">
            <div className="overflow-y-auto" style={{ padding: "24px 26px 130px" }}>
              {GROUPS.map((g) => {
                if (g.adminOnly && !isAdmin) return null;
                if (g.id === "photos") {
                  const count = product?.images?.length || 0;
                  return (
                    <section key={g.id} style={{ marginBottom: 34 }}>
                      <SectionHeader>{g.title}</SectionHeader>
                      <div className="flex items-center gap-4">
                        <div style={{ width: 72, height: 72, flexShrink: 0, background: count ? T.white : "#f5f3ef", border: T.hairline, display: "grid", placeItems: "center", overflow: "hidden" }}>
                          <span style={{ fontFamily: T.serif, fontSize: 28, color: T.sand }}>{(draft.values.title || "?").charAt(0)}</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(26,26,26,0.6)" }}>
                            {count ? `${count} photo${count === 1 ? "" : "s"} · first one is the cover` : "No photos yet — the tile shows a blank frame until there is one"}
                          </p>
                          <button onClick={onOpenPhotos}
                            style={{ ...micro(10, T.trackLabel, T.charcoal), background: "none", border: T.hairline, padding: "8px 14px", marginTop: 8, cursor: "pointer" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.charcoal; e.currentTarget.style.color = T.paper; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.charcoal; }}>
                            {count ? "Edit photos & order" : "Add photos"}
                          </button>
                        </div>
                      </div>
                    </section>
                  );
                }
                const keys = Object.keys(FIELD_META).filter((k) => FIELD_META[k].group === g.id);
                if (!keys.length) return null;
                return (
                  <section key={g.id} style={{ marginBottom: 34 }}>
                    <SectionHeader>{g.title}</SectionHeader>
                    {keys.map(fieldControl)}
                  </section>
                );
              })}

              {flatChanges.length > 0 && (
                <section>
                  <SectionHeader>Recent changes</SectionHeader>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {flatChanges.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-3" style={{ padding: "10px 0", borderBottom: T.hairlineSoft }}>
                        <div style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(26,26,26,0.72)", lineHeight: 1.5 }}>
                          <span style={{ color: T.charcoal, fontWeight: 500 }}>{FIELD_META[c.field]?.label || c.field}</span>
                          {" "}changed from <s style={{ color: "rgba(26,26,26,0.45)" }}>{String(c.before ?? "—")}</s> to{" "}
                          <span style={{ fontWeight: 500 }}>{String(c.after ?? "—")}</span>
                          <span style={{ color: "rgba(26,26,26,0.38)", marginLeft: 8, fontSize: 11 }}>{c.when}</span>
                        </div>
                        {canUndoField(c.field) && (
                          <button onClick={() => undoChange(c)} disabled={saving}
                            style={{ ...micro(9, T.trackLabel, "rgba(26,26,26,0.5)"), background: "none", border: "none", cursor: saving ? "default" : "pointer", flexShrink: 0 }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = T.charcoal)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(26,26,26,0.5)")}>Undo</button>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <div className="eh-preview-col overflow-y-auto" style={{ padding: "24px 22px 130px", background: T.paper }}>
              <p style={{ ...micro(9, T.trackUltra, "rgba(26,26,26,0.4)"), marginBottom: 12 }}>As clients will see it</p>
              <PreviewTile values={draft.values} product={product} sketch={sketch} />
              <ReadinessCard readiness={readiness} isDraftStatus={isDraftStatus} />
            </div>
          </div>
        </div>

        <footer className="absolute bottom-0 left-0 right-0" style={{
          borderTop: T.hairline, padding: "14px 26px",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.95))",
          backdropFilter: "blur(14px) saturate(1.05)", WebkitBackdropFilter: "blur(14px) saturate(1.05)",
        }}>
          {confirmDiscard ? (
            <div className="flex items-center justify-between gap-3">
              <p style={{ fontFamily: T.sans, fontSize: 12, color: T.charcoal }}>
                You have {draft.dirtyCount} unsaved change{draft.dirtyCount === 1 ? "" : "s"}.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDiscard(false)}
                  style={{ ...micro(10, T.trackLabel, T.charcoal), background: "none", border: T.hairline, padding: "9px 14px", cursor: "pointer" }}>Keep editing</button>
                <button onClick={() => { draft.reset(); setConfirmDiscard(false); onClose(); }}
                  style={{ ...micro(10, T.trackLabel, T.paper), background: T.destructive, border: `1px solid ${T.destructive}`, padding: "9px 14px", cursor: "pointer" }}>Discard & close</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(26,26,26,0.45)" }}>
                {saving ? "Saving…"
                  : draft.dirtyCount > 0 ? `${draft.dirtyCount} unsaved change${draft.dirtyCount === 1 ? "" : "s"}`
                  : savedAt ? "Saved — goes live with the next site publish" : "No changes yet"}
              </span>
              <div className="flex items-center gap-2">
                {draft.dirtyCount > 0 && !saving && (
                  <button onClick={() => draft.reset()}
                    style={{ ...micro(10, T.trackLabel, "rgba(26,26,26,0.55)"), background: "none", border: "none", padding: "9px 6px", cursor: "pointer" }}>Discard</button>
                )}
                <button onClick={save} disabled={saving || draft.dirtyCount === 0 || draft.hasErrors}
                  style={{
                    ...micro(10, T.trackWide, draft.dirtyCount > 0 && !draft.hasErrors ? T.paper : "rgba(26,26,26,0.35)"),
                    background: draft.dirtyCount > 0 && !draft.hasErrors ? T.charcoal : "rgba(26,26,26,0.05)",
                    border: T.hairline, padding: "11px 20px",
                    cursor: draft.dirtyCount > 0 && !draft.hasErrors ? "pointer" : "default",
                    transition: "background 180ms, color 180ms", minWidth: 150, textAlign: "center",
                  }}>
                  {saving ? "Saving…" : draft.hasErrors ? "Fix errors first" : draft.dirtyCount > 0 ? `Save ${draft.dirtyCount} change${draft.dirtyCount === 1 ? "" : "s"}` : "Saved"}
                </button>
              </div>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

