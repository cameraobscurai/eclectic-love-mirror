import { useEffect, useMemo, useState } from "react";
import { delayRender, continueRender } from "remotion";
import * as THREE from "three";

// Module-level texture cache, shared across all calls in a single render process.
const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

// Remotion-aware texture loader. Holds the frame back via delayRender() until
// the texture is decoded, then continues. Subsequent uses of the same URL
// reuse the cached texture (no delayRender needed).
export function useRemotionTexture(url: string): THREE.Texture | null {
  const cached = useMemo(() => cache.get(url) ?? null, [url]);
  const [tex, setTex] = useState<THREE.Texture | null>(cached);

  useEffect(() => {
    if (cached) return;
    const handle = delayRender(`tex:${url}`, { timeoutInMilliseconds: 30000 });
    let cancelled = false;
    loader.load(
      url,
      (t) => {
        if (cancelled) return;
        t.colorSpace = THREE.SRGBColorSpace;
        cache.set(url, t);
        setTex(t);
        continueRender(handle);
      },
      undefined,
      (err) => {
        console.error("texture load failed:", url, err);
        continueRender(handle);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url, cached]);

  return tex;
}
