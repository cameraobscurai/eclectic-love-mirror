# Top 5% Surgical Polish — Eclectic Hive

Five moves. Each one is invisible until you feel it, brand-safe, and high-leverage for Awwwards eyes. Nothing redesigned, nothing added.

---

## 1. Gallery lightbox — image-inside-frame parallax

**Where:** `GalleryLightbox` hero plate only (Amangiri and the other landscape projects benefit most).

**What:** The frame stays fixed. The image inside drifts ±10px on pointer movement (desktop) or briefly on swipe (mobile), with a slow settle. No rotation, no zoom, no scrim change.

**Why it pays:** Turns six already-strong landscape projects into a tactile experience. This is the single moment a juror will screenshot. Costs ~30 lines, zero layout change.

**Guardrails:** `prefers-reduced-motion` → static. GPU transform only. Disabled while plate is changing.

---

## 2. Gallery card → lightbox: shared-element transition

**Where:** Click on a project card → `GalleryLightbox` opens.

**What:** View Transitions API. Clicked thumbnail morphs into the lightbox hero plate instead of cross-fading the overlay in.

**Why it pays:** This is the difference between “a portfolio site” and “a designed portfolio site.” Chromium picks it up; Safari/Firefox fall back to today’s instant open — no regression.

**Guardrails:** Feature-detect. Single `view-transition-name` per card/plate pairing. No new components.

---

## 3. Home: poster-first, video-after-idle

**Where:** Desktop `HeroFilmstrip` (5 seasonal videos) and mobile `SequentialHeroVideo`.

**What:** Show posters as the LCP. Defer the actual video network requests until **first idle frame after posters paint** OR **plate is in viewport**, whichever comes first. Posters become the brand impression; video becomes the reward.

**Why it pays:** Today the homepage waits on five concurrent Supabase video downloads (~20s each in the profile). Fixing this drops perceived load from “loading” to “arrived,” without changing a pixel of the design.

**Guardrails:** Autoplay still works once loaded. Mobile keeps its sequential reel. No layout shift — posters and videos share intrinsic ratio.

---

## 4. Press logos: kill the 1MB PNG

**Where:** Gallery `As Featured In` block.

**What:** Replace the 1054KB transparent PNG with a responsive AVIF/WebP at the actual rendered width, plus `loading="lazy"` (already present) and proper `width`/`height` attrs. Same visual, ~95% smaller.

**Why it pays:** The single largest asset on the Gallery page is decorative footer chrome. Lighthouse will reward this immediately, and so will every cellular juror.

**Guardrails:** Identical output. Owner-approved logos untouched.

---

## 5. Per-route share metadata + JSON-LD

**Where:** Home, Atelier, Collection, Gallery, Contact `head()`.

**What:**
- Each leaf route ships a unique `og:image` pulled from its real hero (Gallery → Amangiri canyon plate, Atelier → its hero, Collection → Hive H, etc.).
- Add `Organization` + `LocalBusiness` (Denver) JSON-LD at root, `BreadcrumbList` per leaf.
- Lock canonical URLs.

**Why it pays:** Awwwards’ “Modern Web Standards” score is partly silent SEO/share quality. A pasted Gallery link should preview the canyon, not a generic site card. Zero visible UI change.

**Guardrails:** Reuse existing approved imagery. No new copy.

---

## What I cut from the prior draft

Removed because they were polish theater, not surgical payoff:
- Crossfade timing tweaks
- Thumbnail rail edge masks
- Lightbox metadata expansion
- Mobile video micro-drift
- Site-wide focus/hover normalization sweep
- Collection `content-visibility` pass

These are real but low-leverage. They don’t move the Awwwards needle the way the five above do. They can be a follow-up dust-off after the five ship.

---

## Order

1 → 3 → 4 → 2 → 5.

(1 and 3 are the felt wins. 4 is free. 2 is the screenshot moment. 5 is silent quality.)

Greenlight and I start with #1.
