// ---------------------------------------------------------------------------
// HeroDisplacement
//
// WebGL whisper-displacement layer for the home hero. Renders a single
// full-bleed quad textured with the hero image; a fragment shader warps the
// pixels around the cursor with an exponentially-eased influence value.
//
// Performance contract:
//   - rAF loop only spins while pointer influence is meaningfully > 0.
//   - DPR clamped to 2 to protect retina laptops with weak GPUs.
//   - Pauses entirely on `visibilitychange` (background tabs render nothing).
//   - SSR-safe: all WebGL setup lives inside useEffect; ogl is imported
//     lazily so the module graph stays clean for the server bundle.
//
// Fallback: if the consumer renders <HeroDisplacement /> without WebGL2
// support (or the hero image fails to load), it stays invisible and `onReady`
// never fires — so the parent's static <img> fallback remains visible. No
// flash, no layout shift.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";

interface HeroDisplacementProps {
  src: string;
  className?: string;
  /**
   * Fired only after the texture is on the GPU AND the first frame has been
   * drawn (Claude note #3 — img.onload alone would cause a one-frame flash
   * before the texture upload completes).
   */
  onReady?: () => void;
}

export function HeroDisplacement({ src, className, onReady }: HeroDisplacementProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      // Lazy import keeps `ogl` out of the SSR module graph.
      const { Renderer, Program, Mesh, Triangle, Texture } = await import("ogl");
      if (cancelled || !mountRef.current) return;

      const { VERT, FRAG } = await import("./hero-displacement.glsl");
      if (cancelled || !mountRef.current) return;

      // ---------- Renderer ----------
      let renderer: InstanceType<typeof Renderer>;
      try {
        renderer = new Renderer({
          alpha: true,
          antialias: false, // displacement masks aliasing; saves fillrate
          dpr: Math.min(window.devicePixelRatio || 1, 2),
          webgl: 2,
        });
      } catch {
        return; // no WebGL2 — parent's static img stays visible
      }
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.pointerEvents = "none";
      mount.appendChild(canvas);

      // ---------- Geometry: full-screen triangle ----------
      const geometry = new Triangle(gl);

      // ---------- Texture (loaded async; placeholder until ready) ----------
      const texture = new Texture(gl, {
        generateMipmaps: false,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
      });

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTexture: { value: texture },
          uPointer: { value: [0.5, 0.5] },
          uInfluence: { value: 0 },
          uAspect: { value: 1 },
          uRadius: { value: 0.22 },
          uStrength: { value: 0.012 }, // ~6px on a 500px-wide region
          uTexAspect: { value: [1, 1] },
          uTime: { value: 0 },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });

      // ---------- Resize / aspect ----------
      const resize = () => {
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        renderer.setSize(w, h);
        program.uniforms.uAspect.value = w / h;

        // cover-fit: scale UVs so the image fills without stretching
        const img = imgEl;
        if (img && img.naturalWidth > 0) {
          const canvasAspect = w / h;
          const imgAspect = img.naturalWidth / img.naturalHeight;
          if (imgAspect > canvasAspect) {
            // image wider — squeeze x
            program.uniforms.uTexAspect.value = [canvasAspect / imgAspect, 1];
          } else {
            program.uniforms.uTexAspect.value = [1, imgAspect / canvasAspect];
          }
        }
      };

      // ---------- Pointer (listen on the parent <section>) ----------
      const section = mount.parentElement;
      const pointer = { tx: 0.5, ty: 0.5, hovering: false };

      const onMove = (e: PointerEvent) => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        pointer.tx = (e.clientX - rect.left) / rect.width;
        pointer.ty = 1 - (e.clientY - rect.top) / rect.height; // GL y-up
        pointer.hovering = true;
        ensureRunning();
      };
      const onLeave = () => {
        pointer.hovering = false;
      };

      section?.addEventListener("pointermove", onMove, { passive: true });
      section?.addEventListener("pointerleave", onLeave);

      // ---------- Render loop ----------
      let raf = 0;
      let running = false;
      let influence = 0;
      let smoothPx = 0.5;
      let smoothPy = 0.5;
      let firstFramePainted = false;
      let textureReady = false;
      const startTime = performance.now();

      const tick = () => {
        // Asymmetric easing — fast attack, slow decay (Claude note #1).
        const target = pointer.hovering ? 1 : 0;
        const lerp = pointer.hovering ? 0.12 : 0.04;
        influence += (target - influence) * lerp;

        // Smooth pointer position itself so the warp doesn't snap.
        smoothPx += (pointer.tx - smoothPx) * 0.18;
        smoothPy += (pointer.ty - smoothPy) * 0.18;

        program.uniforms.uInfluence.value = influence;
        program.uniforms.uPointer.value = [smoothPx, smoothPy];
        program.uniforms.uTime.value = (performance.now() - startTime) * 0.001;

        renderer.render({ scene: mesh });

        if (!firstFramePainted && textureReady) {
          firstFramePainted = true;
          onReadyRef.current?.();
        }

        // Stop the loop once we've fully relaxed back to rest, AND we've
        // already fired onReady (so the first paint always happens).
        if (!pointer.hovering && influence < 0.001 && firstFramePainted) {
          running = false;
          influence = 0;
          program.uniforms.uInfluence.value = 0;
          renderer.render({ scene: mesh });
          return;
        }

        raf = requestAnimationFrame(tick);
      };

      const ensureRunning = () => {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(tick);
      };

      // ---------- Visibility pause ----------
      const onVis = () => {
        if (document.hidden) {
          if (raf) cancelAnimationFrame(raf);
          running = false;
        } else if (pointer.hovering || influence > 0.001) {
          ensureRunning();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      // ---------- Resize observer ----------
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      // ---------- Image load ----------
      const imgEl = new Image();
      imgEl.crossOrigin = "anonymous";
      imgEl.decoding = "async";
      imgEl.onload = async () => {
        if (cancelled) return;
        try {
          if ("decode" in imgEl) await imgEl.decode().catch(() => {});
        } catch {
          /* ignore */
        }
        texture.image = imgEl;
        // Force GPU upload this frame, then schedule the first render.
        texture.update();
        textureReady = true;
        resize();
        ensureRunning(); // first paint cycle — onReady fires inside tick()
      };
      imgEl.onerror = () => {
        // Swallow — parent's static <img> stays visible.
      };
      imgEl.src = src;

      resize();

      cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        section?.removeEventListener("pointermove", onMove);
        section?.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVis);
        ro.disconnect();
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          /* ignore */
        }
        if (canvas.parentElement === mount) mount.removeChild(canvas);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [src]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
