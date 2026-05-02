import { useEffect, useRef, useState } from "react";

/**
 * Generic scroll-spy hook.
 *
 * Observes any element in the document tagged with `data-spy-section="<id>"`
 * and returns:
 *   - `activeId` — the section currently dominant in the viewport
 *   - `progressById` — Map<id, 0..1> of how far the viewport has scrolled
 *     through the union of tiles tagged with that id
 *   - `overallProgress` — 0..1 across the union of all tagged sections
 *
 * This hook is intentionally generic so the same pattern can drive nav
 * highlighting on any page: tag the elements, read the active id, render
 * the rail. No DOM coupling beyond the `data-spy-section` attribute.
 *
 * Performance: uses a single MutationObserver to re-discover sections when
 * the grid re-renders, plus a passive scroll listener throttled with
 * requestAnimationFrame. Cheap even with 800+ tiles tagged.
 */
export interface UseScrollSpyOptions {
  /**
   * Selector or ref scope to limit which elements are considered. Defaults to
   * `document` — pass a container ref to scope spy to that subtree.
   */
  scope?: HTMLElement | null;
  /**
   * Pixels from the top of the viewport that count as the spy "line".
   * Defaults to 33% of viewport height — feels like the eye's reading center
   * without being literally centered.
   */
  topOffset?: number;
  /**
   * Re-scan section elements when the dependency list changes. Use this when
   * the underlying list of tagged elements can change (filter / sort / load
   * more). Pass any value whose change should trigger a rescan.
   */
  watch?: unknown;
}

export interface UseScrollSpyResult {
  activeId: string | null;
  progressById: Map<string, number>;
  overallProgress: number;
  /** Scroll the first element of a section into view, smoothly. */
  scrollToSection: (id: string) => void;
}

interface SectionBounds {
  id: string;
  top: number;    // document-relative top of first tile
  bottom: number; // document-relative bottom of last tile
  firstEl: HTMLElement;
}

export function useScrollSpy({
  scope,
  topOffset,
  watch,
}: UseScrollSpyOptions = {}): UseScrollSpyResult {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progressById, setProgressById] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [overallProgress, setOverallProgress] = useState(0);

  const sectionsRef = useRef<SectionBounds[]>([]);
  const rafRef = useRef<number | null>(null);

  // Recompute section bounds (document-relative). Cheap because we only do it
  // on layout-relevant events, not per scroll frame.
  useEffect(() => {
    const root: ParentNode = scope ?? document;

    const recompute = () => {
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-spy-section]"),
      );

      // Group by section id and compute the bounding span (top of first tile,
      // bottom of last tile in document order — assumes DOM order matches
      // visual order, which it does for our archive grid).
      const byId = new Map<string, { firstEl: HTMLElement; top: number; bottom: number }>();
      for (const el of nodes) {
        const id = el.dataset.spySection;
        if (!id) continue;
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const bottom = rect.bottom + window.scrollY;
        const existing = byId.get(id);
        if (!existing) {
          byId.set(id, { firstEl: el, top, bottom });
        } else {
          if (top < existing.top) {
            existing.top = top;
            existing.firstEl = el;
          }
          if (bottom > existing.bottom) existing.bottom = bottom;
        }
      }

      sectionsRef.current = Array.from(byId.entries())
        .map(([id, b]) => ({ id, top: b.top, bottom: b.bottom, firstEl: b.firstEl }))
        .sort((a, b) => a.top - b.top);

      tick();
    };

    const tick = () => {
      const sections = sectionsRef.current;
      if (sections.length === 0) {
        setActiveId(null);
        setProgressById(new Map());
        setOverallProgress(0);
        return;
      }

      const line =
        window.scrollY + (topOffset ?? window.innerHeight * 0.33);

      const next = new Map<string, number>();
      let active: string | null = sections[0].id;

      for (const s of sections) {
        const span = Math.max(1, s.bottom - s.top);
        const raw = (line - s.top) / span;
        const p = Math.max(0, Math.min(1, raw));
        next.set(s.id, p);
        if (line >= s.top) active = s.id;
      }

      // Overall: union span of all sections
      const unionTop = sections[0].top;
      const unionBottom = sections[sections.length - 1].bottom;
      const unionSpan = Math.max(1, unionBottom - unionTop);
      const overall = Math.max(0, Math.min(1, (line - unionTop) / unionSpan));

      setActiveId(active);
      setProgressById(next);
      setOverallProgress(overall);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        tick();
      });
    };

    recompute();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);

    // Re-scan when grid mutates (Load More, filter change, sort).
    const mo = new MutationObserver(() => {
      // Debounce slightly — many DOM ops can land in one frame.
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        recompute();
      });
    });
    mo.observe((scope ?? document.body) as Node, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
      mo.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, topOffset, watch]);

  const scrollToSection = (id: string) => {
    const s = sectionsRef.current.find((x) => x.id === id);
    if (!s) return;
    const navOffset =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
      ) || 64;
    const utilityOffset = 80;
    window.scrollTo({
      top: s.top - navOffset - utilityOffset,
      behavior: "smooth",
    });
  };

  return { activeId, progressById, overallProgress, scrollToSection };
}
