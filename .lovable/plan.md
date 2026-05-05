## Contact page — owner's annotated changes

Three notes on the screenshot. Two are already in place; one set of tweaks is new.

### 1. "Let's collaborate" intro paragraph — already matches ✓
Current copy on `/contact` (line 232–235) already reads:
> "We would love to hear about your project and how we can support your needs. Every inquiry is personally reviewed and will be answered within 24 hours. Thank you for reaching out to us!"

No change needed.

### 2. STUDIO → ATELIER + caps the values (NEW)
The label was already changed to **ATELIER**, but the owner wants the *values* themselves in caps too ("let's make these babes caps").

In `src/routes/contact.tsx` around lines 242–251:
- `info@eclectichive.com` → render with `uppercase tracking-[0.08em]` (visual caps only — the `mailto:` href stays lowercase so the email link still works)
- `Denver, Colorado` → wrap in a span with `uppercase tracking-[0.08em]`

Result:
```
EMAIL
INFO@ECLECTICHIVE.COM

ATELIER
DENVER, COLORADO
```

### 3. Vision field placeholder — already matches ✓
Line 377 placeholder already reads:
> "Colorway, materials, inventory references, and venue details are all great places to start."

No change needed.

### Also worth flagging (not in her notes, but consistent)
Line 581 success message still says "Thank you. Your inquiry is with the studio." — recommend changing to "…with the atelier." to match the STUDIO→ATELIER rename everywhere. Will include unless you say otherwise.

### Files touched
- `src/routes/contact.tsx` — uppercase email + city values; rename "studio" → "atelier" in success message
