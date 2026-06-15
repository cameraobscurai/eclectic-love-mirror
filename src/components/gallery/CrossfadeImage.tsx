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
  /**
   * Fires `true` the moment a new srcKey starts decoding, then `false`
   * the moment the bitmap is ready to paint (before the opacity fade).
   * Lets the parent freeze parallax/motion only across the perceptible
   * decode window, not the entire 320ms cosmetic fade.
   */
  onLoadingChange?: (loading: boolean) => void;
}

export function CrossfadeImage({
  srcKey,
  src,
  srcSet,
  sizes,
  alt,
  onLoadingChange,
}: Props) {
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
    onLoadingChange?.(true);

    const img = new Image();
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    img.src = src;
    img.decoding = "async";

    const finalize = () => {
      if (token !== tokenRef.current) return;
      // Bitmap is ready — release the parent's motion freeze immediately.
      // The cosmetic opacity fade that follows is compositor-only and both
      // layers (current + next) live inside the same translated wrapper,
      // so resuming parallax mid-fade looks correct.
      onLoadingChange?.(false);
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
  }, [srcKey, src, srcSet, sizes, alt, current.srcKey, onLoadingChange]);

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
