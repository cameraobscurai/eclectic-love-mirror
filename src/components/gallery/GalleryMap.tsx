import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMap
//
// Editorial Mapbox map for the gallery masthead. Always fills its parent —
// the parent (the glass panel) controls all sizing via CSS Grid / clamp().
// This component never sets explicit pixel heights.
//
// • Dark Mapbox style with a per-instance canvas filter applied on `load`
//   (scoped to this map only — no global CSS rule that bleeds to other maps).
// • Markers are inline-styled DOM elements built in JS — no external CSS
//   dependency, no global class collisions.
// • Popup uses a namespaced className (`eh-gallery-popup`) for any optional
//   styling without polluting the global mapbox popup class.
// ---------------------------------------------------------------------------

interface GalleryMapProps {
  projects: GalleryProject[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onOpen?: (index: number) => void;
}

// Public Mapbox token. Public tokens (pk.*) are designed to ship in client
// code; lock down origins in the Mapbox account dashboard for protection.
const MAPBOX_TOKEN =
  (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) ||
  "pk.eyJ1Ijoib2JzY3VyYWNyZWF0aXZlIiwiYSI6ImNtb3A4ODBvbzBrNHIycnB6cWNkNTFxYmwifQ.GyNKdyqX6pnfsV9Yyb8C2w";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const CANVAS_FILTER = "brightness(0.75) contrast(1.15) saturate(0.8)";

export function GalleryMap({
  projects,
  activeIndex,
  onSelect,
  onOpen,
}: GalleryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Bounds that fit every pin with quiet padding.
  const bounds = useMemo(() => {
    if (projects.length === 0) return null;
    const b = new mapboxgl.LngLatBounds();
    projects.forEach((p) => b.extend(p.coords));
    return b;
  }, [projects]);

  // Boot the map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-104, 39.5],
      zoom: 3.4,
      attributionControl: false,
      cooperativeGestures: true,
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    map.on("load", () => {
      // Scope the canvas filter to THIS map's canvas element only.
      // No global CSS — won't affect any other Mapbox instance on the page.
      const canvas = map.getCanvas();
      canvas.style.filter = CANVAS_FILTER;
      setReady(true);
    });
    mapRef.current = map;

    // The map's parent uses Grid + clamp() and may resolve from 0 → real
    // height after layout. Mapbox needs an explicit resize when that happens.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Place / refresh markers when projects or readiness changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear existing.
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    projects.forEach((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${p.name}, ${p.location}`);
      el.dataset.idx = String(i);
      el.style.cssText = `
        width: 12px;
        height: 12px;
        padding: 0;
        border-radius: 50%;
        background: rgba(245,242,237,0.15);
        border: 1.5px solid rgba(245,242,237,0.6);
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      `;
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.5)";
        el.style.background = "rgba(245,242,237,0.35)";
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
        `<span style="font-family:'Inter',system-ui,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#1a1a1a;">${p.number} · ${p.name}</span>`
      );

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(p.coords)
        .setPopup(popup)
        .addTo(map);
      markerRefs.current.push(marker);
    });

    // Fit to all pins.
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 40, bottom: 30, left: 30, right: 30 },
        duration: 600,
        maxZoom: 6,
      });
    }
  }, [projects, ready, bounds, onSelect, onOpen]);

  // Highlight the active pin (subtle ring boost).
  useEffect(() => {
    markerRefs.current.forEach((m, i) => {
      const el = m.getElement();
      if (i === activeIndex) {
        el.style.boxShadow = "0 0 0 4px rgba(245,242,237,0.18)";
        el.style.background = "rgba(245,242,237,0.45)";
      } else if (i !== hoverIdx) {
        el.style.boxShadow = "none";
        el.style.background = "rgba(245,242,237,0.15)";
      }
    });
  }, [activeIndex, hoverIdx]);

  // Pan to active pin when it changes externally.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const p = projects[activeIndex];
    if (!p) return;
    map.easeTo({ center: p.coords, duration: 700 });
  }, [activeIndex, ready, projects]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="border border-cream/15 bg-charcoal/40 px-5 py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
          Reach
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-cream/65">
          Add a Mapbox public token as{" "}
          <code className="text-cream/85">VITE_MAPBOX_PUBLIC_TOKEN</code> to
          see pins.
        </p>
      </div>
    );
  }

  // The map ALWAYS fills its parent. The parent controls sizing.
  return (
    <div
      ref={containerRef}
      className="eh-map relative w-full h-full overflow-hidden"
      role="region"
      aria-label="Map of Eclectic Hive project locations"
    />
  );
}
