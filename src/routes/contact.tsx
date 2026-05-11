import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInquiry } from "@/hooks/use-inquiry";
import { withCdnWidth } from "@/lib/image-url";
import { analytics } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Contact — one editorial intake form (no wizard, no steppers).
//
// Visible sections, all in one scroll:
//   1. YOUR INFORMATION       (name, email, phone, planner/direct client)
//   2. EVENT DETAILS          (event type, service type, date, budget)
//   3. VISION + SELECTED PIECES (selected from Collection, then vision)
//
// Data contract preserved from the prior wizard:
//   • All fields above survive into the inquiry payload.
//   • Selected Collection item ids come from ?items=… (Inquiry tray handoff)
//     and from the local useInquiry store, merged + deduped.
//   • Honeypot + simple client-side rate limit.
//   • Backend table: public.inquiries (anon insert allowed by RLS).
//     Structured payload is serialized into `message`, with the first
//     selected item id stored on `item_id`.
//   • Success state clears the inquiry store. Failure surfaces hello@…
// ---------------------------------------------------------------------------

// FAQ items removed from view for now.

const SCOPE_OPTIONS = [
  "Full-service design + production",
  "Design + fabrication",
  "Rental from Collection",
  "Not sure yet",
] as const;
const BUDGET_RANGES = [
  "Under $25k",
  "$25k – $75k",
  "$75k – $150k",
  "$150k – $300k",
  "$300k+",
  "Not sure yet",
] as const;

const SUPPORT_EMAIL = "info@eclectichive.com";
const RATE_LIMIT_KEY = "hive.contact.lastSubmitAt.v1";
const RATE_LIMIT_MS = 30_000;

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Eclectic Hive" },
      {
        name: "description",
        content:
          "Inquire about design, fabrication, and production with Eclectic Hive — Denver, Colorado.",
      },
      { property: "og:title", content: "Contact — Eclectic Hive" },
      { property: "og:description", content: `Inquiries: ${SUPPORT_EMAIL}` },
    ],
  }),
  component: ContactPage,
});

interface SelectedPiece {
  id: string;
  title: string;
  category: string | null;
  image: string | null;
}

function ContactPage() {
  const { ids: storeIds, clear: clearInquiry } = useInquiry();

  // Merge URL ?items=… with local inquiry store. URL wins for ordering.
  const initialIds = useMemo(() => {
    if (typeof window === "undefined") return [] as string[];
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("items") ?? "";
    const fromUrl = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...fromUrl, ...storeIds.filter((id) => !fromUrl.includes(id))];
    return merged;
  }, [storeIds]);

  const [pieces, setPieces] = useState<SelectedPiece[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [selectionStatus, setSelectionStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (initialIds.length === 0) {
      setPieces([]);
      setSelectionStatus("idle");
      return;
    }
    setSelectionStatus("loading");
    (async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id,title,category,images")
        .in("id", initialIds);
      if (cancelled) return;
      if (error || !data) {
        setPieces([]);
        setSelectionStatus("error");
        return;
      }
      const byId = new Map(
        data.map((d) => [
          d.id,
          {
            id: d.id,
            title: d.title,
            category: d.category,
            image: Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null,
          } as SelectedPiece,
        ]),
      );
      setPieces(
        initialIds
          .map((id) => byId.get(id))
          .filter((x): x is SelectedPiece => Boolean(x)),
      );
      setSelectionStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [initialIds, fetchNonce]);

  const piecesById = useMemo(
    () => new Map(pieces.map((p) => [p.id, p])),
    [pieces],
  );
  const effectiveIds = useMemo(
    () => initialIds.filter((id) => !removedIds.has(id)),
    [initialIds, removedIds],
  );
  // Ids the user expects to see, but the catalog couldn't resolve. Surfaces
  // as a blocker on the form so we never silently submit phantom items.
  const unresolvedIds = useMemo(
    () =>
      selectionStatus === "ready"
        ? effectiveIds.filter((id) => !piecesById.has(id))
        : [],
    [effectiveIds, piecesById, selectionStatus],
  );
  const retryFetch = () => setFetchNonce((n) => n + 1);

  // Form state — owner-defined fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [scope, setScope] = useState<string>("");
  const [vision, setVision] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function removePiece(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Honeypot
    if (honeypotRef.current && honeypotRef.current.value.trim() !== "") {
      setSuccess(true); // silent accept
      return;
    }

    // Hydration guard — defense in depth (button is also disabled)
    if (selectionStatus === "loading") {
      setErrorMsg("Loading your selected items — one moment.");
      return;
    }

    // Required fields
    if (!name.trim() || !email.trim() || !vision.trim()) {
      setErrorMsg("Please add your name, email, and a short note about your vision.");
      return;
    }

    // Rate limit
    if (typeof window !== "undefined") {
      const last = Number(window.localStorage.getItem(RATE_LIMIT_KEY) ?? 0);
      if (Date.now() - last < RATE_LIMIT_MS) {
        setErrorMsg("Just received your last inquiry — please wait a moment before sending another.");
        return;
      }
    }

    setSubmitting(true);

    const subjectParts = [scope || "Inquiry", projectDate].filter(Boolean);
    const subject = subjectParts.join(" · ");

    const selectedLines = effectiveIds.map((id) => {
      const p = piecesById.get(id);
      if (p) {
        return `• ${p.title}${p.category ? ` (${p.category})` : ""} [${p.id}]`;
      }
      return `• Item [${id}]`;
    });

    const messageLines = [
      `From: ${name} <${email}>${phone ? ` · ${phone}` : ""}`,
      "",
      "— Project details —",
      projectDate ? `Project date: ${projectDate}` : null,
      budget ? `Budget: ${budget}` : null,
      scope ? `Scope of work: ${scope}` : null,
      "",
      "— Vision / wish list —",
      vision.trim(),
      "",
      effectiveIds.length > 0 ? "— Selected from Collection —" : null,
      ...selectedLines,
    ].filter((l): l is string => l !== null);

    // Frozen-at-submit snapshot. Even if catalog rebinds an image tomorrow,
    // the admin inbox always renders what the customer actually saw.
    const itemSnapshots = effectiveIds
      .map((id) => piecesById.get(id))
      .filter((p): p is SelectedPiece => Boolean(p))
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        image_url: p.image ? withCdnWidth(p.image, 480) : null,
      }));

    const payload = {
      name: name.trim().slice(0, 200),
      email: email.trim().slice(0, 320),
      phone: phone.trim() ? phone.trim().slice(0, 50) : null,
      subject: subject.slice(0, 250) || null,
      message: messageLines.join("\n").slice(0, 5000),
      // Legacy single-item column kept for backward compat with older admin code.
      item_id: effectiveIds[0] ?? null,
      item_ids: effectiveIds,
      item_snapshots: itemSnapshots,
      metadata: {
        project_date: projectDate || null,
        budget: budget || null,
        scope: scope || null,
      },
    };

    const { error } = await supabase.from("inquiries").insert(payload);
    setSubmitting(false);

    if (error) {
      setErrorMsg(
        `We couldn't send that just now. Please email ${SUPPORT_EMAIL} and we'll respond directly.`,
      );
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
    }

    // Track conversion in GA4. Primary category = the most-frequent category
    // among selected pieces (so a 12-item inquiry that's mostly tableware
    // reads as "tableware"). Item names truncated to first 5 inside helper.
    const selectedPieces = effectiveIds
      .map((id) => piecesById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const categoryCounts = new Map<string, number>();
    for (const p of selectedPieces) {
      if (!p.category) continue;
      categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
    }
    const primaryCategory =
      [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    analytics.inquirySubmitted({
      item_count: effectiveIds.length,
      primary_category: primaryCategory,
      item_names: selectedPieces.map((p) => p.title),
      message_length: payload.message.length,
      has_phone: Boolean(payload.phone),
      has_date: Boolean(projectDate),
      has_budget: Boolean(budget),
    });

    clearInquiry();
    setPieces([]);
    setRemovedIds(new Set());
    setSubmittedCount(effectiveIds.length);
    setSuccess(true);
  }

  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{
        paddingTop: "calc(var(--nav-h) + 2rem)",
        // Contact reads narrower than home — pin canvas to 1400.
        ["--canvas-max" as string]: "1400px",
      }}
    >
      <div className="fluid-canvas">
        <div
          className="grid xl:grid-cols-12"
          style={{ gap: "clamp(2.5rem, 1rem + 3vw, 4rem)" }}
        >
          {/* LEFT — editorial intro */}
          <aside className="xl:col-span-5 xl:sticky xl:top-32 xl:self-start">
            <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/50">
              CONTACT
            </p>
            <h1 className="page-title mt-6 text-charcoal">
              LET'S COLLABORATE
            </h1>
            <p className="mt-8 max-w-md text-[12px] uppercase tracking-[0.18em] leading-[1.9] text-charcoal/65">
              We would love to hear about your project and how we can support
              your needs. Every inquiry is personally reviewed and will be
              answered within 24 hours. Thank you for reaching out to us!
            </p>
            <div className="mt-12 space-y-5">
              <p>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-charcoal/40 mb-1">
                  EMAIL
                </span>
                <a
                  className="editorial-link text-[12px] uppercase tracking-[0.18em] text-charcoal/80"
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-charcoal/40 mb-1">
                  ATELIER
                </span>
                <span className="text-[12px] uppercase tracking-[0.18em] text-charcoal/80">
                  Denver, Colorado
                </span>
              </p>
            </div>
          </aside>

          {/* RIGHT — single form */}
          <section id="inquiry" className="xl:col-span-7 scroll-mt-32">
            {success ? (
              <SuccessPanel count={submittedCount} />
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-16">
                {/* 1. YOUR INFORMATION */}
                <FormSection number="01" label="Your information">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                    <Field label="Name" required>
                      <UnderlineInput
                        value={name}
                        onChange={setName}
                        autoComplete="name"
                        required
                      />
                    </Field>
                    <Field label="Email" required>
                      <UnderlineInput
                        value={email}
                        onChange={setEmail}
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </Field>
                    <Field label="Phone">
                      <UnderlineInput
                        value={phone}
                        onChange={setPhone}
                        type="tel"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="Project date">
                      <UnderlineInput
                        value={projectDate}
                        onChange={setProjectDate}
                        placeholder="E.G. OCTOBER 2026"
                      />
                    </Field>
                  </div>

                  {/* Honeypot — hidden from users, visible to bots. */}
                  <div
                    aria-hidden
                    className="absolute opacity-0 pointer-events-none -left-[10000px] top-auto"
                  >
                    <label>
                      Company
                      <input ref={honeypotRef} type="text" tabIndex={-1} autoComplete="off" />
                    </label>
                  </div>
                </FormSection>

                {/* 2. PROJECT DETAILS */}
                <FormSection number="02" label="Project details">
                  <div className="space-y-8">
                    <Field label="Budget">
                      <PillGroup
                        options={[...BUDGET_RANGES]}
                        value={budget}
                        onChange={setBudget}
                      />
                    </Field>
                    <Field label="Scope of work">
                      <PillGroup
                        options={[...SCOPE_OPTIONS]}
                        value={scope}
                        onChange={setScope}
                      />
                    </Field>
                  </div>
                </FormSection>

                {/* 3. VISION + SELECTED PIECES */}
                <FormSection number="03" label="Vision + wish list">
                  {effectiveIds.length > 0 && (
                    <div className="mb-10">
                      <div className="flex items-baseline justify-between gap-4 mb-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45">
                          SELECTED FROM COLLECTION ({String(effectiveIds.length).padStart(2, "0")})
                        </p>
                        {selectionStatus === "loading" && (
                          <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
                            LOADING TITLES…
                          </p>
                        )}
                      </div>
                      {(selectionStatus === "error" || unresolvedIds.length > 0) && (
                        <div className="mb-4 border-l-2 border-charcoal/40 pl-4 py-2">
                          <p className="text-[11px] uppercase tracking-[0.22em] leading-[1.7] text-charcoal/75">
                            {selectionStatus === "error"
                              ? "COULDN'T LOAD YOUR SELECTION."
                              : `${unresolvedIds.length} ITEM${unresolvedIds.length === 1 ? "" : "S"} COULDN'T BE FOUND IN THE CATALOG: ${unresolvedIds.map((id) => id.slice(-6).toUpperCase()).join(" · ")}.`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <button
                              type="button"
                              onClick={retryFetch}
                              className="text-[11px] uppercase tracking-[0.22em] text-charcoal underline underline-offset-4 hover:text-charcoal/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                            >
                              RETRY
                            </button>
                            {unresolvedIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRemovedIds((prev) => {
                                    const next = new Set(prev);
                                    unresolvedIds.forEach((id) => next.add(id));
                                    return next;
                                  })
                                }
                                className="text-[11px] uppercase tracking-[0.22em] text-charcoal underline underline-offset-4 hover:text-charcoal/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                              >
                                REMOVE MISSING
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <ul
                        className="divide-y"
                        style={{ borderColor: "var(--archive-rule)" }}
                      >
                        {effectiveIds.map((id) => {
                          const p = piecesById.get(id);
                          const shortId = id.slice(-6).toUpperCase();
                          const thumb = p?.image ? withCdnWidth(p.image, 240) : null;
                          const initial =
                            p?.category?.trim().charAt(0).toUpperCase() ||
                            p?.title?.trim().charAt(0).toUpperCase() ||
                            "·";
                          const isMissing =
                            selectionStatus === "ready" && !p;
                          return (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-6 py-3 border-t first:border-t-0"
                              style={{ borderColor: "var(--archive-rule)" }}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div
                                  className="shrink-0 w-14 h-14 bg-charcoal/[0.04] overflow-hidden flex items-center justify-center"
                                  aria-hidden
                                >
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span
                                      className={`text-[11px] uppercase tracking-[0.22em] ${isMissing ? "text-charcoal/30" : "text-charcoal/45"}`}
                                    >
                                      {isMissing ? "?" : initial}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className={`text-[12px] uppercase tracking-[0.18em] truncate ${isMissing ? "text-charcoal/45 line-through" : "text-charcoal/85"}`}
                                  >
                                    {p
                                      ? p.title
                                      : selectionStatus === "loading"
                                        ? "LOADING…"
                                        : `MISSING ITEM ${shortId}`}
                                  </span>
                                  {p?.category && (
                                    <span className="mt-1 text-[11px] uppercase tracking-[0.22em] text-charcoal/40 truncate">
                                      {p.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePiece(id)}
                                className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 hover:text-charcoal focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream shrink-0"
                              >
                                REMOVE
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <Field label="Describe your vision or add a wish list" required>
                    <textarea
                      value={vision}
                      onChange={(e) => setVision(e.target.value)}
                      rows={6}
                      required
                      className="w-full bg-transparent border-0 border-b border-charcoal/30 focus:border-charcoal focus:outline-none py-3 text-[12px] uppercase tracking-[0.18em] leading-[1.9] text-charcoal placeholder:text-charcoal/35 resize-none transition-colors"
                      placeholder="COLORWAY, MATERIALS, INVENTORY REFERENCES, AND VENUE DETAILS ARE ALL GREAT PLACES TO START."
                    />
                  </Field>
                </FormSection>

                {/* Submit */}
                <div className="pt-4">
                  {errorMsg && (
                    <p className="mb-6 text-[12px] uppercase tracking-[0.18em] leading-[1.7] text-charcoal/80 border-l-2 border-charcoal/40 pl-4">
                      {errorMsg}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || selectionStatus === "loading"}
                    className="text-[12px] uppercase tracking-[0.18em] border border-charcoal px-8 py-4 hover:bg-charcoal hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    {submitting
                      ? "SENDING…"
                      : selectionStatus === "loading"
                        ? "LOADING SELECTED ITEMS…"
                        : "SEND INQUIRY"}
                  </button>
                  <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-charcoal/45">
                    OR EMAIL US DIRECTLY AT{" "}
                    <a className="editorial-link" href={`mailto:${SUPPORT_EMAIL}`}>
                      {SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* FAQ hidden for now */}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Form primitives — quiet editorial styling, underline inputs, pill choices
// ---------------------------------------------------------------------------

function FormSection({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-t pt-10 relative"
      style={{ borderColor: "var(--archive-rule)" }}
    >
      <div className="flex items-baseline gap-4 mb-10">
        <span className="text-[12px] uppercase tracking-[0.18em] text-charcoal/40 tabular-nums">
          {number}
        </span>
        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
          {label}
        </p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.22em] text-charcoal/45 mb-3">
        {label}
        {required && <span className="text-charcoal/30"> ·</span>}
      </span>
      {children}
    </label>
  );
}

function UnderlineInput({
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-charcoal/30 focus:border-charcoal focus:outline-none py-2 text-[12px] uppercase tracking-[0.18em] text-charcoal placeholder:text-charcoal/35 transition-colors"
    />
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? "" : opt)}
            aria-pressed={active}
            className={[
              "text-[12px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
              active
                ? "bg-charcoal text-cream border-charcoal"
                : "border-charcoal/25 text-charcoal/70 hover:border-charcoal/60 hover:text-charcoal",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function SuccessPanel() {
  return (
    <div
      className="border-t pt-12"
      style={{ borderColor: "var(--archive-rule)" }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/50">
        RECEIVED
      </p>
      <h2
        className="mt-6 font-display uppercase max-w-xl text-charcoal"
        style={{
          fontWeight: 400,
          fontSize: "clamp(2rem, 1rem + 2.5vw, 3rem)",
          lineHeight: 1.05,
          letterSpacing: "0.04em",
        }}
      >
        Thank you. Your inquiry is with the atelier.
      </h2>
      <p className="mt-6 max-w-lg text-[12px] uppercase tracking-[0.18em] leading-[1.9] text-charcoal/70">
        WE RESPOND WITHIN TWO BUSINESS DAYS. IF YOUR EVENT IS TIME-SENSITIVE,
        EMAIL US DIRECTLY AT{" "}
        <a className="editorial-link" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
