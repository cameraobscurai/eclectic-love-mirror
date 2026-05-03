import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInquiry } from "@/hooks/use-inquiry";

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

const FAQ_ITEMS = [
  {
    q: "What we offer",
    a: "Full-service design, fabrication, and production — or rental-only access to the Hive Signature Collection. Engagements include space planning + CAD, 3-D modeling, vendor management, on-site logistics, and run of show.",
  },
  {
    q: "How to begin a proposal",
    a: "After a consultation call we'll prepare a one to two-page Style Guide that visually summarizes the design direction. A non-refundable Creative Services Fee and signed contract secures the date and unlocks the full proposal and detailed estimate.",
  },
  {
    q: "Travel",
    a: "Eclectic Hive is a destination design house. Projects take us domestic and international — desert, mountains, and the Caribbean. Travel fees include accommodations, per diems, and mileage.",
  },
  {
    q: "Minimums",
    a: "We don't set fixed minimums. Availability shifts with the team's existing committed work and the seasonality of inquiries. Each opportunity is reviewed together to make sure we can deliver the requested scope.",
  },
];

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

const SUPPORT_EMAIL = "hello@eclectichive.com";
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
  useEffect(() => {
    let cancelled = false;
    if (initialIds.length === 0) {
      setPieces([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id,title,category")
        .in("id", initialIds);
      if (cancelled || error || !data) return;
      // Preserve initialIds ordering
      const byId = new Map(data.map((d) => [d.id, d as SelectedPiece]));
      setPieces(
        initialIds
          .map((id) => byId.get(id))
          .filter((x): x is SelectedPiece => Boolean(x)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [initialIds]);

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function removePiece(id: string) {
    setPieces((prev) => prev.filter((p) => p.id !== id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Honeypot
    if (honeypotRef.current && honeypotRef.current.value.trim() !== "") {
      setSuccess(true); // silent accept
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
      pieces.length > 0 ? "— Selected from Collection —" : null,
      ...pieces.map((p) => `• ${p.title}${p.category ? ` (${p.category})` : ""} [${p.id}]`),
    ].filter((l): l is string => l !== null);

    const payload = {
      name: name.trim().slice(0, 200),
      email: email.trim().slice(0, 320),
      phone: phone.trim() ? phone.trim().slice(0, 50) : null,
      subject: subject.slice(0, 250) || null,
      message: messageLines.join("\n").slice(0, 5000),
      item_id: pieces[0]?.id ?? null,
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
    clearInquiry();
    setPieces([]);
    setSuccess(true);
  }

  return (
    <main
      className="min-h-screen bg-cream text-charcoal pt-32 pb-32"
      style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* LEFT — editorial intro */}
          <aside className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              CONTACT
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] tracking-tight">
              Let's collaborate.
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-charcoal/70">
              Tell us about your project in one place. We respond within two
              business days with next steps and a consultation call.
            </p>
            <div className="mt-12 space-y-5 text-[14px] text-charcoal/80">
              <p>
                <span className="block text-[10px] uppercase tracking-[0.22em] text-charcoal/40 mb-1">
                  EMAIL
                </span>
                <a className="editorial-link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                <span className="block text-[10px] uppercase tracking-[0.22em] text-charcoal/40 mb-1">
                  STUDIO
                </span>
                Denver, Colorado
              </p>
            </div>
          </aside>

          {/* RIGHT — single form */}
          <section id="inquiry" className="lg:col-span-7 scroll-mt-32">
            {success ? (
              <SuccessPanel />
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
                        placeholder="e.g. October 2026"
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
                <FormSection number="03" label="Vision + selected pieces">
                  {pieces.length > 0 && (
                    <div className="mb-10">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 mb-4">
                        SELECTED FROM COLLECTION ({String(pieces.length).padStart(2, "0")})
                      </p>
                      <ul
                        className="divide-y"
                        style={{ borderColor: "var(--archive-rule)" }}
                      >
                        {pieces.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-baseline justify-between gap-6 py-3 border-t first:border-t-0"
                            style={{ borderColor: "var(--archive-rule)" }}
                          >
                            <div className="flex items-baseline gap-4 min-w-0">
                              <span className="text-[13px] tracking-[0.05em] text-charcoal/85 truncate">
                                {p.title}
                              </span>
                              {p.category && (
                                <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 shrink-0">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removePiece(p.id)}
                              className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 hover:text-charcoal focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                            >
                              REMOVE
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Field label="Tell us about your vision" required>
                    <textarea
                      value={vision}
                      onChange={(e) => setVision(e.target.value)}
                      rows={6}
                      required
                      className="w-full bg-transparent border-0 border-b border-charcoal/30 focus:border-charcoal focus:outline-none py-3 text-[15px] leading-relaxed text-charcoal placeholder:text-charcoal/35 resize-none transition-colors"
                      placeholder="Story, mood, references, venue, anything that helps us begin."
                    />
                  </Field>
                </FormSection>

                {/* Submit */}
                <div className="pt-4">
                  {errorMsg && (
                    <p className="mb-6 text-[13px] text-charcoal/80 border-l-2 border-charcoal/40 pl-4">
                      {errorMsg}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="text-xs uppercase tracking-[0.22em] border border-charcoal px-8 py-4 hover:bg-charcoal hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    {submitting ? "SENDING…" : "SEND INQUIRY"}
                  </button>
                  <p className="mt-6 text-[11px] text-charcoal/45">
                    Or email us directly at{" "}
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

        {/* FAQ — anchor target for /contact#faq */}
        <section id="faq" className="mt-32 scroll-mt-32">
          <div
            className="border-t pt-10"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              FREQUENTLY ASKED
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight">
              Working with the studio.
            </h2>

            <ul
              className="mt-10 divide-y max-w-3xl"
              style={{ borderColor: "var(--archive-rule)" }}
            >
              {FAQ_ITEMS.map((item) => (
                <li
                  key={item.q}
                  className="border-t first:border-t-0"
                  style={{ borderColor: "var(--archive-rule)" }}
                >
                  <details className="group">
                    <summary className="flex items-baseline justify-between gap-4 py-5 cursor-pointer list-none focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream">
                      <span className="font-display text-xl tracking-tight">
                        {item.q}
                      </span>
                      <span
                        aria-hidden
                        className="text-charcoal/45 text-lg transition-transform group-open:rotate-45 select-none"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-6 max-w-2xl text-[15px] leading-relaxed text-charcoal/75">
                      {item.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
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
        <span className="font-display text-base text-charcoal/40 tabular-nums">
          {number}
        </span>
        <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/55">
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
      <span className="block text-[10px] uppercase tracking-[0.22em] text-charcoal/45 mb-3">
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
      className="w-full bg-transparent border-0 border-b border-charcoal/30 focus:border-charcoal focus:outline-none py-2 text-[15px] text-charcoal placeholder:text-charcoal/35 transition-colors"
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
              "text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
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
      <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
        RECEIVED
      </p>
      <h2 className="mt-6 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-tight max-w-xl">
        Thank you. Your inquiry is with the studio.
      </h2>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-charcoal/70">
        We respond within two business days. If your event is time-sensitive,
        email us directly at{" "}
        <a className="editorial-link" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
