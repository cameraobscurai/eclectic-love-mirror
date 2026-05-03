# DevEditOverlay → Design-Tool Fluidity Pass

One cohesive upgrade to `src/components/DevEditOverlay.tsx` plus a one-line wrapper in `src/routes/__root.tsx`. No new dependencies. Everything that exists today (drag, snap, alignment, z-order, glass presets, Done CSS export, localStorage persistence) keeps working — it just operates on a *selection set* and a *transformable canvas* instead of a single id at 100% zoom.

Corrections from review folded in: `willChange` only while active, primary-selection banner, snap radius in canvas space, `` ` `` (backtick) for zoom reset, min-size guard, and lock modes.

---

## 1. Multi-select + group transform

**Selection model**
- Replace `selectedId: string | null` with `selectedIds: Set<string>`. Derive `primarySelectedId = first inserted id` for the Style panel.
- Click outline → selects only that id. Shift/Cmd-click → toggle id in the set. Click empty space → clear.
- **Marquee select**: pointer-down on empty overlay drags a rectangle; on release, every tagged element whose rect intersects the marquee enters the set.

**Group drag**
- Pointer-down on any selected element initiates *group move*: capture each id's starting `Edit`, apply the same `dx/dy` delta to all on every frame. Snap and guides compute against the group's union bounding box, not per-element.

**Group resize**
- With 2+ selected, render handles around the *union bounding box*. Dragging a corner scales every selected `width`, `height`, `dx`, `dy` proportionally to its position within the box (standard Figma group-resize math).
- **Min-size guard**: `width >= 40px` and `height >= 40px` per element regardless of scale factor. Resize stops at the limit instead of collapsing.
- Shift = lock aspect, Alt = disable snap (existing convention).

**Arrow nudge** iterates over `selectedIds`.

**HUD chip** shows `▸ N selected` (with `×` to clear) when `size > 1`.

---

## 2. Lock modes (built in from day one)

Three values for the dev-edit attribute, recognized at scan time:

| Attribute | Drag | Resize | Style panel |
|---|---|---|---|
| `data-devedit="true"` | yes | yes | yes |
| `data-devedit-lock="size"` | yes | **no resize handles** | yes |
| `data-devedit-lock="position"` | **no drag** | no | yes |

- `rescan()` reads either attribute via `el.matches('[data-devedit], [data-devedit-lock]')` and stores `lockMode: "none" | "size" | "position"` on each `TargetMeta`.
- `DevEditOutline` skips rendering corner handles when `lockMode === "size"` and uses `cursor: default` (no drag init) when `lockMode === "position"`.
- Group resize ignores any selected element with `lockMode !== "none"` for the resize math but still moves them on group drag (unless they're position-locked, in which case they're held fixed and the rest of the group moves around them).
- Existing tagged elements continue to behave as today (default `"none"`).

Apply in this pass: `#gallery-heading` → `data-devedit-lock="size"` (positional only — typography handled by `clamp()`).

---

## 3. Smart guides with live distance readouts

Pure SVG layer rendered above outlines, computed during pointermove. No library.

**Alignment guides**
- For the active selection's union box, candidate edges: left, right, top, bottom, hcenter, vcenter.
- For every *other* tagged element + the four viewport edges + viewport centerlines, compute the same edges.
- When any active edge comes within **`SNAP_RADIUS / canvas.scale`** (4px screen-space, converted to canvas-space) of a target edge, snap to it and draw a 1px magenta line spanning both elements along that axis. Snap value overrides the 8px grid for that frame.

**Distance pills**
- When the active union box is *not* overlapping a sibling, render the four edge-to-edge distances as small pills ("32px") between the active box and its nearest neighbor on each side. Updates live during drag.
- Hold `Alt` to suppress guides entirely (matches existing free-move convention).

**Visuals**
- Guides: 1px solid `rgba(255,0,200,0.9)` (magenta — distinct from yellow selection chrome).
- Pills: `rgba(15,15,15,0.9)` background, magenta border, 10px monospace.

---

## 4. Scrubbable numeric inputs

`<ScrubInput label step min max value onChange>` replaces `<Slider>` and bare `<input type="number">` in the Style panel.

**Behavior**
- Cursor over the **label** = `ew-resize`.
- Pointer-down on label → horizontal scrub: 1px movement = `step` units (default 1; configurable per field — `0.005` for opacity, `1` for blur/radius/zIndex, `0.5` for rotate).
- Shift while scrubbing → ×10 (fast). Alt → ÷10 (precision).
- The numeric `<input>` stays for keyboard entry; scrub is on the label.

**Applied to**: Backdrop Blur, Backdrop Saturate, Border Width, Border Radius, Rotate, Z-Index, plus a new bgOpacity scrub when `background` is parsed as `rgba(...)`.

**Multi-select banner**: when `selectedIds.size > 1`, the Style panel header shows `Editing {primary.label} · {N-1} others selected (style applies to primary only)`. Color: muted cream.

---

## 5. Pan + zoom canvas

Wrap content in a transform without breaking `position: fixed` (Navigation, HUD, modals).

**Wrapper** — `src/routes/__root.tsx`:
```tsx
<div id="devedit-canvas">
  <Outlet />
  {!hideFooter && (...)}
</div>
<DevEditOverlay />
```
Default transform is unset → production rendering byte-identical. No `willChange` in markup.

**Canvas state** in overlay: `{ scale, panX, panY }`, default `{1, 0, 0}`.

**Apply transform only while active**:
```ts
useEffect(() => {
  const el = document.getElementById("devedit-canvas");
  if (!el || !active) return;
  el.style.transformOrigin = "0 0";
  el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  el.style.willChange = "transform";    // set on enter
  return () => {
    el.style.transform = "";
    el.style.willChange = "";           // clear on exit — no permanent compositor layer
    el.style.transformOrigin = "";
  };
}, [active, scale, panX, panY]);
```

**Gestures (only while overlay active)**
- **Pan**: hold Space → cursor `grab`/`grabbing`, pointer-drag pans. Release Space exits pan mode.
- **Zoom**: `Ctrl/Cmd + wheel` → zoom toward cursor (Figma math: `panX -= (cursorX - panX) * (newScale/scale - 1)`).
- `+` / `-` → zoom by 10% steps centered on viewport.
- `` ` `` (**backtick**) → reset to scale=1, pan=0. (Avoids `0` accessibility conflicts.)
- `1` → fit current selection to viewport with 64px padding (or whole page if nothing selected).

**Coordinate helpers**
- `screenToCanvas(x, y) = ((x - panX) / scale, (y - panY) / scale)` — pointer events.
- Pointer deltas during drag divided by `scale` (visual cursor amount, not 2× at 200%).
- Snap radius **always passed in canvas units**: `findGuides(box, others, SNAP_RADIUS / scale)` and grid snap `SNAP / scale` (constant *visual* magnet zone at every zoom).

**Exempt from transform**: HUD bar, Style panel, Done modal, marquee, guides, and outline handles are siblings of `#devedit-canvas`. Outlines are drawn at `rectToScreen(el.getBoundingClientRect())` so they track the transformed canvas.

**HUD readout**: compact `100% · ⊕` chip showing zoom; click → reset.

---

## Technical Details

**File: `src/components/DevEditOverlay.tsx`**

State:
```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [marquee, setMarquee] = useState<{x,y,w,h}|null>(null);
const [canvas, setCanvas] = useState({ scale: 1, panX: 0, panY: 0 });
const [activeGuides, setActiveGuides] = useState<Guide[]>([]);
const [spacePan, setSpacePan] = useState(false);
```

`TargetMeta` gains `lockMode: "none" | "size" | "position"`.

Helpers:
```ts
function unionRect(ids: Set<string>): DOMRect
function applyGroupDelta(dx, dy)
function applyGroupScale(sx, sy, anchor)         // respects 40px min per element
function findGuides(activeBox, others, snapPx)   // snapPx is canvas-space
function screenToCanvas(x, y)
function rectToScreen(rect)
```

Pointer routing branches: marquee → group drag → group resize. `commitEdits` unchanged — group ops build one merged object and call once on pointerup.

`primarySelectedId` = `[...selectedIds][0] ?? null`. Style panel + nudge target it.

Reset button now also resets `canvas` to identity.

**File: `src/routes/__root.tsx`** — single wrapper change as shown above.

**File: `src/components/gallery/GalleryMasthead.tsx`** — change `#gallery-heading`'s `data-devedit` to `data-devedit-lock="size"`.

**Backwards compatibility**
- `Edit` shape unchanged → existing `lovable.devedit.edits.v2` localStorage continues to load and apply.
- All existing shortcuts preserved. New: Shift/Cmd+click, Space (pan), Ctrl/Cmd+wheel (zoom), `` ` `` (reset), `1` (fit), `+`/`-` (step zoom).

**Out of scope (intentional)**
- Multi-element style editing (Figma scopes style to primary too — banner makes this explicit).
- Group rotation handles (rotation stays single-element via Style scrub).
- Touch/pinch (desktop tool).

---

## Acceptance walk-through

1. `Shift+D` → page identical.
2. Marquee across heading + counter + panels → `▸ 3 selected`. Heading shows drag outline only (no corner handles — size-locked).
3. Drag any plate → all three move together. Magenta guide snaps the group's left edge to the heading's left edge (heading stays fixed because it's in the selection but locked-size still allows group drag — verify behavior or exclude size-locked from being moved as part of group; treat `lock="size"` as fully draggable, only resize disabled).
4. Grab union-box corner → resize stops at 40px min on the smallest element rather than collapsing.
5. Open Style panel → header shows `Editing #gallery-panels · 2 others selected`. Click-drag "Backdrop Blur" label → value scrubs live.
6. Hold Space → cursor `grab`, drag pans canvas. `Cmd+scroll` → zooms toward cursor. Magenta guide magnet still feels like 4px at every zoom level. `` ` `` resets. `1` fits selection.
7. Done → identical CSS shape, N blocks for N edited ids.
8. `Shift+D` off → wrapper transform cleared, `willChange` cleared, page byte-identical to non-dev render.
