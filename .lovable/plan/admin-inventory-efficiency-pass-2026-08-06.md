# Admin inventory — efficiency pass

## The one real bug

`/admin/new-product`'s button says **"Publish to live catalog"** but only flips a database flag. The public site reads a baked snapshot that is only rebuilt by a _different_ button on `/admin/photos`. Adrienne publishes, sees nothing on the live site, concludes it's broken.

Same trap after every photo fix in the edit drawer.

## Plan

### Pass 1 — Publish, one button, everywhere (ship first)

- Move publish into the admin header (`admin-shell.tsx`), visible on every admin page. Reuses the existing, working `publishCatalogOverlay` — no new backend logic.
- Header shows state: `Live` / `N unpublished changes` → one click to push.
- Rename the New Product button to **Save** and let the header own publishing. Copy-only change.
- Result: no hidden second step, no page to remember.

### Pass 2 — Fewer places to lose work

- Upload/save errors move from small red text at the bottom of the page to toasts (`new-product.tsx`).
- After save, land on the new item with its drawer open and highlighted (the redirect already carries the id — just make it visibly open).
- Drop the duplicate "Site" nav group; header already has Exit/Live.

### Pass 3 — Retire hand-rolled logic (libraries, no new deps beyond one)

Only where it clicks in cleanly:

| Today                                                                                  | Replace with                            | Why                                                                                               |
| -------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Hand-rolled offset paging + `<table>` markup in `admin.products.tsx`                   | **TanStack Table** (`manualPagination`) | Column sorting for free, keeps server paging and the existing Query fetch untouched               |
| `useDraft()` — a 60-line hand-built form engine in `ProductEditDrawer.tsx`             | **TanStack Form**                       | Already labelled "RHF stand-in — swappable"; dirty/validation/patch-building all become built-ins |
| `useState`/`useEffect` promise chains inside the drawer (row, audit, categories, role) | **TanStack Query** (already installed)  | Removes swallowed `.catch(() => {})` blocks that silently stale the UI                            |

One bespoke behavior must survive the Form swap: the drawer advances its baseline only for _untouched_ fields, so a mid-edit refetch can't stomp what she's typing. That gets ported explicitly, not assumed.

### Pass 4 — Stale-UI cleanup

- Empty `.catch(() => {})` on audit/category refresh → surfaced errors.
- Distinguish "stale" from "fresh" while the list refetches.

## Sequencing

Pass 1 today. Passes 2–4 after the meeting — they touch the drawer and list internals and are not worth any risk while you're demoing.

## Guardrails

- Nothing in Passes 1–2 touches public routes, the catalog bake, or the database schema.
- Pass 3 is admin-only and lands one table at a time, typechecked and clicked through before the next.
