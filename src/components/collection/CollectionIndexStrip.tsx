import { cn } from "@/lib/utils";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";

// Short-label overrides keep the right-edge rail narrow while still readable.
// Most labels fit in 6–9 characters; only the long ones get shortened.
const SHORT_LABEL: Partial<Record<BrowseGroupId, string>> = {
  "benches-ottomans": "BO",
  "coffee-tables": "COFFEE",
  "side-tables": "SIDE",
  "cocktail-tables": "COCKTAIL",
  "large-decor": "DECOR",
};

interface CollectionIndexStripProps {
  /** Ordered group ids that actually have at least one piece in the catalog. */
  groups: BrowseGroupId[];
  /** Currently active group, or "" for the "all" view. */
  activeGroup: BrowseGroupId | "";
  /** Per-group counts for the current search-filtered set. */
  counts: Map<BrowseGroupId, number>;
  /** Total count for the "all" anchor at the top of the rail. */
  totalCount: number;
  /** Apply or clear the group filter. */
  onSelect: (id: BrowseGroupId | "") => void;
}

/**
 * The Index Strip — a hairline rail pinned to the right edge of the Collection
 * viewport. Quiet by default; uses the same micro-typography as the rest of
 * the archive chrome. Desktop only (`md:` and up).
 *
 * Mirrors the left filter rail's behavior — clicking a label applies that
 * group filter — so a user scrolling deep in the grid never has to scroll
 * back up to switch categories.
 */
export function CollectionIndexStrip({
  groups,
  activeGroup,
  counts,
  totalCount,
  onSelect,
}: CollectionIndexStripProps) {
  const items: Array<{
    id: BrowseGroupId | "";
    label: string;
    count: number;
    active: boolean;
  }> = [
    {
      id: "",
      label: "ALL",
      count: totalCount,
      active: activeGroup === "",
    },
    ...groups.map((id) => ({
      id,
      label: (SHORT_LABEL[id] ?? BROWSE_GROUP_LABELS[id]).toUpperCase(),
      count: counts.get(id) ?? 0,
      active: activeGroup === id,
    })),
  ];

  return (
    <nav
      aria-label="Collection index"
      className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 lg:right-8 z-20 pointer-events-none"
    >
      <ul
        className="flex flex-col items-stretch gap-[2px] border-l border-charcoal/15 pl-3 max-h-[78vh] overflow-y-auto pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-orientation="vertical"
      >
        {items.map((it) => {
          const disabled = it.count === 0 && it.id !== "";
          return (
            <li key={it.id || "all"}>
              <button
                type="button"
                onClick={() => onSelect(it.id)}
                disabled={disabled}
                aria-current={it.active ? "true" : undefined}
                className={cn(
                  "group block text-right text-[10px] uppercase tracking-[0.28em] tabular-nums leading-none py-[5px] pr-0 pl-0 transition-all duration-200",
                  "focus:outline-none focus-visible:underline underline-offset-4",
                  it.active
                    ? "text-charcoal translate-x-0"
                    : disabled
                      ? "text-charcoal/20 cursor-not-allowed"
                      : "text-charcoal/45 hover:text-charcoal hover:-translate-x-1",
                )}
                title={`${it.label}${it.count ? ` · ${it.count}` : ""}`}
              >
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
