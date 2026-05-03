// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { imagetools } from "vite-imagetools";

// vite-imagetools: drop one source image into src/assets/, append a query string,
// and the build emits AVIF/WebP/responsive widths automatically.
//
// Usage:
//   import hero from "@/assets/home-hero.jpg?preset=hero";
//   // → returns { sources: { avif: "...", webp: "..." }, img: { src, w, h } }
//
// Presets keep call-sites short and consistent. Add new ones here, never inline.
export default defineConfig({
  vite: {
    plugins: [
      imagetools({
        defaultDirectives: (url) => {
          // Allow per-import overrides via ?preset=...
          const preset = url.searchParams.get("preset");
          const params = new URLSearchParams();
          if (preset === "hero") {
            // Full-bleed hero: 768/1280/1920/2560 widths, AVIF + WebP, picture metadata.
            params.set("w", "768;1280;1920;2560");
            params.set("format", "avif;webp");
            params.set("as", "picture");
            // High visual quality; the format step still compresses heavily.
            params.set("quality", "78");
          } else if (preset === "hero-lqip") {
            // Tiny blurred placeholder — inlined as base64 data URL.
            params.set("w", "24");
            params.set("format", "webp");
            params.set("quality", "40");
            params.set("as", "metadata");
          }
          return params;
        },
      }),
    ],
  },
});
