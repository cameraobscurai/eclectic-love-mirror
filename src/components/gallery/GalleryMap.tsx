import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMap
//
// Editorial Mapbox map placed at the top of /gallery. Shows one cream pin
// per real project at its venue coordinates. Hovering / clicking a pin
// surfaces the project number + name; clicking jumps the cards track and
// (optionally) opens that project in the lightbox.
//
// Reads the public Mapbox token from `import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN`.
// Public Mapbox tokens (pk.*) are origin-restricted in the Mapbox account
// and safe to ship in client code.
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

// Editorial light style — Mapbox light base, lifts the canvas off pitch black
// while keeping it muted. Pins read as warm dots on warm grey.
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

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
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "top-right"
    );
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => {
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
      el.className = "eh-map-pin";
      el.innerHTML = `
        <span class="eh-map-pin__dot"></span>
        <span class="eh-map-pin__label">
          <span class="eh-map-pin__num">${p.number}</span>
          <span class="eh-map-pin__name">${p.name}</span>
        </span>
      `;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(i);
        if (onOpen) onOpen(i);
      });
      el.addEventListener("mouseenter", () => setHoverIdx(i));
      el.addEventListener("mouseleave", () =>
        setHoverIdx((cur) => (cur === i ? null : cur))
      );

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(p.coords)
        .addTo(map);
      markerRefs.current.push(marker);
    });

    // Fit to all pins.
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 60, left: 60, right: 60 },
        duration: 600,
        maxZoom: 6,
      });
    }
  }, [projects, ready, bounds, onSelect, onOpen]);

  // Highlight the active / hovered pin.
  useEffect(() => {
    markerRefs.current.forEach((m, i) => {
      const el = m.getElement();
      el.classList.toggle("is-active", i === activeIndex);
      el.classList.toggle("is-hover", i === hoverIdx);
    });
  }, [activeIndex, hoverIdx]);

  // Pan to active pin (without zooming way in) when it changes externally.
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

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3 mb-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
          Where We've Built
        </p>
        <p className="text-[10px] uppercase tracking-[0.28em] text-cream/40 tabular-nums">
          {projects.length.toString().padStart(2, "0")} Locations
        </p>
      </div>
      <div
        ref={containerRef}
        className="eh-map relative w-full overflow-hidden border border-cream/10"
        style={{ height: "clamp(220px, 22vw, 320px)" }}
        role="region"
        aria-label="Map of Eclectic Hive project locations"
      />
    </div>
  );
}
