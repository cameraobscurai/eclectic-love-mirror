import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GalleryProject } from "@/content/gallery-projects";

interface GalleryMapProps {
  projects: GalleryProject[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onOpen?: (index: number) => void;
}

const MAPBOX_TOKEN =
  (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) ||
  "pk.eyJ1Ijoib2JzY3VyYWNyZWF0aXZlIiwiYSI6ImNtb3A4ODBvbzBrNHIycnB6cWNkNTFxYmwifQ.GyNKdyqX6pnfsV9Yyb8C2w";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

// Canvas darkening applied directly to the element after load
const CANVAS_FILTER = "brightness(0.82) contrast(1.18) saturate(0.75)";

// Popup CSS injected once
const POPUP_CSS = `
  .eh-gallery-popup .mapboxgl-popup-content {
    background: rgba(10,10,12,0.90);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(245,242,237,0.10);
    border-radius: 3px;
    padding: 6px 11px;
    font-family: var(--font-sans, system-ui, sans-serif);
    font-size: 9px;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: rgba(245,242,237,0.82);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  }
  .eh-gallery-popup .mapboxgl-popup-tip { display: none; }
  /* Map container: never intercept vertical scroll */
  .eh-map { overscroll-behavior: none; touch-action: pan-y; }
`;

let popupStyleInjected = false;
function injectPopupStyle() {
  if (popupStyleInjected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.textContent = POPUP_CSS;
  document.head.appendChild(tag);
  popupStyleInjected = true;
}

export function GalleryMap({
  projects,
  activeIndex,
  onSelect,
  onOpen,
}: GalleryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const rafRef = useRef<number>(0);
  const userInteractingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const bounds = useMemo(() => {
    if (projects.length === 0) return null;
    const b = new mapboxgl.LngLatBounds();
    projects.forEach((p) => b.extend(p.coords));
    return b;
  }, [projects]);

  // ── Map init ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Mobile guard — no Mapbox at ≤768px (hidden via CSS anyway)
    if (typeof window !== "undefined" && window.innerWidth <= 768) return;
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    injectPopupStyle();
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapOptions: Record<string, unknown> = {
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-104, 39.5] as [number, number],
      zoom: 3.2,
      minZoom: 1.8,
      maxZoom: 7,
      // No scroll zoom — critical: prevents map from swallowing scroll events
      scrollZoom: false,
      // No drag rotate — keep it flat/simple
      dragRotate: false,
      pitchWithRotate: false,
      // No cooperative gestures — they intercept vertical scroll
      // attributionControl handled manually
      attributionControl: false,
      // Globe projection
      projection: "globe",
    };

    const map = new mapboxgl.Map(mapOptions as mapboxgl.MapboxOptions);

    // Compact attribution only (required by ToS)
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    // NO NavigationControl — no zoom buttons

    map.on("load", () => {
      const style = map.getStyle();
      const layers = style?.layers ?? [];

      // Kill ALL symbol layers (city names, country labels, road labels…)
      for (const layer of layers) {
        if (layer.type === "symbol") {
          try {
            map.setLayoutProperty(layer.id, "visibility", "none");
          } catch { /* skip */ }
        }
      }

      // Style land/water
      try { map.setPaintProperty("land", "fill-color", "#101012"); } catch { /* skip */ }
      try { map.setPaintProperty("water", "fill-color", "#0c0c0e"); } catch { /* skip */ }

      // Style admin boundary lines (wireframe look)
      for (const layer of layers) {
        if (layer.type !== "line") continue;
        const id = layer.id;
        if (!id.includes("admin")) continue;
        try {
          const isCountry =
            id.includes("admin-0") ||
            id.includes("country") ||
            (!id.includes("admin-1") && !id.includes("state"));
          map.setPaintProperty(
            id,
            "line-color",
            isCountry
              ? "rgba(245,242,237,0.28)"
              : "rgba(245,242,237,0.12)"
          );
          map.setPaintProperty(id, "line-width", isCountry ? 0.8 : 0.4);
          map.setPaintProperty(id, "line-opacity", 1);
          map.setLayoutProperty(id, "visibility", "visible");
        } catch { /* skip */ }
      }

      // Globe atmosphere (only applied if globe projection is active)
      try {
        (map as any).setFog({
          color: "rgba(13,13,13,0)",
          "high-color": "rgba(15,18,28,0.88)",
          "horizon-blend": 0.05,
          "space-color": "#04040a",
          "star-intensity": 0.0,
        });
      } catch { /* setFog not available in this GL version — skip */ }

      // Darken canvas
      const canvas = map.getCanvas();
      canvas.style.filter = CANVAS_FILTER;

      setReady(true);
    });

    // Slow auto-rotation for globe (no-op on flat projection)
    const startRotation = () => {
      if (userInteractingRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (!userInteractingRef.current && mapRef.current) {
          const c = map.getCenter();
          map.setCenter([c.lng - 0.06, c.lat]);
        }
        startRotation();
      });
    };

    const stopRotation = () => {
      userInteractingRef.current = true;
      cancelAnimationFrame(rafRef.current);
    };

    const resumeRotation = () => {
      userInteractingRef.current = false;
      setTimeout(startRotation, 2200);
    };

    map.on("mousedown", stopRotation);
    map.on("touchstart", stopRotation);
    map.on("mouseup", resumeRotation);
    map.on("touchend", resumeRotation);
    map.once("idle", () => setTimeout(startRotation, 900));

    // ResizeObserver keeps map sized to its container
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Markers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    projects.forEach((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${p.name}, ${p.location}`);
      el.style.cssText = `
        width: 12px;
        height: 12px;
        padding: 0;
        border-radius: 50%;
        background: rgba(245,242,237,0.15);
        border: 1.5px solid rgba(245,242,237,0.62);
        cursor: pointer;
        transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        outline: none;
      `;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.55)";
        el.style.background = "rgba(245,242,237,0.38)";
        setHoverIdx(i);
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.background = "rgba(245,242,237,0.15)";
        setHoverIdx((cur) => (cur === i ? null : cur));
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(i);
        if (onOpen) onOpen(i);
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 16,
        className: "eh-gallery-popup",
      }).setHTML(
        `<span>${p.number.toString().padStart(2, "0")} · ${p.name}</span>`
      );

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(p.coords)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 44, bottom: 36, left: 36, right: 36 },
        maxZoom: 5.5,
        duration: 700,
      });
    }
  }, [projects, ready, bounds, onSelect, onOpen]);

  // ── Active marker highlight ──────────────────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      const el = m.getElement();
      const isActive = i === activeIndex;
      const isHover = i === hoverIdx;
      if (isActive) {
        el.style.boxShadow = "0 0 0 5px rgba(245,242,237,0.16)";
        el.style.background = "rgba(245,242,237,0.48)";
        el.style.borderColor = "rgba(245,242,237,0.85)";
      } else if (!isHover) {
        el.style.boxShadow = "none";
        el.style.background = "rgba(245,242,237,0.15)";
        el.style.borderColor = "rgba(245,242,237,0.62)";
      }
    });
  }, [activeIndex, hoverIdx]);

  // ── Pan to active ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const p = projects[activeIndex];
    if (!p) return;
    map.easeTo({ center: p.coords, duration: 650 });
  }, [activeIndex, ready, projects]);

  // ── No token fallback ────────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "9px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,242,237,0.28)",
          }}
        >
          Add VITE_MAPBOX_PUBLIC_TOKEN
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="eh-map"
      style={{ width: "100%", height: "100%" }}
      role="region"
      aria-label="Map of Eclectic Hive project locations"
    />
  );
}
