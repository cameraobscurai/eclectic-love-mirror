import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setCoverFocal } from "@/lib/inventory-images.functions";
import { invalidateCollectionCatalog } from "@/lib/phase3-catalog";
import { NormalizedProductImage } from "@/components/collection/NormalizedProductImage";
import { resolveProductFit } from "@/components/collection/productFit";

type Props = {
  id: string;
  coverUrl: string;
  /** Initial focal — null means unset (auto). */
  initialX: number | null;
  initialY: number | null;
  /** Fit inputs so the preview renders the real production rule. */
  categorySlug?: string | null;
  dimensions?: string | null;
  onSaved?: (next: { x: number | null; y: number | null }) => void;
};

const PREVIEW_ASPECT = 5 / 4;

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
 * The tile preview on the right runs the identical production component and
 * fit rule, so what you see here is what ships.
 */
export function FocalEditor({
  id,
  coverUrl,
  initialX,
  initialY,
  categorySlug = null,
  dimensions = null,
  onSaved,
}: Props) {
  const [x, setX] = useState<number | null>(initialX);
  const [y, setY] = useState<number | null>(initialY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const save = useServerFn(setCoverFocal);

  const fitRule = resolveProductFit({ categorySlug, dimensions });

  // Re-pull on mount in case another editor wrote it.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("cover_focal_x, cover_focal_y")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setX(data.cover_focal_x as number | null);
        setY(data.cover_focal_y as number | null);
      }
    })();
  }, [id]);

  // Reset measurement when the cover changes — a new photo has a new letterbox.
  useEffect(() => {
    setNatural(null);
  }, [coverUrl]);

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
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width;
    const sy = (e.clientY - rect.top) / rect.height;
    const c = contentRect();
    // Stage space → photo space, clamped so a click in the letterbox lands on
    // the nearest edge of the picture instead of off the picture entirely.
    const nx = (sx - c.left) / c.w;
    const ny = (sy - c.top) / c.h;
    void commit(
      Math.max(0, Math.min(1, Number(nx.toFixed(3)))),
      Math.max(0, Math.min(1, Number(ny.toFixed(3)))),
    );
  };

  const hasFocal = x !== null && y !== null;
  const c = contentRect();
  // Photo space → stage space, for drawing the dot back where it was clicked.
  const dotLeft = hasFocal ? (c.left + x! * c.w) * 100 : 0;
  const dotTop = hasFocal ? (c.top + y! * c.h) * 100 : 0;

  return (
    <div className="border border-neutral-300 bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-700">
          <Crosshair className="h-3.5 w-3.5" />
          Cover focal point
          {saving && <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
          {hasFocal ? (
            <span className="text-neutral-500">
              {(x! * 100).toFixed(0)}% · {(y! * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-neutral-400">auto</span>
          )}
          {hasFocal && (
            <button
              type="button"
              onClick={() => void commit(null, null)}
              className="inline-flex items-center gap-1 border border-neutral-300 px-2 py-0.5 hover:bg-neutral-50"
              title="Clear focal — fall back to auto centering"
            >
              <X className="h-3 w-3" /> Reset to auto
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 p-3">
        {/* Click stage */}
        <div
          ref={stageRef}
          onClick={onClick}
          className="relative w-full cursor-crosshair select-none border border-neutral-200"
          style={{ height: 260, backgroundColor: "#fff" }}
          title="Click the photo to set the focal point"
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
              src={coverUrl}
              frameAspect={PREVIEW_ASPECT}
              fit={fitRule}
              eager
              focalX={x}
              focalY={y}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500">
            Live tile preview
          </p>
        </div>
      </div>

      {err && (
        <div className="px-3 py-2 text-[11px] text-red-600 border-t border-neutral-200">{err}</div>
      )}
      <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-500 border-t border-neutral-200">
        Click the cover to anchor the visual center. Size is always solved automatically —
        focal only shifts the framing.
      </p>
    </div>
  );
}
