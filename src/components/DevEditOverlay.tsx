import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * DevEditOverlay
 * ----------------------------------------------------------------------------
 * A self-contained dev affordance. Activated with Shift+D. When active:
 *  - Scans the DOM for every element with `data-devedit`.
 *  - Renders a transparent overlay above each one with a drag body (move) and
 *    four corner handles (resize).
 *  - Edits are applied by writing inline `transform: translate(dx, dy)` and
 *    `width` / `height` to the target element. Original CSS stays untouched.
 *  - Hit "Done" to open a copy-pasteable panel of CSS values for every
 *    modified element. You paste into the component CSS, refresh, and the
 *    overlay's job is done.
 *
 * Production safety: this component is mounted unconditionally, but it
 * short-circuits to `null` in production builds unless VITE_DEV_EDIT is set.
 * The keyboard listener is also gated, so visitors can't trigger it.
 *
 * Tag elements like:
 *   <h1 id="gallery-heading" data-devedit data-devedit-label="Heading">…</h1>
 *
 * The `id` is required (it's how the overlay tracks each element across
 * re-scans). `data-devedit-label` is optional cosmetic text in the HUD.
 * ----------------------------------------------------------------------------
 */

type Edit = {
  dx: number;
  dy: number;
  width: number;
  height: number;
  // Original measured rect — used to compute the delta CSS output.
  origWidth: number;
  origHeight: number;
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

export function DevEditOverlay() {
  // Hard production gate — never ship handles to real visitors.
  if (isProd && !devEditFlagOn) return null;

  const [active, setActive] = useState(false);
  const [targets, setTargets] = useState<TargetMeta[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [showDone, setShowDone] = useState(false);
  const editsRef = useRef(edits);
  editsRef.current = edits;

  // Toggle on Shift+D. Esc closes the Done panel first, then dev mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setActive((a) => !a);
        setShowDone(false);
        return;
      }
      if (e.key === "Escape") {
        if (showDone) {
          setShowDone(false);
        } else if (active) {
          setActive(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, showDone]);

  // Rescan tagged elements + measure rects whenever active, on resize,
  // and on scroll (so handles follow). Also runs a slow interval while
  // active in case React re-renders the underlying tree.
  const rescan = useCallback(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-devedit]")
    );
    const next: TargetMeta[] = els.map((el) => {
      // Make sure each tagged element has an id; if not, synthesize one.
      if (!el.id) {
        el.id = `devedit-${Math.random().toString(36).slice(2, 8)}`;
      }
      // Apply any in-flight edits to inline style.
      const edit = editsRef.current[el.id];
      if (edit) {
        el.style.transform = `translate(${edit.dx}px, ${edit.dy}px)`;
        el.style.width = `${edit.width}px`;
        el.style.height = `${edit.height}px`;
      }
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

  useEffect(() => {
    if (!active) return;
    rescan();
    const onResize = () => rescan();
    const onScroll = () => rescan();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    const interval = window.setInterval(rescan, 600);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.clearInterval(interval);
    };
  }, [active, rescan]);

  // Mouse-driven drag/resize. We capture pointer events on the handle, then
  // track movement on window until release. Each delta updates `edits` and
  // writes inline style on the real element, then triggers rescan so the
  // overlay handles follow.
  const startInteraction = useCallback(
    (
      target: TargetMeta,
      mode: "move" | "nw" | "ne" | "sw" | "se",
      e: React.PointerEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();
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

      const onMove = (ev: PointerEvent) => {
        const mx = ev.clientX - startX;
        const my = ev.clientY - startY;
        let next: Edit = { ...startEdit };

        if (mode === "move") {
          next.dx = startEdit.dx + mx;
          next.dy = startEdit.dy + my;
        } else {
          // Resize. Each corner adjusts width/height (and translate, for
          // corners that move the top/left edge).
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
          next.width = Math.max(20, startEdit.width + dW);
          next.height = Math.max(20, startEdit.height + dH);
          next.dx = startEdit.dx + dXShift;
          next.dy = startEdit.dy + dYShift;
        }

        el.style.transform = `translate(${next.dx}px, ${next.dy}px)`;
        el.style.width = `${next.width}px`;
        el.style.height = `${next.height}px`;
        editsRef.current = { ...editsRef.current, [target.id]: next };
        // Don't setState every frame — we'll just rescan rects.
        rescan();
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setEdits({ ...editsRef.current });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [rescan]
  );

  const editedIds = useMemo(() => Object.keys(edits), [edits]);

  if (!active) return null;

  return (
    <div
      // Overlay root — pointer events disabled so non-handle areas pass
      // clicks through to the underlying page.
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {/* Per-target handles */}
      {targets.map((t) => (
        <DevEditHandles
          key={t.id}
          target={t}
          onStart={startInteraction}
          edited={!!edits[t.id]}
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
          background: "rgba(15,15,15,0.92)",
          color: "#f5f2ed",
          font: "11px/1.4 ui-monospace, Menlo, monospace",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderTop: "1px solid rgba(255,200,0,0.4)",
          pointerEvents: "auto",
        }}
      >
        <span style={{ color: "rgba(255,200,0,0.9)" }}>● Dev Mode</span>
        <span style={{ opacity: 0.7 }}>
          {targets.length} tagged · {editedIds.length} edited
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setEdits({})}
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
          Done
        </button>
        <span style={{ opacity: 0.5 }}>Shift+D · Esc</span>
      </div>

      {/* Done panel — copy-pasteable CSS summary */}
      {showDone && (
        <DonePanel
          edits={edits}
          onClose={() => setShowDone(false)}
        />
      )}
    </div>
  );
}

function DevEditHandles({
  target,
  onStart,
  edited,
}: {
  target: TargetMeta;
  onStart: (
    t: TargetMeta,
    mode: "move" | "nw" | "ne" | "sw" | "se",
    e: React.PointerEvent
  ) => void;
  edited: boolean;
}) {
  const r = target.rect;
  const outlineColor = edited
    ? "rgba(120,220,140,0.85)"
    : "rgba(255,200,0,0.55)";
  const handleSize = 10;
  const corners: Array<["nw" | "ne" | "sw" | "se", React.CSSProperties]> = [
    ["nw", { left: r.left - handleSize / 2, top: r.top - handleSize / 2, cursor: "nwse-resize" }],
    ["ne", { left: r.right - handleSize / 2, top: r.top - handleSize / 2, cursor: "nesw-resize" }],
    ["sw", { left: r.left - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nesw-resize" }],
    ["se", { left: r.right - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nwse-resize" }],
  ];

  return (
    <>
      {/* Drag body — covers the element. Pointer events on so it grabs. */}
      <div
        onPointerDown={(e) => onStart(target, "move", e)}
        style={{
          position: "fixed",
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          outline: `2px dashed ${outlineColor}`,
          outlineOffset: -1,
          background: edited ? "rgba(120,220,140,0.05)" : "transparent",
          cursor: "move",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: -18,
            font: "10px/1 ui-monospace, Menlo, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: outlineColor,
            background: "rgba(15,15,15,0.85)",
            padding: "2px 6px",
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

function DonePanel({
  edits,
  onClose,
}: {
  edits: Record<string, Edit>;
  onClose: () => void;
}) {
  const entries = Object.entries(edits);
  const css = entries
    .map(([id, e]) => {
      const dx = Math.round(e.dx);
      const dy = Math.round(e.dy);
      const w = Math.round(e.width);
      const h = Math.round(e.height);
      return `#${id} {
  transform: translate(${dx}px, ${dy}px);
  width: ${w}px;
  height: ${h}px;
}`;
    })
    .join("\n\n");

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
          width: "min(720px, 100%)",
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
            CSS Output
          </strong>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(css)}
            style={hudBtn(false, true)}
          >
            Copy
          </button>
          <span style={{ width: 8 }} />
          <button type="button" onClick={onClose} style={hudBtn(false)}>
            Close
          </button>
        </div>
        {entries.length === 0 ? (
          <p style={{ opacity: 0.6 }}>
            No edits yet. Drag or resize a tagged element first.
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
          Paste into the matching component's CSS and refresh. The overlay
          writes inline transform/width/height — your committed CSS should
          replicate those values as the new defaults.
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
