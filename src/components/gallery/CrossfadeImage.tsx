import { useEffect, useRef, useState } from "react";

/**
 * CrossfadeImage
 * --------------
 * Holds the previous frame painted underneath while the next image
 * decodes. Once the new bitmap is ready it fades in over ~280ms — no
 * flash-of-empty-container while the network round-trips, no jarring
 * pop-in. Uses Image.decode() so paint happens off the critical path.
 */
interface Props {
  srcKey: string;
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
}

export function CrossfadeImage({ srcKey, src, srcSet, sizes, alt }: Props) {
  // current = what's painted right now. next = what we're loading.
  const [current, setCurrent] = useState({ srcKey, src, srcSet, sizes, alt });
  const [next, setNext] = useState<typeof current | null>(null);
  const [nextReady, setNextReady] = useState(false);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (srcKey === current.srcKey) return;
    const token = ++tokenRef.current;
    const incoming = { srcKey, src, srcSet, sizes, alt };
    setNext(incoming);
    setNextReady(false);

    const img = new Image();
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    img.src = src;
    img.decoding = "async";

    const finalize = () => {
      if (token !== tokenRef.current) return;
      // Trigger the next-layer fade-in, then promote it.
      setNextReady(true);
      window.setTimeout(() => {
        if (token !== tokenRef.current) return;
        setCurrent(incoming);
        setNext(null);
        setNextReady(false);
      }, 320);
    };

    img.decode().then(finalize).catch(() => {
      // Decode can reject on some platforms; fall back to onload/error.
      if (img.complete) finalize();
      else {
        img.onload = finalize;
        img.onerror = finalize;
      }
    });
  }, [srcKey, src, srcSet, sizes, alt, current.srcKey]);

  return (
    <>
      <img
        src={current.src}
        srcSet={current.srcSet}
        sizes={current.sizes}
        alt={current.alt}
        decoding="async"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      {next && (
        <img
          src={next.src}
          srcSet={next.srcSet}
          sizes={next.sizes}
          alt={next.alt}
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ease-out"
          style={{ opacity: nextReady ? 1 : 0 }}
          draggable={false}
        />
      )}
    </>
  );
}
