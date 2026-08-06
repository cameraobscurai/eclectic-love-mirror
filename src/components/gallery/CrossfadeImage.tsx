import { useEffect, useRef, useState } from "react";

interface CrossfadeImageProps {
  src: string;
  className?: string;
  /** Fade duration in ms. Kept at/below the 200ms UI-feedback ceiling. */
  duration?: number;
}

/**
 * Holds the previous image mounted until the incoming one has decoded, then
 * crossfades. Without this, swapping `key`/`src` on hover hard-cuts to a
 * half-loaded JPEG and strobes on fast pointer travel across the index rows.
 *
 * Opacity-only. Respects reduced motion by collapsing to an instant swap.
 */
export function CrossfadeImage({ src, className = "", duration = 150 }: CrossfadeImageProps) {
  const [layers, setLayers] = useState<string[]>([src]);
  const current = useRef(src);

  useEffect(() => {
    if (src === current.current) return;
    let cancelled = false;
    const incoming = new Image();
    incoming.src = src;

    const commit = () => {
      if (cancelled) return;
      const prev = current.current;
      current.current = src;
      setLayers([prev, src]);
      // Drop the outgoing layer once the fade has finished.
      window.setTimeout(() => {
        if (!cancelled) setLayers([src]);
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
  }, [src, duration]);

  return (
    <>
      {layers.map((layer, i) => {
        const isIncoming = layers.length > 1 && i === 1;
        return (
          <img
            key={layer}
            src={layer}
            alt=""
            draggable={false}
            className={`${className} motion-reduce:transition-none`}
            style={{
              opacity: isIncoming ? 1 : layers.length > 1 ? 0 : 1,
              transition: `opacity ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`,
              animation: isIncoming ? `crossfade-in ${duration}ms cubic-bezier(0.32,0.72,0,1)` : undefined,
            }}
          />
        );
      })}
    </>
  );
}
