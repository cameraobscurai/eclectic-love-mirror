import { useEffect, useState, type RefObject } from "react";

/**
 * Computes the on-screen coordinates of a specific point inside an <img>
 * rendered with `object-fit: cover`. Use this to anchor overlays to a
 * baked-in feature of an artwork (e.g. a glass band) regardless of viewport
 * size or `object-position` breakpoint changes.
 *
 * @param imgRef     ref to the rendered <img> element
 * @param xRatio     horizontal location of the target in the source image (0–1)
 * @param yRatio     vertical location of the target in the source image (0–1)
 * @returns          { x, y } in CSS pixels relative to the image element, or null
 */
export function useObjectCoverPoint(
  imgRef: RefObject<HTMLImageElement | null>,
  xRatio: number,
  yRatio: number
): { x: number; y: number } | null {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const parsePosition = (value: string): { ox: number; oy: number } => {
      // object-position can be: "50% 25%", "left top", "center", "10px 20px", etc.
      // Browsers normalize to "<x> <y>" with px or %. We handle % and keywords.
      const parts = value.trim().split(/\s+/);
      const toRatio = (token: string | undefined, axis: "x" | "y"): number => {
        if (!token) return 0.5;
        if (token.endsWith("%")) return parseFloat(token) / 100;
        if (token === "center") return 0.5;
        if (axis === "x") {
          if (token === "left") return 0;
          if (token === "right") return 1;
        } else {
          if (token === "top") return 0;
          if (token === "bottom") return 1;
        }
        // px or unsupported unit — fall back to center
        return 0.5;
      };
      return {
        ox: toRatio(parts[0], "x"),
        oy: toRatio(parts[1] ?? parts[0], "y"),
      };
    };

    const compute = () => {
      const el = imgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elW = rect.width;
      const elH = rect.height;
      const imgW = el.naturalWidth;
      const imgH = el.naturalHeight;
      if (!elW || !elH || !imgW || !imgH) return;

      const { ox, oy } = parsePosition(getComputedStyle(el).objectPosition);
      const scale = Math.max(elW / imgW, elH / imgH);
      const drawnW = imgW * scale;
      const drawnH = imgH * scale;
      const offsetX = (elW - drawnW) * ox;
      const offsetY = (elH - drawnH) * oy;
      const x = offsetX + xRatio * drawnW;
      const y = offsetY + yRatio * drawnH;
      setPoint({ x, y });
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(img);

    const onLoad = () => compute();
    const onResize = () => compute();
    img.addEventListener("load", onLoad);
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      img.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
    };
  }, [imgRef, xRatio, yRatio]);

  return point;
}
