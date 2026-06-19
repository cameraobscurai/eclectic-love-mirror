// Pre-loads all required textures into a module-level cache using delayRender
// so that components can read them synchronously without Suspense.
import { delayRender, continueRender, staticFile } from "remotion";
import * as THREE from "three";
import manifest from "../v11-manifest.json";

const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

// All URLs we'll need across the whole composition.
function allUrls(): string[] {
  const urls: string[] = [];
  // Tiles
  const tiles = (manifest.tiles as Array<{ file: string }>).slice(0, 84);
  for (const t of tiles) urls.push(staticFile(t.file));
  // Home posters
  for (const [_, v] of Object.entries(manifest.home as Record<string, string>)) urls.push(staticFile(v));
  // Atelier
  for (const [_, v] of Object.entries(manifest.atelier as Record<string, string>)) urls.push(staticFile(v));
  return urls;
}

function loadOne(url: string): Promise<void> {
  if (cache.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        cache.set(url, t);
        resolve();
      },
      undefined,
      (err) => {
        console.error("preload fail:", url, err);
        resolve();
      }
    );
  });
}

// Singleton: one global promise that resolves when all textures are loaded.
let warming: Promise<void> | null = null;
function warmAll(): Promise<void> {
  if (warming) return warming;
  warming = Promise.all(allUrls().map(loadOne)).then(() => undefined);
  return warming;
}

// Module-level: register a delayRender that resolves when textures are warm.
// This runs on first import, before any component renders.
const warmHandle = delayRender("warming texture cache", { timeoutInMilliseconds: 120000 });
warmAll().then(() => continueRender(warmHandle));

// Synchronous lookup — safe to call from render because preload guarantees the cache is filled.
export function getTexture(url: string): THREE.Texture | null {
  return cache.get(url) ?? null;
}
