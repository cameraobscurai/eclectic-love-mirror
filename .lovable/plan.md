# Focal control, done right

Current state (verified): `FocalEditor.tsx` exists and already has a "Reset to auto" button, but it is **not mounted anywhere** in the admin. And **0 of 894 products** currently have a focal override — the whole catalog is on automatic centering. That's the healthy state, and it's what the design should protect.

So the answer to "add a reset per product?" is: yes, but reset alone isn't the fix. The Squarespace/Wix-grade version is **auto by default, override as a visible exception, one click back to auto, and a list of every override in the catalog.**

## What to build

### 1. Mount the focal editor where covers are edited
Put `FocalEditor` inside the cover section of `ImageOrderEditor` (so it appears in the product edit drawer and in `/admin/photos`), collapsed by default behind an "Adjust framing" disclosure. Hidden until asked for — nobody touches it by accident.

### 2. State is always visible
The cover thumbnail gets a small badge:
- `AUTO` (grey) — no override, solver centering
- `MANUAL 49% · 49%` (amber) — override active

Amber means "someone made a decision here". That single cue is what would have caught the Ingram issue in seconds.

### 3. Reset to auto, always available
Move the reset button out of the collapsed panel and onto the badge itself, so clearing an override never requires opening the framing tool. Available whenever a manual value exists, disabled when already auto.

### 4. Preview before commit
The editor previews the real production tile rule, but currently commits on click. Change to: click places a candidate dot, preview updates live, then **Save framing** / **Cancel**. Nothing writes to the database until Save.

### 5. Catalog-wide override list
New panel in `/admin/photos`: "Manual framing overrides (N)". Lists every product with a focal value, showing thumbnail, title, category, who set it, when. Each row has "Reset to auto". A "Reset all" button with a typed confirmation.

Today N = 0. Keeping it near zero is the health metric.

### 6. Guardrail against the mistake that caused Ingram
If a clicked point lands within 3% of photo center, block the save with: "This is already centered — auto does this better. Reset to auto instead." Near-center overrides are the exact failure mode: they look harmless, but letterbox mapping shifts them off in frame space.

### 7. Audit trail already exists — surface it
`setCoverFocal` writes before/after to `admin_audit_log`. Show the last change ("set by adrienne@… on Aug 12") in the framing panel so history is answerable without a database query.

## Not doing
- No per-image focal points (cover only) — more control than the problem needs.
- No focal on framed/baked derivatives; Frame Studio owns that path.
- No change to the solver math. It is correct; the override was the bug.

## Technical notes
- `FocalEditor` mounts inside `ImageOrderEditor.tsx`; `photos-admin.functions.ts` already returns `cover_focal_x/y` in the snapshot, so the badge needs no new fetch.
- Override list needs one new read server fn in `photos-admin.functions.ts` (`listFocalOverrides`) selecting rows where `cover_focal_x is not null`, joined to the latest `admin_audit_log` entry with `action = 'set_cover_focal'`.
- Reset reuses the existing `setCoverFocal(null, null)` path — no migration, no schema change.
- Near-center guard is client-side in the editor; the server fn keeps accepting any valid pair so scripts aren't constrained.
