/**
 * /admin/guide — in-app inventory tutorial for staff.
 * Mirrors the printed PDF deck (linked at the top) step for step.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import guidePdf from "@/assets/inventory-guide.pdf.asset.json";

export const Route = createFileRoute("/admin/guide")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inventory guide · Admin · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GuidePage,
});

type Step = {
  n: string;
  title: string;
  intro: string;
  items: { label: string; body: string }[];
  note?: string;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Access",
    intro:
      "Log in at eclectichive.com/login with your work email. Your account is staff-level: you can edit inventory, not site structure.",
    items: [
      {
        label: "Go to eclectichive.com/login",
        body: "If the password fails, use Forgot password — the reset email arrives in under a minute.",
      },
      {
        label: "Land on the admin home",
        body: "You'll see tiles: Inventory, Photos, Inquiries, Gallery.",
      },
      {
        label: "Bookmark two pages",
        body: "/admin/products (edit) and /admin/photos (images + Publish).",
      },
    ],
    note: "If a page says Unauthorized, you're signed out. Reload and log in again — nothing is lost.",
  },
  {
    n: "02",
    title: "Add a product",
    intro: "One product at a time. Title and category are the only required fields.",
    items: [
      {
        label: "Open /admin/products, click + New product",
        body: "Or go to /admin/new-product directly.",
      },
      {
        label: "Title",
        body: "Exactly how it should read on the site. Example: Travertine Side Table.",
      },
      {
        label: "Category",
        body: "Pick from the 14 live categories: Seating, Tables, Cocktail & Bar, Tableware, Serveware, Pillows & Throws, Rugs, Lighting, Candlelight, Chandeliers, Large Decor, Styling, Storage, Furs & Pelts.",
      },
      {
        label: "Quantity and dimensions",
        body: 'Optional but do it. Format: 24"W x 18"D x 22"H. The site uses these to size the product tile correctly.',
      },
      {
        label: "Save",
        body: "The product is created hidden. It will not appear on the site until it has a photo and you publish.",
      },
    ],
  },
  {
    n: "03",
    title: "Photos",
    intro: "A product with no photo stays hidden. Photos are the gate.",
    items: [
      {
        label: "Open the product and find the Images panel",
        body: "Drag files straight in, or click to browse.",
      },
      {
        label: "Shoot / crop on white",
        body: "Plain white background, product centered, no props. The site trims and re-centers automatically — it can't fix a busy background.",
      },
      {
        label: "Drag to reorder",
        body: "The first image is the cover. That's the one on the collection grid and in search.",
      },
      {
        label: "Set the focal point if needed",
        body: "Click the cover thumb and drag the crosshair to the part of the item that should stay centered.",
      },
      {
        label: "Delete bad shots",
        body: "Remove, don't hide. Leftover images slow the page and confuse the cover logic.",
      },
    ],
    note: "One clean cover on white, then up to five detail shots. More than six per product is noise.",
  },
  {
    n: "04",
    title: "Edit",
    intro: "Everything is editable after the fact except the RMS id.",
    items: [
      {
        label: "You can edit",
        body: "Title and description · Category · Quantity / stock label · Dimensions · Photos and their order · Visible / hidden · Position in the grid.",
      },
      {
        label: "Only admin can edit",
        body: "URL slug · SEO title & description · Social share image.",
      },
      {
        label: "Never touch",
        body: "RMS ids — they link the site to the rental system. And anything under Gallery or Studio unless asked.",
      },
    ],
  },
  {
    n: "05",
    title: "Publish",
    intro: "Edits are saved instantly, but the public site reads a published snapshot.",
    items: [
      { label: "Finish your batch of edits", body: "Save each product as you go. Nothing is lost between sessions." },
      { label: "Go to /admin/photos", body: "Top right: Publish to live site." },
      {
        label: "Click Publish and wait for confirmation",
        body: "Takes a few seconds. It rebuilds the catalog the public site reads.",
      },
      {
        label: "Check the result",
        body: "Open eclectichive.com/collection in a new tab and confirm your items appear.",
      },
    ],
    note: "If you skip Publish, your edits are saved but invisible to clients. Publish once at the end of each session.",
  },
  {
    n: "06",
    title: "Daily flow",
    intro: "The whole loop, in order.",
    items: [
      {
        label: "Batch by category",
        body: "Do all the Seating, then all the Tables. Faster, and the grid stays consistent.",
      },
      {
        label: "Add → photo → check → next",
        body: "Don't leave products without photos; they sit hidden and get forgotten.",
      },
      {
        label: "Use search and filters",
        body: "Search covers the entire collection, not just the category you're in. Filter by Hidden to find unfinished items.",
      },
      { label: "Publish at the end", body: "One publish per session is enough." },
    ],
  },
];

const REFERENCE: { heading: string; lines: string[] }[] = [
  {
    heading: "Pages",
    lines: [
      "/login — sign in",
      "/admin/products — search & edit",
      "/admin/new-product — add",
      "/admin/photos — images + Publish",
      "/admin/insights — client inquiries",
    ],
  },
  {
    heading: "Photo standard",
    lines: [
      "White background",
      "Product centered, full item in frame",
      "No props, no people",
      "First image = cover",
      "Max ~6 per product",
    ],
  },
  {
    heading: "If something breaks",
    lines: [
      "Reload the page first",
      "Unauthorized = log back in",
      "Item missing on site = no photo, or not published",
      "Anything else: text Cat",
    ],
  },
];

const QUICK_LINKS = [
  { to: "/admin/new-product", label: "Add a product" },
  { to: "/admin/products", label: "Search & edit" },
  { to: "/admin/photos", label: "Photos + Publish" },
];

function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="border-b border-charcoal/10 pb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">
          Eclectic Hive · Internal
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.04em]">
          Inventory Backend — Step by Step
        </h1>
        <p className="mt-2 max-w-xl text-[12px] uppercase tracking-[0.12em] text-charcoal/60">
          Six steps: access, add, photos, edit, publish, daily flow.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href={guidePdf.url}
            download
            className="inline-flex items-center gap-2 border border-charcoal/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-charcoal/80 hover:bg-charcoal/5"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download PDF
          </a>
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex items-center border border-charcoal/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="mt-10 space-y-12">
        {STEPS.map((s) => (
          <section key={s.n} className="grid gap-5 md:grid-cols-[auto_1fr]">
            <div className="md:w-24">
              <span className="font-display text-4xl leading-none text-charcoal/20 tabular-nums">
                {s.n}
              </span>
            </div>
            <div>
              <h2 className="font-display text-xl uppercase tracking-[0.06em]">{s.title}</h2>
              <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-charcoal/60">
                {s.intro}
              </p>
              <ol className="mt-5 space-y-4">
                {s.items.map((it, i) => (
                  <li key={it.label} className="border-t border-charcoal/10 pt-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/40 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-[13px] uppercase tracking-[0.08em] text-charcoal">
                      {it.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-charcoal/65">{it.body}</p>
                  </li>
                ))}
              </ol>
              {s.note && (
                <p className="mt-5 border-l-2 border-charcoal/25 bg-charcoal/[0.03] px-4 py-3 text-[12px] leading-relaxed text-charcoal/70">
                  {s.note}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14 border-t border-charcoal/10 pt-8">
        <h2 className="font-display text-xl uppercase tracking-[0.06em]">Quick reference</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {REFERENCE.map((col) => (
            <div key={col.heading}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/45">
                {col.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {col.lines.map((l) => (
                  <li key={l} className="text-[12px] leading-relaxed text-charcoal/70">
                    · {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-14 border-t border-charcoal/10 pt-6 font-display text-lg uppercase tracking-[0.06em] text-charcoal/70">
        Add. Photograph. Publish.
      </p>
    </div>
  );
}
