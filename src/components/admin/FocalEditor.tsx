import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setCoverFocal } from "@/lib/inventory-images.functions";
import { invalidateCollectionCatalog } from "@/lib/phase3-catalog";

type Props = {
  id: string;
  coverUrl: string;
  /** Initial focal — null means unset (auto). */
  initialX: number | null;
  initialY: number | null;
  onSaved?: (next: { x: number | null; y: number | null }) => void;
};

/**
 * Click anywhere on the cover preview to drop a focal-point dot. That point
 * becomes the visual center on Collection tiles, overriding silhouette
 * measurement. Clear to fall back to auto.
 */
export function FocalEditor({ id, coverUrl, initialX, initialY, onSaved }: Props) {
  const [x, setX] = useState<number | null>(initialX);
  const [y, setY] = useState<number | null>(initialY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const save = useServerFn(setCoverFocal);

  // Re-pull on mount in case another editor wrote it.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("cover_focal_x, cover_focal_y")
        .eq("id", id)
        .single();
      if (data) {
        setX(data.cover_focal_x as number | null);
        setY(data.cover_focal_y as number | null);
      }
    })();
  }, [id]);

  const commit = async (nx: number | null, ny: number | null) => {
    setSaving(true);
    setErr(null);
    try {
      await save({ data: { id, x: nx, y: ny } });
      setX(nx);
      setY(ny);
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
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    void commit(
      Math.max(0, Math.min(1, Number(nx.toFixed(3)))),
      Math.max(0, Math.min(1, Number(ny.toFixed(3)))),
    );
  };

  const hasFocal = x !== null && y !== null;

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
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        onClick={onClick}
        className="relative w-full max-h-[420px] cursor-crosshair select-none"
        style={{ aspectRatio: "5 / 4", backgroundColor: "#fff" }}
        title="Click to set the focal point"
      >
        <img
          src={coverUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
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
              left: `${x! * 100}%`,
              top: `${y! * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] bg-emerald-500" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-6 bg-white/80 mix-blend-difference" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-white/80 mix-blend-difference" />
          </div>
        )}
      </div>

      {err && (
        <div className="px-3 py-2 text-[11px] text-red-600 border-t border-neutral-200">{err}</div>
      )}
      <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-500 border-t border-neutral-200">
        Click the cover to anchor the visual center for Collection tiles.
      </p>
    </div>
  );
}
