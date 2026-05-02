import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";

interface CollectionIndexStripProps {
  /** Ordered group ids that have at least one piece in the catalog. One
   *  segment is rendered per id, in this order. */
  groups: BrowseGroupId[];
  /** Per-group fill: 0 = not yet entered, 1 = scrolled past. Driven by the
   *  scroll-spy hook on the parent. */
  progressById: Map<string, number>;
  /** Currently dominant group in the viewport — receives the active accent. */
  spyActiveGroup: BrowseGroupId | null;
  /** Click handler — jumps to the first tile of that group via the spy. */
  onJump: (id: BrowseGroupId) => void;
}

/**
 * Right-edge segmented progress rail.
 *
 * One thin vertical segment per category. Each segment fills (cream → charcoal)
 * as the viewport scrolls through the tiles tagged with that category. The
 * currently-dominant segment is slightly wider and shows its label on hover.
 *
 * Quiet by default, ambient — the rail is informational, not navigational
 * chrome. Click a segment to jump to that category's first tile.
 *
 * Desktop-only (`md:` and up). The rail is fixed to the right edge and
 * vertically centered.
 */
export function CollectionIndexStrip({
  groups,
  progressById,
  spyActiveGroup,
  onJump,
}: CollectionIndexStripProps) {
  const [hoveredId, setHoveredId] = useState<BrowseGroupId | null>(null);

  if (groups.length === 0) return null;

  // Each segment height: derive from a fixed total so the rail length stays
  // visually constant regardless of group count. ~280px feels right at most
  // viewport heights without crowding the rest of the page.
  const TOTAL_H = 280;
  const GAP = 4;
  const segH = Math.max(
    14,
    (TOTAL_H - GAP * (groups.length - 1)) / groups.length,
  );

  return (
    <nav
      aria-label="Collection scroll progress"
      className="hidden md:block fixed top-1/2 -translate-y-1/2 right-5 lg:right-7 z-20"
    >
      <ol className="flex flex-col items-end" style={{ gap: `${GAP}px` }}>
        {groups.map((id) => {
          const progress = Math.max(0, Math.min(1, progressById.get(id) ?? 0));
          const isActive = spyActiveGroup === id;
          const isHovered = hoveredId === id;
          const showLabel = isActive || isHovered;

          return (
            <li
              key={id}
              className="relative flex items-center justify-end"
              style={{ height: `${segH}px` }}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Label appears on the left side of the segment when active or hovered */}
              <span
                className={cn(
                  "absolute right-full mr-3 whitespace-nowrap text-[10px] uppercase tracking-[0.28em] tabular-nums leading-none transition-opacity duration-200 pointer-events-none",
                  showLabel ? "opacity-100 text-charcoal" : "opacity-0",
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {BROWSE_GROUP_LABELS[id]}
              </span>

              <button
                type="button"
                onClick={() => onJump(id)}
                aria-label={`Jump to ${BROWSE_GROUP_LABELS[id]}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative h-full transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  isActive || isHovered ? "w-[3px]" : "w-px",
                )}
              >
                {/* Track */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-charcoal/15"
                />
                {/* Fill */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 right-0 top-0 transition-[height] duration-150 ease-out",
                    isActive ? "bg-charcoal" : "bg-charcoal/55",
                  )}
                  style={{ height: `${progress * 100}%` }}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
