import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Crosshair, Loader2, Lock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setCoverFocal } from "@/lib/inventory-images.functions";
import { invalidateCollectionCatalog } from "@/lib/phase3-catalog";
import {
  NormalizedProductImage,
  focalToFrame,
} from "@/components/collection/NormalizedProductImage";
import { resolveProductFit } from "@/components/collection/productFit";

type Props = {
  id: string;
  coverUrl: string;
  /** Initial focal — null means unset (auto). Passed by the parent, which
   *  already holds the row; this component must never re-fetch it. */
  initialX: number | null;
  initialY: number | null;
  /** When set, the public tile renders the baked derivative and ignores focal
   *  entirely — so the editor is disabled rather than silently a no-op. */
  coverFramedUrl?: string | null;
  /** Fit inputs so the preview renders the real production rule. */
  categorySlug?: string | null;
  dimensions?: string | null;
  onSaved?: (next: { x: number | null; y: number | null }) => void;
};

const PREVIEW_ASPECT = 5 / 4;

/**
 * Below this much movement in FRAME space, an override is visually inert —
 * it costs a manual value on the row and buys nothing. Warn, never block:
 * the guard has to reason in the same coordinate space the renderer uses
 * (that mismatch is what produced the Ingram overshoot), and a threshold is
 * advice, not a correctness rule.
 */
const INERT_FRAME_DELTA = 0.01;

/**
 * Click anywhere on the cover to drop a focal-point dot. That point becomes
 * the visual center on Collection tiles.
 *
 * The click is measured against the PHOTO, not against this box. The photo is
 * object-contain inside a fixed-height stage, so a wide cover only fills a
 * band in the middle — counting that letterbox padding as picture is what made
 * every saved focal point land in the wrong place. `contentRect()` converts
 * stage coordinates into true photo coordinates (and back, for the dot).
 *
 * COMPATIBILITY CONTRACT (docs/frame-studio-plan.md): focal applies only where
 * `cover_framed_url IS NULL`. Render-time and bake-time compositing never both
 * own the same pixel placement. At Frame Studio Phase 3+ focal becomes an input
 * to the bake recipe, not a runtime prop.
 */
export function FocalEditor({
  id,
  coverUrl,
  initialX,
  initialY,
  coverFramedUrl = null,
  categorySlug = null,
  dimensions = null,
  onSaved,
}: Props) {
  const [x, setX] = useState<number | null>(initialX);
  const [y, setY] = useState<number | null>(initialY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [lastEdit, setLastEdit] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const save = useServerFn(setCoverFocal);

  const framed = Boolean(coverFramedUrl);
  const fitRule = resolveProductFit({ categorySlug, dimensions });

  // Keep in sync when the parent swaps rows.
  useEffect(() => {
    setX(initialX);
    setY(initialY);
    setWarn(null);
  }, [id, initialX, initialY]);

  // Reset measurement when the cover changes — a new photo has a new letterbox.
  useEffect(() => {
    setNatural(null);
  }, [coverUrl]);

  // "Who touched this" — the audit row already exists, it just wasn't visible.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("at")
        .eq("entity", "inventory_items")
        .eq("entity_id", id)
        .eq("action", "set_cover_focal")
        .order("at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLastEdit(data?.at ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, saving]);

  /**
   * Where the contained photo actually sits inside the stage box, in stage
   * fractions. Without natural dimensions we cannot know, so we degrade to the
   * full box rather than guessing.
   */
  const contentRect = () => {
    const stage = stageRef.current;
    if (!stage || !natural) return { left: 0, top: 0, w: 1, h: 1 };
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return { left: 0, top: 0, w: 1, h: 1 };
    const boxAspect = rect.width / rect.height;
    const imgAspect = natural.w / natural.h;
    const w = imgAspect >= boxAspect ? 1 : imgAspect / boxAspect;
    const h = imgAspect >= boxAspect ? boxAspect / imgAspect : 1;
    return { left: (1 - w) / 2, top: (1 - h) / 2, w, h };
  };

  /**
   * Frame-space travel this override actually buys, measured with the same
   * function the tile renders through so the two can never disagree.
   */
  const frameDelta = (nx: number, ny: number) => {
    if (!natural) return null;
    const aspect = natural.w / natural.h;
    const renderedW = aspect >= PREVIEW_ASPECT ? 1 : aspect / PREVIEW_ASPECT;
    const renderedH = aspect >= PREVIEW_ASPECT ? PREVIEW_ASPECT / aspect : 1;
    const point = focalToFrame(nx, ny, renderedW, renderedH);
    const center = focalToFrame(0.5, 0.5, renderedW, renderedH);
    return Math.max(Math.abs(point.fx - center.fx), Math.abs(point.fy - center.fy));
  };

  const commit = async (nx: number | null, ny: number | null) => {
    setSaving(true);
    setErr(null);
    try {
      await save({ data: { id, x: nx, y: ny } });
      setX(nx);
      setY(ny);
      invalidateCollectionCatalog();
      onSaved?.({ x: nx, y: ny });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (framed) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width;
    const sy = (e.clientY - rect.top) / rect.height;
    const c = contentRect();
    // Stage space → photo space, clamped so a click in the letterbox lands on
    // the nearest edge of the picture instead of off the picture entirely.
    const nx = Math.max(0, Math.min(1, Number(((sx - c.left) / c.w).toFixed(3))));
    const ny = Math.max(0, Math.min(1, Number(((sy - c.top) / c.h).toFixed(3))));

    const delta = frameDelta(nx, ny);
    setWarn(
      delta !== null && delta < INERT_FRAME_DELTA
        ? "This override moves the tile less than 1% — it does effectively nothing. Auto centering is the better answer here."
        : null,
    );

    void commit(nx, ny);
  };

  const hasFocal = x !== null && y !== null;
  const c = contentRect();
  // Photo space → stage space, for drawing the dot back where it was clicked.
  const dotLeft = hasFocal ? (c.left + x! * c.w) * 100 : 0;
  const dotTop = hasFocal ? (c.top + y! * c.h) * 100 : 0;

  const badge = framed
    ? { label: "Framed", cls: "border-sky-300 bg-sky-50 text-sky-700" }
    : hasFocal
      ? {
          label: `Manual ${(x! * 100).toFixed(0)}% · ${(y! * 100).toFixed(0)}%`,
          cls: "border-amber-300 bg-amber-50 text-amber-800",
        }
      : { label: "Auto", cls: "border-neutral-300 bg-neutral-50 text-neutral-500" };

  return (
    <div className="border border-neutral-300 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-700">
          <Crosshair className="h-3.5 w-3.5" />
          Cover focal point
          {saving && <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 ${badge.cls}`}>
            {framed && <Lock className="h-3 w-3" />}
            {badge.label}
          </span>
          {hasFocal && !framed && (
            <button
              type="button"
              onClick={() => {
                setWarn(null);
                void commit(null, null);
              }}
              className="inline-flex items-center gap-1 border border-neutral-300 px-2 py-0.5 hover:bg-neutral-50"
              title="Clear focal — fall back to auto centering"
            >
              <X className="h-3 w-3" /> Reset to auto
            </button>
          )}
        </div>
      </div>

      {framed && (
        <div className="px-3 py-2 text-[11px] text-sky-800 bg-sky-50/60 border-b border-sky-100">
          This cover is baked by Frame Studio — the live tile renders the framed
          derivative and never reads a focal point. Change the framing in Frame Studio.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 p-3">
        {/* Click stage */}
        <div
          ref={stageRef}
          onClick={onClick}
          className={`relative w-full select-none border border-neutral-200 ${
            framed ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
          }`}
          style={{ height: 260, backgroundColor: "#fff" }}
          title={
            framed
              ? "Focal is disabled on Frame Studio covers"
              : "Click the photo to set the focal point"
          }
        >
          <img
            src={coverUrl}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            className="absolute inset-0 h-full w-full object-contain"
          />
          {/* Photo bounds — makes the letterbox visible so it's obvious what
              part of this box is actually the picture. */}
          <div
            aria-hidden
            className="pointer-events-none absolute border border-dashed border-neutral-300"
            style={{
              left: `${c.left * 100}%`,
              top: `${c.top * 100}%`,
              width: `${c.w * 100}%`,
              height: `${c.h * 100}%`,
            }}
          />
          {/* Frame center reference (faint cross) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-300/40" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-300/40" />
          </div>
          {/* Dot */}
          {hasFocal && (
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: `${dotLeft}%`,
                top: `${dotTop}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] bg-emerald-500" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-6 bg-white/80 mix-blend-difference" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-white/80 mix-blend-difference" />
            </div>
          )}
        </div>

        {/* Live tile preview — production component, production fit rule. */}
        <div>
          <div
            className="relative w-full overflow-hidden bg-white border border-neutral-200"
            style={{ aspectRatio: PREVIEW_ASPECT }}
          >
            <NormalizedProductImage
              src={coverFramedUrl ?? coverUrl}
              frameAspect={PREVIEW_ASPECT}
              fit={fitRule}
              eager
              focalX={framed ? null : x}
              focalY={framed ? null : y}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500">
            Live tile preview
          </p>
        </div>
      </div>

      {warn && (
        <div className="flex items-start gap-2 px-3 py-2 text-[11px] text-amber-800 bg-amber-50 border-t border-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warn}</span>
        </div>
      )}
      {err && (
        <div className="px-3 py-2 text-[11px] text-red-600 border-t border-neutral-200">{err}</div>
      )}
      <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-500 border-t border-neutral-200">
        Click the cover to anchor the visual center. Size is always solved automatically —
        focal only shifts the framing.
        {lastEdit && ` · Last changed ${new Date(lastEdit).toLocaleString()}`}
      </p>
    </div>
  );
}
