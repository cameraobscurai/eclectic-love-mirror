## Verdict
Low difficulty, high payoff. ~1 day total. Zero schema risk — `inventory_items.images text[]` already exists and is the source of truth. Position 0 already IS the cover. Admin gating, RLS, and storage buckets already exist.

## What ships

A drag-to-reorder image editor on every inventory item, opened as a dialog from `/admin/image-qa` (and any other admin surface that lists items). Squarespace-grade interaction: hover-reveal handles, optimistic autosave, ghost preview, keyboard reorder, one-click "set as cover", inline delete, drag-to-upload new images.

## UX (what to steal from the big platforms)

- **Squarespace**: hover-only drag handles, drop zones flash, autosave on drop, no Save button.
- **Notion**: position 0 == cover (no separate field); promoting = splice to front.
- **Figma**: `DragOverlay` ghost — the tile follows the cursor, the source slot dims.
- **Shopify**: shift-click range select for batch ops (v2).
- **Apple Photos**: keyboard arrows reorder focused tile (a11y win, ~10 lines with dnd-kit).
- **Notion/Linear**: toast only on failure. Success is silent.

## Architecture

### Files added
```
src/components/admin/
  ImageOrderEditor.tsx        // dialog body, owns local state + autosave debounce
  SortableThumb.tsx           // single tile: drag handle, cover star, delete, bg-toggle
  ImageDropZone.tsx           // drag-to-upload overlay (v1.5)

src/server/
  inventory-images.functions.ts  // updateItemImages, uploadItemImage, deleteItemImage
```

### Files touched
```
src/routes/admin.image-qa.tsx     // add "Edit" button per tile → opens dialog
src/components/admin/admin-shell.tsx  // (optional) link from other admin pages
package.json                       // + @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Server functions (all gated by `requireAdmin`)

```ts
// src/server/inventory-images.functions.ts
updateItemImages({ id, images })       // UPDATE inventory_items SET images=$1 WHERE id=$2
                                       // Validates: array, max 50, every entry is https URL
setCardBackground({ id, url | null })  // UPDATE card_background_url
uploadItemImage({ id, rmsId, file })   // Storage upload → squarespace-mirror/inventory/<rmsId>/<uuid>.<ext>
                                       // returns public URL; client appends to images[] then saves
deleteItemImage({ id, url })           // Splice from images[]; optionally storage.remove() if hosted by us
```

Validation with zod. Use `supabaseAdmin` inside handler since `requireAdmin` already verified the caller. Single UPDATE per save — no row-shape change.

### Component shape

```tsx
<ImageOrderEditor item={it} onClose={...}>
  <DndContext sensors=[Pointer, Keyboard] onDragEnd={handleReorder}>
    <SortableContext items={urls} strategy={rectSortingStrategy}>
      <grid>
        {urls.map((url, i) => (
          <SortableThumb
            key={url}
            url={url}
            index={i}
            isCover={i === 0}
            onPromote={() => moveToFront(url)}
            onDelete={() => remove(url)}
            onSetBackground={() => setBg(url)}
          />
        ))}
      </grid>
      <DragOverlay>{activeUrl && <ThumbGhost url={activeUrl} />}</DragOverlay>
    </SortableContext>
  </DndContext>
  <ImageDropZone onUpload={appendImage} />  {/* v1.5 */}
</ImageOrderEditor>
```

### Save strategy
- Local state is the visual source of truth during the session.
- On every mutation: optimistic update → 400ms debounce → `updateItemImages`.
- On error: toast "Couldn't save image order — reverted", roll back to the last server-confirmed array. Hold previous snapshot in a ref.
- Reads on open: trust the row already loaded by `/admin/image-qa` (don't refetch).
- Concurrency: pass `expectedLength` (or last-known array hash) to detect race with another admin editing the same item. Refuse + toast on mismatch.

### Storage
- Uploads land in `squarespace-mirror/inventory/<rms_id>/<uuid>.<ext>` (already public, already admin-write).
- Use `supabase.storage.from('squarespace-mirror').upload(...)` from the **server** (admin client) after the file is forwarded via FormData. Keep upload server-side so we never expose service role and can reject by mime/size.
- Limits: 10MB per file, jpeg/png/webp/avif only.
- Deletion: only `storage.remove()` if the URL points to our `squarespace-mirror` bucket. External CDN URLs (legacy Squarespace) get unlinked from the array only.

## Scope ladder

- **v1 (4h)** — Dialog, drag-reorder, click-to-promote cover, delete, optimistic autosave, error revert.
- **v1.5 (+2h)** — Drag-to-upload, "set as card background" toggle.
- **v2 (+2h)** — Keyboard arrows reorder, multi-select + bulk delete, undo toast.
- **v3 (later)** — Cross-item drag (move image from item A to item B). Not needed now.

## Risks & decisions to confirm

1. **`card_background_url`** lives in its own column per the existing memory rule ("never put backdrops in `images[]`"). The bg toggle writes there, not to the array. Good as-is.
2. **`images_meta` jsonb** exists but is unused for ordering. Skip it. Order = array index. Don't introduce a second source of truth.
3. **`images_archive` jsonb** exists. On every save, append the previous array snapshot here with timestamp + admin uid — gives one-click undo across sessions and a real audit log. ~5 extra lines, big safety net.
4. **No new RLS, no migration, no new bucket.** All four storage/auth primitives already in place.

## Effort breakdown
- v1: 4h (deps + 1 server fn + 2 components + wire into image-qa)
- v1.5: 2h (upload server fn + drop zone + bg toggle)
- QA on a few items across categories: 1h
- Total to ship v1.5: ~7h
