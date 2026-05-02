# Brand Alignment + Collection Interaction QA (final)

Two passes ship together. Both required for production-ready sign-off.

**Pass A — Brand Alignment:** DECISIONS doc, Gallery, Atelier, Contact FAQ, safe route redirects.
**Pass B — Collection Interaction QA:** No IA/data/visual changes. Only scroll, sticky, loading, focus, touch.

Critical rule for this pass: **Gallery layout first. Real project media later. No fake bridge content.**

---

## Governance — `docs/DECISIONS.md` (new)

- Brand register: Prada · Casa Carta · Saol Display · Aesence (editorial restraint with image texture, detail, and edge — not sterile minimalism)
- Site IA + brand hierarchy locked
- Page roles: Home=intrigue, Collection=archive, Atelier=capability, Gallery=taste, Contact=convert+FAQ
- **Collection rule (verbatim):** *Collection is locked at the IA/data level, not exempt from UX hardening. Any future pass must preserve the working archive but still verify scroll, sticky, loading, filter, Quick View, mobile sheet, and accessibility behavior.*
- **Gallery rule (verbatim):** *Gallery layout first. Real project media later. No fake bridge content. The empty-state page must still feel designed — never use developer/admin language like "No projects found" or "Add projects".*
- Final principle: *Homepage creates intrigue. Collection proves inventory. Atelier proves capability. Gallery proves taste. Contact converts. Don't make every page do every job.*

---

## Pass A — Brand Alignment

### A1. Gallery (`src/routes/gallery.tsx` — rewrite, ships empty)

Truthful production-ready shell. No fake project entries. No PDF imagery. No `/gallery/$slug` subroutes.

**Structure:**
- Hero: eyebrow `THE GALLERY` · display `Selected Projects` · short factual intro
- Selected Projects area: when `PROJECTS.length === 0`, renders a single quiet editorial line — *"Selected projects are being prepared."*
- CTA: "Start a conversation" → `/contact`

**No index table renders when PROJECTS is empty.** No giant placeholder cards, no broken image frames, no "Coming soon" balloon, no app-style "No projects found" messaging.

**Typed contract at top of file:**

```ts
type GalleryProject = {
  number: string;          // "01"
  name: string;
  location: string;
  year: string;
  category: "Luxury Weddings" | "Meetings + Incentive Travel" | "Social + Non-Profit";
  heroImage: { src: string; alt: string };
  detailImages: { src: string; alt: string }[];
  href?: string;           // only set when a real subroute exists
};

const PROJECTS: GalleryProject[] = [];
```

When real entries arrive later, the same array drives the editorial section and a future index table. Detail-route wiring happens in a later pass — not this one.

**Visual:** cream background, charcoal type, no dark template, no fake media.

### A2. Atelier (`src/routes/atelier.tsx` — rewrite)

Six sections: Hero (locked tagline *Imagined. Refined. Crafted.*) → The Team → The Creative Space → Scope + Fabrication → Atelier Approach triptych → CTA.

Truth rules:
- `TEAM` array empty by default. **If empty, the Team section renders no roster** — only a short team-philosophy paragraph. **No fake "Name · Role" rows.**
- `SPACE_IMAGES` array empty by default. If empty, that section is text-only.
- Capability list is real (sourced from owner's first deck FAQ A: lounge furniture, bars, lighting, tableware, dining, custom design + fabrication, stage, drape, accents, production management).
- No FAQ on this page.

### A3. Contact (`src/routes/contact.tsx` — append)

Add compact 4-item FAQ accordion at the bottom using native `<details>` inside `<section id="faq">` so `/contact#faq` deep-links work.

Items: What we offer · How to begin a proposal · Travel · Minimums.

### A4. Route cleanup — redirects, not deletes

`/faq` and `/process` ARE referenced in `src/components/footer.tsx`. Convert to redirects so cached/external links resolve:

- `src/routes/faq.tsx` → redirects to `/contact#faq`
- `src/routes/process.tsx` → redirects to `/atelier`
- `src/components/footer.tsx` → drop the Process row, repoint FAQ link to `/contact#faq`

### A5. Memory

Append two Core lines to `mem://index.md`:
- Brand register: Prada · Casa Carta · Saol Display · Aesence. Editorial restraint with image texture, detail, and edge — not sterile minimalism.
- Page roles locked: Home=intrigue, Collection=archive, Atelier=capability, Gallery=taste (layout first, media later, no fake bridge content), Contact=convert+FAQ. Collection IA/data locked but UX still subject to hardening.

---

## Pass B — Collection Interaction QA Gate

**No IA changes. No data changes. No visual redesign. No new routes.**

### Allowed fixes only

Scroll restoration · results-top scroll timing · sticky utility row offset · sticky rail offset · image skeleton timing · mobile sheet scroll lock · Quick View scroll preservation · focus restoration · reduced-motion handling · accessibility bugs.

### Required checks

| # | Behavior | Acceptance |
|---|----------|------------|
| A | Initial load | `/collection` loads at top unless URL state targets a filter/product. No mount auto-scroll. No late layout shift moves viewport. |
| B | Filter click | State + count + grid update. Scrolls to results-top only when results aren't visible. Target accounts for sticky nav + utility row. No double jump. No delayed second jump from late images. |
| C | Search | No keystroke scroll. Only debounced commit may scroll. Clearing doesn't jump. Rail order stable while typing. Zero-count rows mute, don't reorder. |
| D | Sort | Single scroll on commit. Options remain By Type / A-Z only. |
| E | Load More | Appends without scrolling user. Reserves space for pending images. |
| F | Quick View | Open: body locks, grid stays. Close: scroll restored. Browser back closes modal without jumping. Focus returns to opened tile. |
| G | Mobile sheet | Open: scroll locks, no shift. Close: scroll restored. Apply/Clear update predictably. 44px touch targets. Escape closes. Focus trap. |
| H | Sticky | Utility row constant height. Rail sticks below it. No nav overlap, no bottom clip, no jump on activation. Token math (no magic `top-24`). |
| I | Image loading | First viewport crisp fast. First 6 priority tiles skip skeleton/blur. Below-fold lazy. Wrappers prevent CLS. Skeleton fade doesn't flicker. Failed-image hiding still works. |
| J | Reduced motion | Scroll animations minimized when `prefers-reduced-motion: reduce`. No forced smooth scroll. |

### Invariants (must remain true)

- public-ready count = **876**
- Broadway 32in remains excluded
- left rail / pure-white grid / one utility row / mobile bottom sheet / Quick View / Add to Inquiry / Load More / By Type-A-Z all unchanged
- no overview bands, no category rail, no right index, no letterform hero, no cards, no plates, no prices, no cart language

### QA method

For each check: code review of the relevant component (CollectionFilterRail, ProductTile, QuickViewModal, InquiryTray, collection.tsx) against acceptance criteria, then live verification at desktop (1440 + 1024) and mobile (390) via the browser tool. Each failed check gets a minimum-surface fix from the allowed-fixes list.

---

## Files touched

**Pass A:**
- new: `docs/DECISIONS.md`
- rewrite: `src/routes/gallery.tsx` (ships with `PROJECTS = []`), `src/routes/atelier.tsx`
- edit: `src/routes/contact.tsx` (FAQ accordion + `#faq` anchor)
- convert to redirect: `src/routes/faq.tsx`, `src/routes/process.tsx`
- edit: `src/components/footer.tsx` (drop Process, repoint FAQ → `/contact#faq`)
- edit: `mem://index.md` (two Core lines)

**Pass B (as needed, scroll/sticky/loading only):**
- `src/routes/collection.tsx`, `src/components/collection/CollectionFilterRail.tsx`, `src/components/collection/ProductTile.tsx`, `src/components/collection/QuickViewModal.tsx`, `src/components/collection/InquiryTray.tsx`, `src/styles.css` (token tweaks only)

---

## Final acceptance (both must be yes)

- **Pass A:** DECISIONS exists; Gallery ships with truthful empty state and no fake projects/media/links/subroutes; Atelier rebuilt with no fake roster; Contact has FAQ accordion at `#faq`; `/faq` + `/process` redirect cleanly; footer points to `/contact#faq`; no broken inbound links; no fake content anywhere.
- **Pass B:** All 10 Collection interaction checks (A–J) pass at desktop + mobile; all invariants preserved; 876 count and Broadway exclusion verified.

Brand alignment is not production readiness. Both passes ship together.
