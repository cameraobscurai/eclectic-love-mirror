import { useEffect, useRef, useState } from "react";
import { delayRender, continueRender } from "remotion";
import * as THREE from "three";

// Module-level cache + loader, shared across the entire render process.
const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

// Remotion-aware texture loader.
//
// delayRender() MUST be called synchronously during the React render phase
// (before useEffect runs), otherwise Remotion has already captured the frame
// by the time the handle is registered. We use useRef to hold the handle and
// only fire delayRender once per component instance per uncached URL.
export function useRemotionTexture(url: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() => cache.get(url) ?? null);
  const handleRef = useRef<number | null>(null);

  // Synchronously claim a delayRender handle on first render if uncached.
  if (handleRef.current === null && !cache.has(url)) {
    handleRef.current = delayRender(`tex:${url}`, { timeoutInMilliseconds: 60000 });
  }

  useEffect(() => {
    const cached = cache.get(url);
    if (cached) {
      setTex(cached);
      if (handleRef.current !== null) {
        continueRender(handleRef.current);
        handleRef.current = null;
      }
      return;
    }
    let cancelled = false;
    loader.load(
      url,
      (t) => {
        if (cancelled) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        cache.set(url, t);
        setTex(t);
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      },
      undefined,
      (err) => {
        console.error("texture load failed:", url, err);
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return tex;
}
