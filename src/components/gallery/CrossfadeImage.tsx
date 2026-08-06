import { useEffect, useRef, useState } from "react";

interface CrossfadeImageProps {
  src: string;
  /** Identity of the image, when `src` itself is a derived/rendered URL. */
  srcKey?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  className?: string;
  /** Fade duration in ms. Kept at/below the 200ms UI-feedback ceiling. */
  duration?: number;
  /** Fires true while an incoming image is still decoding. */
  onLoadingChange?: (loading: boolean) => void;
}

interface Layer {
  key: string;
  src: string;
  srcSet?: string;
}

/**
 * Holds the previous image mounted until the incoming one has decoded, then
 * crossfades. Without this, swapping `key`/`src` on hover hard-cuts to a
 * half-loaded JPEG and strobes on fast pointer travel across the index rows.
 *
 * Opacity-only. Respects reduced motion by collapsing to an instant swap.
 */
export function CrossfadeImage({
  src,
  srcKey,
  srcSet,
  sizes,
  alt = "",
  className = "",
  duration = 150,
  onLoadingChange,
}: CrossfadeImageProps) {
  const identity = srcKey ?? src;
  const [layers, setLayers] = useState<Layer[]>([{ key: identity, src, srcSet }]);
  const current = useRef(identity);
  const loadingCb = useRef(onLoadingChange);
  loadingCb.current = onLoadingChange;

  useEffect(() => {
    if (identity === current.current) return;
    let cancelled = false;
    loadingCb.current?.(true);

    const incoming = new Image();
    if (srcSet) incoming.srcset = srcSet;
    if (sizes) incoming.sizes = sizes;
    incoming.src = src;

    const commit = () => {
      if (cancelled) return;
      const prev = layersRef.current[layersRef.current.length - 1];
      current.current = identity;
      const next: Layer = { key: identity, src, srcSet };
      setLayers(prev ? [prev, next] : [next]);
      loadingCb.current?.(false);
      // Drop the outgoing layer once the fade has finished.
      window.setTimeout(() => {
        if (!cancelled) setLayers([next]);
      }, duration + 40);
    };

    if (incoming.decode) {
      incoming.decode().then(commit).catch(commit);
    } else {
      incoming.onload = commit;
      incoming.onerror = commit;
    }

    return () => {
      cancelled = true;
    };
  }, [identity, src, srcSet, sizes, duration]);

  const layersRef = useRef(layers);
  layersRef.current = layers;

  return (
    <>
      {layers.map((layer, i) => {
        const isIncoming = layers.length > 1 && i === 1;
        return (
          <img
            key={layer.key}
            src={layer.src}
            srcSet={layer.srcSet || undefined}
            sizes={layer.srcSet ? sizes : undefined}
            alt={isIncoming || layers.length === 1 ? alt : ""}
            draggable={false}
            className={`${className} motion-reduce:transition-none`}
            style={{
              opacity: isIncoming ? 1 : layers.length > 1 ? 0 : 1,
              transition: `opacity ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`,
              animation: isIncoming
                ? `crossfade-in ${duration}ms cubic-bezier(0.32,0.72,0,1)`
                : undefined,
            }}
          />
        );
      })}
    </>
  );
}
