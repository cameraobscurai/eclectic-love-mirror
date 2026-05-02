# Eclectic Hive — Project Decisions

This document is the acceptance bar for every future production pass. Read it before starting work; verify against it before declaring "done".

---

## Brand register

Editorial fashion / art direction, not event-rental marketing.

Reference set:
- **Prada** · **Casa Carta** · **Saol Display** (editorial feel) · **Aesence** (restrained visual systems)
- *Two parts luxe, one part regal, and a dash of edge.*

Eclectic Hive is **editorial restraint with image texture, detail, and edge** — not sterile minimalism.

Use white structure. Use strong type. Use real imagery. Use sensual detail crops. Use thin dividers. Use numbered sequences. Keep content truthful.

---

## Site IA — locked

```
HOME
ATELIER by THE HIVE
HIVE SIGNATURE COLLECTION
THE GALLERY
CONTACT
```

No new top-level routes. No nav renames. No inventory categories in the global nav.

## Brand hierarchy — locked

- **Eclectic Hive** = parent umbrella
- **Atelier by The Hive** = design + fabrication
- **The Hive Signature Collection** = inventory wing
- **The Gallery** = selected project proof

---

## Page roles — locked

| Page | Role | Don't make it do |
|------|------|------------------|
| Home | Single-screen brand entry. Intrigue. | Long brand story, stacked sections, fake video |
| Atelier | Operational proof: team, scope, studio, fabrication, warehouse | Services-page voice, fake roster, full FAQ |
| Collection | Working inventory archive | Cards, prices, cart language, decorative letterform hero, overview bands, category rail, right index |
| Gallery | Selected project proof — editorial portfolio | Dark template, masonry dump, fake projects, PDF imagery without rights |
| Contact | Conversion + FAQ home | Heavy cinematic behavior |

**Final principle:** *Homepage creates intrigue. Collection proves inventory. Atelier proves capability. Gallery proves taste. Contact converts. Don't make every page do every job.*

---

## Collection rule (verbatim)

> Collection is locked at the IA/data level, not exempt from UX hardening. Any future pass must preserve the working archive but still verify scroll, sticky, loading, filter, Quick View, mobile sheet, and accessibility behavior.

**Locked:**
- Public-ready count = **876**
- Broadway 32in remains excluded
- Auction-house archive model: left rail, central pure-white object grid, one utility row, mobile bottom sheet
- Quick View, Add to Inquiry, Load More
- Sort options: By Type / A-Z only

**Permitted future fixes** (no IA, no data, no visual redesign):
scroll restoration · results-top scroll timing · sticky offsets · image skeleton timing · mobile sheet scroll lock · Quick View scroll preservation · focus restoration · reduced-motion handling · accessibility bugs.

---

## Gallery rule (verbatim)

> Gallery layout first. Real project media later. No fake bridge content. The empty-state page must still feel designed — never use developer/admin language like "No projects found" or "Add projects".

**Empty-state copy (locked):** *"Selected projects are being prepared."*

**Forbidden until owner provides real assets:**
- fake project names
- fake image URLs
- fake `/gallery/$slug` subroutes
- PDF imagery used as production assets
- stock assets
- placeholder copy in production UI

When real entries arrive, populate the typed `PROJECTS` array in `src/routes/gallery.tsx`. Same array drives both the editorial section and a future index table.

---

## Atelier rule

Tagline locked: *Imagined. Refined. Crafted.*

If `TEAM` array is empty, the Team section renders no roster — only a short team-philosophy paragraph. **Never render fake "Name · Role" rows.**

If `SPACE_IMAGES` array is empty, the Creative Space section is text-only. **No stock photography.**

No FAQ on Atelier. Compact 3–4 question teaser allowed only if it does not interrupt the page.

---

## Homepage rule

Desktop must not vertically scroll. Locked to 100dvh, footer hidden on desktop home.

Hero may use a quiet looping muted video **only when owner-approved footage exists**. Until then, current still/atmosphere stays. **Never fake video.**

Mobile may scroll if needed.

---

## Contact rule

FAQ lives here, not on Atelier or Collection. Anchor: `/contact#faq`.

Items (condensed from owner's deck FAQ A–E):
1. What we offer
2. How to begin a proposal
3. Travel
4. Minimums

---

## Route safety

Old routes (`/faq`, `/process`) redirect rather than 404 to protect cached/external links:
- `/faq` → `/contact#faq`
- `/process` → `/atelier`

Do not delete routes that have inbound links (footer, nav, sitemap, prior deployments) without first replacing them with a redirect.

---

## Design tokens

Cream `#f5f2ed`, charcoal `#1a1a1a`, sand `#d4cdc4`. Cormorant Garamond (Saol stand-in) for display, Inter for body.

Archive-specific tokens live in `src/styles.css` under `--archive-*`. Change a token there and the whole archive page follows.

---

## Production readiness

**Brand alignment is not production readiness.** Production readiness means the beautiful pages and the working archive survive real user behavior without scroll jumps, fake content, broken links, or mobile traps.

Both must hold:
- Pages look right at desktop and mobile
- Interactions don't jump, clip, or trap the user
- No fake content, no broken inbound links
- All locked invariants above remain true
