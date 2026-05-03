import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * DevEditOverlay
 * ----------------------------------------------------------------------------
 * Visual layout sandbox. Toggle with Shift+D. Tag elements with `data-devedit`
 * and an `id`. Then in dev mode you can:
 *
 *   - Click an element to select it (only the selected one shows handles).
 *   - Drag to move (snaps to 8px; hold Alt to disable snap).
 *   - Drag corner handles to resize (same snap rules).
 *   - Arrow keys nudge by 1px; Shift+Arrow nudges by 8px.
 *   - Open the Style panel to edit visual properties live:
 *       * background color + opacity
 *       * border color + width
 *       * border-radius
 *       * box-shadow preset
 *       * backdrop-filter blur (glassmorphism)
 *       * rotation (deg)
 *       * z-index
 *   - Hit Done to get a copy-pasteable CSS block of EVERY edit so you can
 *     bake the values into the component's CSS and refresh.
 *
 * Edits are stored in React state AND mirrored to localStorage so a refresh
 * doesn't lose work. The "Reset" button clears both.
 *
 * Production safety: short-circuits to null in production unless VITE_DEV_EDIT
 * is explicitly set. Visitors can never trigger this.
 * ----------------------------------------------------------------------------
 */

const SNAP = 8;
const STORAGE_KEY = "lovable.devedit.edits.v2";

type StyleEdit = {
  background?: string;
  bgOpacity?: number; // 0..1, only used when background is set as rgba assembly
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  backdropBlur?: number; // px
  backdropSaturate?: number; // %
  rotate?: number; // deg
  zIndex?: number;
};

type Edit = {
  dx: number;
  dy: number;
  width: number;
  height: number;
  origWidth: number;
  origHeight: number;
  style?: StyleEdit;
};

type TargetMeta = {
  id: string;
  label: string;
  rect: DOMRect;
};

const isProd = import.meta.env.PROD;
const devEditFlagOn =
  typeof import.meta.env.VITE_DEV_EDIT !== "undefined" &&
  import.meta.env.VITE_DEV_EDIT !== "" &&
  import.meta.env.VITE_DEV_EDIT !== "false";

function snap(v: number, enabled: boolean) {
  return enabled ? Math.round(v / SNAP) * SNAP : Math.round(v);
}

function loadEdits(): Record<string, Edit> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveEdits(edits: Record<string, Edit>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    /* ignore quota errors */
  }
}

function applyEditToEl(el: HTMLElement, edit: Edit) {
  const rotate = edit.style?.rotate ? ` rotate(${edit.style.rotate}deg)` : "";
  el.style.transform = `translate(${edit.dx}px, ${edit.dy}px)${rotate}`;
  el.style.width = `${edit.width}px`;
  el.style.height = `${edit.height}px`;

  const s = edit.style;
  if (!s) return;
  if (s.background !== undefined) el.style.background = s.background;
  if (s.borderColor !== undefined && s.borderWidth !== undefined) {
    el.style.border = `${s.borderWidth}px solid ${s.borderColor}`;
  }
  if (s.borderRadius !== undefined) el.style.borderRadius = `${s.borderRadius}px`;
  if (s.boxShadow !== undefined) el.style.boxShadow = s.boxShadow;
  if (s.backdropBlur !== undefined || s.backdropSaturate !== undefined) {
    const b = s.backdropBlur ?? 0;
    const sat = s.backdropSaturate ?? 100;
    const filter = `blur(${b}px) saturate(${sat}%)`;
    el.style.backdropFilter = filter;
    (el.style as any).webkitBackdropFilter = filter;
  }
  if (s.zIndex !== undefined) el.style.zIndex = String(s.zIndex);
}

export function DevEditOverlay() {
  if (isProd && !devEditFlagOn) return null;

  const [active, setActive] = useState(false);
  const [targets, setTargets] = useState<TargetMeta[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>(() => loadEdits());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const editsRef = useRef(edits);
  editsRef.current = edits;

  const commitEdits = useCallback((next: Record<string, Edit>) => {
    editsRef.current = next;
    setEdits(next);
    saveEdits(next);
  }, []);

  // Toggle on Shift+D. Esc closes panels first, then dev mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        // Don't trigger on Shift+D inside text inputs.
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setActive((a) => !a);
        setShowDone(false);
        setShowStyle(false);
        return;
      }
      if (e.key === "Escape") {
        if (showDone) return setShowDone(false);
        if (showStyle) return setShowStyle(false);
        if (selectedId) return setSelectedId(null);
        if (active) return setActive(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, showDone, showStyle, selectedId]);

  // Arrow-key nudging for selected element.
  useEffect(() => {
    if (!active || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? SNAP : 1;
      const el = document.getElementById(selectedId) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const current: Edit =
        editsRef.current[selectedId] || {
          dx: 0,
          dy: 0,
          width: r.width,
          height: r.height,
          origWidth: r.width,
          origHeight: r.height,
        };
      const next: Edit = { ...current };
      if (e.key === "ArrowLeft") next.dx -= step;
      if (e.key === "ArrowRight") next.dx += step;
      if (e.key === "ArrowUp") next.dy -= step;
      if (e.key === "ArrowDown") next.dy += step;
      applyEditToEl(el, next);
      commitEdits({ ...editsRef.current, [selectedId]: next });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selectedId, commitEdits]);

  // Rescan tagged elements + measure rects.
  const rescan = useCallback(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-devedit]")
    );
    const next: TargetMeta[] = els.map((el) => {
      if (!el.id) {
        el.id = `devedit-${Math.random().toString(36).slice(2, 8)}`;
      }
      const edit = editsRef.current[el.id];
      if (edit) applyEditToEl(el, edit);
      return {
        id: el.id,
        label:
          el.dataset.deveditLabel ||
          el.tagName.toLowerCase() + "#" + el.id,
        rect: el.getBoundingClientRect(),
      };
    });
    setTargets(next);
  }, []);

  // Track whether a drag is in progress so we DON'T rescan mid-drag (that's
  // what was causing elements to "bounce back" — the periodic rescan would
  // re-measure with a stale rect and re-render handles in the old spot).
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    rescan();
    const onResize = () => { if (!draggingRef.current) rescan(); };
    const onScroll = () => { if (!draggingRef.current) rescan(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    // No periodic interval — it raced the drag. Rescan only on real events.
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [active, rescan]);

  // Re-apply persisted edits even when overlay isn't open, so refreshes
  // keep your work-in-progress visible.
  useEffect(() => {
    const persisted = loadEdits();
    if (Object.keys(persisted).length === 0) return;
    const apply = () => {
      Object.entries(persisted).forEach(([id, edit]) => {
        const el = document.getElementById(id);
        if (el) applyEditToEl(el, edit);
      });
    };
    apply();
    // Re-apply after a tick in case React renders async.
    const t = window.setTimeout(apply, 100);
    return () => window.clearTimeout(t);
  }, []);

  const startInteraction = useCallback(
    (
      target: TargetMeta,
      mode: "move" | "nw" | "ne" | "sw" | "se",
      e: React.PointerEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(target.id);
      const el = document.getElementById(target.id) as HTMLElement | null;
      if (!el) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startEdit: Edit = editsRef.current[target.id] || {
        dx: 0,
        dy: 0,
        width: target.rect.width,
        height: target.rect.height,
        origWidth: target.rect.width,
        origHeight: target.rect.height,
      };

      draggingRef.current = true;

      const onMove = (ev: PointerEvent) => {
        const useSnap = snapEnabled && !ev.altKey;
        const mx = ev.clientX - startX;
        const my = ev.clientY - startY;
        let next: Edit = { ...startEdit };

        if (mode === "move") {
          next.dx = snap(startEdit.dx + mx, useSnap);
          next.dy = snap(startEdit.dy + my, useSnap);
        } else {
          let dW = 0;
          let dH = 0;
          let dXShift = 0;
          let dYShift = 0;
          if (mode === "se") {
            dW = mx;
            dH = my;
          } else if (mode === "ne") {
            dW = mx;
            dH = -my;
            dYShift = my;
          } else if (mode === "sw") {
            dW = -mx;
            dH = my;
            dXShift = mx;
          } else if (mode === "nw") {
            dW = -mx;
            dH = -my;
            dXShift = mx;
            dYShift = my;
          }
          next.width = Math.max(20, snap(startEdit.width + dW, useSnap));
          next.height = Math.max(20, snap(startEdit.height + dH, useSnap));
          next.dx = snap(startEdit.dx + dXShift, useSnap);
          next.dy = snap(startEdit.dy + dYShift, useSnap);
        }

        applyEditToEl(el, next);
        // Update ref synchronously so pointerup commits the latest. Do NOT
        // rescan here — it caused handle positions to lag and "snap back"
        // because React re-rendered with a stale rect from the previous frame.
        editsRef.current = { ...editsRef.current, [target.id]: next };
        // Update the live overlay handle in-place via a fast measurement.
        const liveRect = el.getBoundingClientRect();
        setTargets((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, rect: liveRect } : p))
        );
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        draggingRef.current = false;
        commitEdits({ ...editsRef.current });
        // One final clean rescan after the drag fully settles.
        requestAnimationFrame(() => rescan());
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [rescan, snapEnabled, commitEdits]
  );

  // ----- Z-order + alignment helpers for the selected element -----
  const bumpZ = useCallback(
    (delta: number) => {
      if (!selectedId) return;
      const cur = editsRef.current[selectedId];
      const currentZ = cur?.style?.zIndex ?? 0;
      const el = document.getElementById(selectedId) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const base: Edit =
        cur || {
          dx: 0, dy: 0,
          width: r.width, height: r.height,
          origWidth: r.width, origHeight: r.height,
        };
      const next: Edit = { ...base, style: { ...(base.style || {}), zIndex: currentZ + delta } };
      applyEditToEl(el, next);
      commitEdits({ ...editsRef.current, [selectedId]: next });
    },
    [selectedId, commitEdits]
  );

  const alignSelected = useCallback(
    (where: "tl" | "tr" | "bl" | "br" | "center" | "cx" | "cy") => {
      if (!selectedId) return;
      const el = document.getElementById(selectedId) as HTMLElement | null;
      if (!el) return;
      // Reset transform to read the element's natural (untranslated) rect.
      const cur = editsRef.current[selectedId];
      const prevTransform = el.style.transform;
      el.style.transform = (cur?.style?.rotate ? `rotate(${cur.style.rotate}deg)` : "");
      const natural = el.getBoundingClientRect();
      el.style.transform = prevTransform;

      const w = cur?.width ?? natural.width;
      const h = cur?.height ?? natural.height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // natural rect already includes width changes via inline style, but its
      // left/top are the *current* visual origin minus dx/dy. Recover origin:
      const originLeft = natural.left - (cur?.dx ?? 0);
      const originTop = natural.top - (cur?.dy ?? 0);

      let targetLeft = originLeft;
      let targetTop = originTop;
      const PAD = 8;
      if (where === "tl") { targetLeft = PAD; targetTop = PAD; }
      else if (where === "tr") { targetLeft = vw - w - PAD; targetTop = PAD; }
      else if (where === "bl") { targetLeft = PAD; targetTop = vh - h - PAD; }
      else if (where === "br") { targetLeft = vw - w - PAD; targetTop = vh - h - PAD; }
      else if (where === "center") { targetLeft = (vw - w) / 2; targetTop = (vh - h) / 2; }
      else if (where === "cx") { targetLeft = (vw - w) / 2; }
      else if (where === "cy") { targetTop = (vh - h) / 2; }

      const next: Edit = {
        ...(cur || {
          dx: 0, dy: 0, width: w, height: h,
          origWidth: natural.width, origHeight: natural.height,
        }),
        dx: Math.round(targetLeft - originLeft),
        dy: Math.round(targetTop - originTop),
      };
      applyEditToEl(el, next);
      commitEdits({ ...editsRef.current, [selectedId]: next });
      requestAnimationFrame(() => rescan());
    },
    [selectedId, commitEdits, rescan]
  );

  // Update style edit for the currently selected element.
  const updateStyle = useCallback(
    (patch: Partial<StyleEdit>) => {
      if (!selectedId) return;
      const el = document.getElementById(selectedId) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const current: Edit =
        editsRef.current[selectedId] || {
          dx: 0,
          dy: 0,
          width: r.width,
          height: r.height,
          origWidth: r.width,
          origHeight: r.height,
        };
      const next: Edit = {
        ...current,
        style: { ...(current.style || {}), ...patch },
      };
      applyEditToEl(el, next);
      commitEdits({ ...editsRef.current, [selectedId]: next });
    },
    [selectedId, commitEdits]
  );

  const editedIds = useMemo(() => Object.keys(edits), [edits]);
  const selectedTarget = targets.find((t) => t.id === selectedId) || null;
  const selectedEdit = selectedId ? edits[selectedId] : undefined;

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {/* Per-target outlines (dim) + handles (only on selected). */}
      {targets.map((t) => (
        <DevEditOutline
          key={t.id}
          target={t}
          selected={t.id === selectedId}
          edited={!!edits[t.id]}
          onSelect={() => setSelectedId(t.id)}
          onStart={startInteraction}
        />
      ))}

      {/* HUD bar */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 16px",
          background: "rgba(15,15,15,0.94)",
          color: "#f5f2ed",
          font: "11px/1.4 ui-monospace, Menlo, monospace",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderTop: "1px solid rgba(255,200,0,0.4)",
          pointerEvents: "auto",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "rgba(255,200,0,0.9)" }}>● Dev Mode</span>
        <span style={{ opacity: 0.7 }}>
          {targets.length} tagged · {editedIds.length} edited
        </span>
        {selectedTarget && (
          <span style={{ opacity: 0.85, color: "rgba(120,220,140,0.95)" }}>
            ▸ {selectedTarget.label}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.85 }}>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapEnabled(e.target.checked)}
            style={{ accentColor: "#ffd84d" }}
          />
          Snap 8px
        </label>
        {/* Alignment + z-order — only meaningful when something is selected */}
        <div style={{ display: "flex", gap: 4, opacity: selectedId ? 1 : 0.4 }}>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("tl")} style={miniBtn} title="Snap top-left">⌜</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("tr")} style={miniBtn} title="Snap top-right">⌝</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("bl")} style={miniBtn} title="Snap bottom-left">⌞</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("br")} style={miniBtn} title="Snap bottom-right">⌟</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("cx")} style={miniBtn} title="Center horizontally">↔</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("cy")} style={miniBtn} title="Center vertically">↕</button>
          <button type="button" disabled={!selectedId} onClick={() => alignSelected("center")} style={miniBtn} title="Center on screen">◎</button>
        </div>
        <div style={{ display: "flex", gap: 4, opacity: selectedId ? 1 : 0.4 }}>
          <button type="button" disabled={!selectedId} onClick={() => bumpZ(100)} style={miniBtn} title="Bring to front">▲▲</button>
          <button type="button" disabled={!selectedId} onClick={() => bumpZ(1)} style={miniBtn} title="Forward 1">▲</button>
          <button type="button" disabled={!selectedId} onClick={() => bumpZ(-1)} style={miniBtn} title="Backward 1">▼</button>
          <button type="button" disabled={!selectedId} onClick={() => bumpZ(-100)} style={miniBtn} title="Send to back">▼▼</button>
        </div>
        <button
          type="button"
          onClick={() => setShowStyle((s) => !s)}
          disabled={!selectedId}
          style={hudBtn(!selectedId, showStyle)}
        >
          Style
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Reset ALL edits? This clears localStorage too.")) return;
            // Wipe inline styles on every tagged element.
            document.querySelectorAll<HTMLElement>("[data-devedit]").forEach((el) => {
              el.style.cssText = "";
            });
            commitEdits({});
            setSelectedId(null);
          }}
          disabled={editedIds.length === 0}
          style={hudBtn(editedIds.length === 0)}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setShowDone(true)}
          style={hudBtn(false, true)}
        >
          Done ({editedIds.length})
        </button>
        <span style={{ opacity: 0.5 }}>Shift+D · Esc · ←↑→↓ · Alt=free</span>
      </div>

      {/* Style panel — floats above HUD when an element is selected. */}
      {showStyle && selectedTarget && (
        <StylePanel
          target={selectedTarget}
          edit={selectedEdit}
          onUpdate={updateStyle}
          onClose={() => setShowStyle(false)}
        />
      )}

      {/* Done panel — copy-pasteable CSS summary */}
      {showDone && (
        <DonePanel edits={edits} onClose={() => setShowDone(false)} />
      )}
    </div>
  );
}

function DevEditOutline({
  target,
  selected,
  edited,
  onSelect,
  onStart,
}: {
  target: TargetMeta;
  selected: boolean;
  edited: boolean;
  onSelect: () => void;
  onStart: (
    t: TargetMeta,
    mode: "move" | "nw" | "ne" | "sw" | "se",
    e: React.PointerEvent
  ) => void;
}) {
  const r = target.rect;
  const outlineColor = selected
    ? "rgba(255,200,0,0.95)"
    : edited
    ? "rgba(120,220,140,0.7)"
    : "rgba(255,200,0,0.35)";
  const handleSize = 10;

  // Non-selected: thin outline + click-to-select. Selected: drag body + corners.
  if (!selected) {
    return (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        }}
        style={{
          position: "fixed",
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          outline: `1px dashed ${outlineColor}`,
          outlineOffset: -1,
          background: edited ? "rgba(120,220,140,0.04)" : "transparent",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: -16,
            font: "9px/1 ui-monospace, Menlo, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: outlineColor,
            background: "rgba(15,15,15,0.7)",
            padding: "2px 5px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0.85,
          }}
        >
          {target.label}
        </span>
      </div>
    );
  }

  const corners: Array<["nw" | "ne" | "sw" | "se", React.CSSProperties]> = [
    ["nw", { left: r.left - handleSize / 2, top: r.top - handleSize / 2, cursor: "nwse-resize" }],
    ["ne", { left: r.right - handleSize / 2, top: r.top - handleSize / 2, cursor: "nesw-resize" }],
    ["sw", { left: r.left - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nesw-resize" }],
    ["se", { left: r.right - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nwse-resize" }],
  ];

  return (
    <>
      <div
        onPointerDown={(e) => onStart(target, "move", e)}
        style={{
          position: "fixed",
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          outline: `2px solid ${outlineColor}`,
          outlineOffset: -1,
          background: "rgba(255,200,0,0.06)",
          cursor: "move",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: -20,
            font: "10px/1 ui-monospace, Menlo, monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: outlineColor,
            background: "rgba(15,15,15,0.92)",
            padding: "3px 7px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {target.label} · {Math.round(r.width)}×{Math.round(r.height)}
        </span>
      </div>
      {corners.map(([mode, style]) => (
        <div
          key={mode}
          onPointerDown={(e) => onStart(target, mode, e)}
          style={{
            position: "fixed",
            width: handleSize,
            height: handleSize,
            background: outlineColor,
            border: "1px solid rgba(15,15,15,0.9)",
            pointerEvents: "auto",
            ...style,
          }}
        />
      ))}
    </>
  );
}

// --------------------------------------------------------------------------
// Style panel: glass / color / border / radius / shadow / rotate / z-index
// --------------------------------------------------------------------------

const SHADOW_PRESETS: Array<{ label: string; value: string }> = [
  { label: "None", value: "none" },
  { label: "Soft", value: "0 8px 24px rgba(0,0,0,0.18)" },
  { label: "Medium", value: "0 16px 40px rgba(0,0,0,0.32)" },
  { label: "Heavy", value: "0 30px 80px rgba(0,0,0,0.55)" },
  {
    label: "Glass",
    value:
      "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 56px rgba(0,0,0,0.45)",
  },
];

const GLASS_PRESETS: Array<{ label: string; patch: StyleEdit }> = [
  {
    label: "Frosted Light",
    patch: {
      background: "rgba(255,255,255,0.08)",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      backdropBlur: 24,
      backdropSaturate: 130,
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 56px rgba(0,0,0,0.4)",
    },
  },
  {
    label: "Frosted Dark",
    patch: {
      background: "rgba(18,18,18,0.48)",
      borderColor: "rgba(255,255,255,0.09)",
      borderWidth: 1,
      backdropBlur: 20,
      backdropSaturate: 130,
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 56px rgba(0,0,0,0.55)",
    },
  },
  {
    label: "Ghost",
    patch: {
      background: "rgba(255,255,255,0.045)",
      borderColor: "rgba(255,255,255,0.07)",
      borderWidth: 1,
      backdropBlur: 28,
      backdropSaturate: 120,
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.45)",
    },
  },
  {
    label: "Clear",
    patch: {
      background: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      backdropBlur: 0,
      backdropSaturate: 100,
      boxShadow: "none",
    },
  },
];

function StylePanel({
  target,
  edit,
  onUpdate,
  onClose,
}: {
  target: TargetMeta;
  edit: Edit | undefined;
  onUpdate: (patch: Partial<StyleEdit>) => void;
  onClose: () => void;
}) {
  const s = edit?.style || {};
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 64,
        width: 280,
        maxHeight: "70vh",
        overflow: "auto",
        background: "#0f0f0f",
        color: "#f5f2ed",
        border: "1px solid rgba(255,200,0,0.4)",
        padding: 14,
        font: "11px/1.4 ui-monospace, Menlo, monospace",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Style · {target.label}
        </strong>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={hudBtn(false)}>
          ×
        </button>
      </div>

      <Section title="Glass Presets">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {GLASS_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onUpdate(p.patch)}
              style={hudBtn(false)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background">
        <input
          type="text"
          value={s.background ?? ""}
          placeholder="rgba(0,0,0,0.5) or #fff"
          onChange={(e) => onUpdate({ background: e.target.value })}
          style={inputStyle}
        />
      </Section>

      <Section title="Backdrop Blur">
        <Slider
          min={0}
          max={60}
          value={s.backdropBlur ?? 0}
          onChange={(v) => onUpdate({ backdropBlur: v })}
        />
      </Section>

      <Section title="Backdrop Saturate (%)">
        <Slider
          min={50}
          max={200}
          value={s.backdropSaturate ?? 100}
          onChange={(v) => onUpdate({ backdropSaturate: v })}
        />
      </Section>

      <Section title="Border">
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            value={s.borderColor ?? ""}
            placeholder="rgba(255,255,255,0.1)"
            onChange={(e) => onUpdate({ borderColor: e.target.value })}
            style={{ ...inputStyle, flex: 2 }}
          />
          <input
            type="number"
            min={0}
            max={20}
            value={s.borderWidth ?? 0}
            onChange={(e) => onUpdate({ borderWidth: Number(e.target.value) })}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </Section>

      <Section title="Border Radius">
        <Slider
          min={0}
          max={60}
          value={s.borderRadius ?? 0}
          onChange={(v) => onUpdate({ borderRadius: v })}
        />
      </Section>

      <Section title="Box Shadow">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {SHADOW_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onUpdate({ boxShadow: p.value })}
              style={hudBtn(false, s.boxShadow === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Rotate (deg)">
        <Slider
          min={-30}
          max={30}
          value={s.rotate ?? 0}
          onChange={(v) => onUpdate({ rotate: v })}
        />
      </Section>

      <Section title="Z-Index">
        <input
          type="number"
          value={s.zIndex ?? 0}
          onChange={(e) => onUpdate({ zIndex: Number(e.target.value) })}
          style={inputStyle}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: 0.55,
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Slider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#ffd84d" }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inputStyle, width: 56 }}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#f5f2ed",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "5px 7px",
  font: "11px/1.2 ui-monospace, Menlo, monospace",
  width: "100%",
  outline: "none",
};

// --------------------------------------------------------------------------
// Done panel
// --------------------------------------------------------------------------

function buildCss(edits: Record<string, Edit>) {
  return Object.entries(edits)
    .map(([id, e]) => {
      const dx = Math.round(e.dx);
      const dy = Math.round(e.dy);
      const w = Math.round(e.width);
      const h = Math.round(e.height);
      const lines: string[] = [];
      const rotate = e.style?.rotate ? ` rotate(${e.style.rotate}deg)` : "";
      lines.push(`  transform: translate(${dx}px, ${dy}px)${rotate};`);
      lines.push(`  width: ${w}px;`);
      lines.push(`  height: ${h}px;`);
      const s = e.style;
      if (s) {
        if (s.background !== undefined) lines.push(`  background: ${s.background};`);
        if (s.borderColor !== undefined && s.borderWidth !== undefined) {
          lines.push(`  border: ${s.borderWidth}px solid ${s.borderColor};`);
        }
        if (s.borderRadius !== undefined) lines.push(`  border-radius: ${s.borderRadius}px;`);
        if (s.boxShadow !== undefined) lines.push(`  box-shadow: ${s.boxShadow};`);
        if (s.backdropBlur !== undefined || s.backdropSaturate !== undefined) {
          const b = s.backdropBlur ?? 0;
          const sat = s.backdropSaturate ?? 100;
          lines.push(`  backdrop-filter: blur(${b}px) saturate(${sat}%);`);
          lines.push(`  -webkit-backdrop-filter: blur(${b}px) saturate(${sat}%);`);
        }
        if (s.zIndex !== undefined) lines.push(`  z-index: ${s.zIndex};`);
      }
      return `#${id} {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");
}

function DonePanel({
  edits,
  onClose,
}: {
  edits: Record<string, Edit>;
  onClose: () => void;
}) {
  const entries = Object.entries(edits);
  const css = buildCss(edits);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        pointerEvents: "auto",
        zIndex: 1,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          background: "#0f0f0f",
          color: "#f5f2ed",
          border: "1px solid rgba(255,200,0,0.4)",
          padding: 20,
          font: "12px/1.5 ui-monospace, Menlo, monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
            CSS Output · {entries.length} edits
          </strong>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(css)}
            style={hudBtn(false, true)}
          >
            Copy All
          </button>
          <span style={{ width: 8 }} />
          <button type="button" onClick={onClose} style={hudBtn(false)}>
            Close
          </button>
        </div>
        {entries.length === 0 ? (
          <p style={{ opacity: 0.6 }}>
            No edits yet. Click an element, then drag/resize or open Style.
          </p>
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#1a1a1a",
              padding: 14,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {css}
          </pre>
        )}
        <p style={{ opacity: 0.55, marginTop: 12 }}>
          Paste into the matching component's CSS and refresh. Edits persist
          in localStorage so a refresh won't lose them — use Reset to clear.
        </p>
      </div>
    </div>
  );
}

function hudBtn(disabled: boolean, primary = false): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: primary ? "#f5f2ed" : "transparent",
    color: primary ? "#0f0f0f" : "#f5f2ed",
    border: "1px solid rgba(255,255,255,0.25)",
    font: "10px/1 ui-monospace, Menlo, monospace",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}
