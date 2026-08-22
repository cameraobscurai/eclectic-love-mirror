# Merged audit — verdict and execution order

Claude's triage is right. GPT audited security hygiene, Claude audited what a browser downloads. Only the merged list matters. Everything below was re-verified against current code before writing this.

Verified true: GA sends `page_location` on every route change with no `/stylebrief/$token` exclusion; `src/start.ts` has `functionMiddleware` only, no CSRF, no request middleware; `_headers` cannot cover Worker-rendered HTML; `updateItemImages` reads then updates with `.eq("id")` only; CI has no typecheck, no lint, no build; `public/receipts` is 1.2MB; `public/studio/models` is 7.3MB.

One disagreement: "delete the void audit() calls" assumes the DB trigger covers the same rows and payloads. Verify that first; if it doesn't, keep the calls and make them awaited.

## Order

### 1. Token leak (today)

- GA effect skips analytics entirely on `/stylebrief/*`; strip `page_location` sitewide and send a sanitized path.
- `studio.functions.ts`: stop selecting and writing raw `share_token`; hash-only. Token returned once at creation for the copy-link action.

### 2. One global request middleware

Add `requestMiddleware` in `src/start.ts`:

- CSRF origin check on non-GET.
- Security headers on SSR HTML (the job `_headers` can't do).
- `no-store` + `noindex` for `/admin/*` and `/stylebrief/*`.

### 3. Loader payload diet (the megabyte)

- PDP loader returns `product` only, from the baked catalog — no overlay await, no `allProducts`. Related rail and prev/next derive client-side.
- `/compose` loader returns nothing; catalog loads post-mount.
- `/collection` loader returns a tile projection (~400KB → shrinks further after image/variant fields drop) instead of the full 1.1MB catalog; full catalog still merges post-mount as it does today.
- `ShopTheLookRail` drops its static `current_catalog.json` import.

### 4. Write integrity

- Add `.eq("updated_at", expectedUpdatedAt)` to the image update and fail when zero rows match.
- Decide the audit question after checking the trigger.

### 5. CI that would have caught the build failure

Add `tsgo --noEmit`, lint, and a production `vite build` with pinned Bun and an explicit heap size.

### 6. Then

Skip-link `id="main-content"` on every route; move `public/receipts` out of the deploy; GLB draco/meshopt pass; fold live gallery orders into the bake.

Backlog: SW signed-cache scope, Turnstile on public inquiry (check Cloudflare WAF first), GET-with-mutation on `getStyleBoardByToken`, self-hosted Cormorant/Inter, the ~35 redirect route files, hero video `preload` tiering, PNG→JPG on `src/assets/atelier/`, adding `three` explicitly.

## Notes

Steps 1–2 are contained. Step 3 touches three route loaders and is the only item that changes page weight by a megabyte; it ships behind a check that SSR HTML for `/collection` still contains tiles and PDP head metadata is unchanged.
