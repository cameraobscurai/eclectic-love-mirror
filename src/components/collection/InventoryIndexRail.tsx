import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CategoryFacet } from "@/lib/phase3-catalog";

interface InventoryIndexRailProps {
  facets: CategoryFacet[];
  /** Empty string means Overview is active. */
  activeSlug: string;
  /** Truthy when the user is in search mode (q present, no category). */
  searchMode?: boolean;
  onSelectOverview: () => void;
  onSelectCategory: (slug: string) => void;
}

/**
 * Sticky right-side editorial table of contents for the collection page.
 *
 * - Desktop only (parent gates with `hidden lg:block`).
 * - Persistent orientation, NOT a filter sidebar — no checkboxes, no
 *   bulky controls, no boxes. Just an index.
 * - Active state is a thin charcoal underline + full-opacity text.
 */
export function InventoryIndexRail({
  facets,
  activeSlug,
  searchMode,
  onSelectOverview,
  onSelectCategory,
}: InventoryIndexRailProps) {
  const reduced = useReducedMotion();
  const overviewActive = !activeSlug && !searchMode;

  return (
    <aside className="hidden lg:block w-[220px] xl:w-[240px] flex-shrink-0">
      <div className="sticky top-[180px] pt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/40 mb-4">
          Inventory Index
        </p>
        <nav>
          <ul className="space-y-2">
            <li>
              <RailItem
                label="Overview"
                active={overviewActive}
                onClick={onSelectOverview}
                reduced={reduced}
              />
            </li>
            {searchMode && (
              <li>
                <RailItem
                  label="Search results"
                  active
                  onClick={() => undefined}
                  reduced={reduced}
                  count={null}
                  muted
                />
              </li>
            )}
            <li className="pt-3 mt-2 border-t border-charcoal/10" />
            {facets.map((f) => (
              <li key={f.slug}>
                <RailItem
                  label={RAIL_LABEL_OVERRIDES[f.slug] ?? f.display}
                  count={f.count}
                  active={activeSlug === f.slug}
                  onClick={() => onSelectCategory(f.slug)}
                  reduced={reduced}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

interface RailItemProps {
  label: string;
  count?: number | null;
  active: boolean;
  onClick: () => void;
  reduced: boolean | null;
  muted?: boolean;
}

function RailItem({
  label,
  count,
  active,
  onClick,
  reduced,
  muted,
}: RailItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left flex items-baseline justify-between gap-3 py-1 transition-colors",
        active
          ? "text-charcoal"
          : muted
            ? "text-charcoal/40"
            : "text-charcoal/60 hover:text-charcoal",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.18em] leading-relaxed">
        {label}
      </span>
      {typeof count === "number" && (
        <span
          className={cn(
            "text-[10px] tabular-nums tracking-wider",
            active ? "text-charcoal/60" : "text-charcoal/30",
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="inventory-index-active"
          aria-hidden
          className="absolute -left-3 top-1/2 -translate-y-1/2 h-3 w-[2px] bg-charcoal"
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 38 }
          }
        />
      )}
    </button>
  );
}
