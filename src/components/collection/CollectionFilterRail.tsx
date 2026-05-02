import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  OWNER_BROWSE_ORDER,
  SAFETY_NET_BROWSE_ORDER,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";

export interface FilterOption {
  id: BrowseGroupId;
  count: number;
}

interface CollectionFilterRailProps {
  options: FilterOption[];
  activeGroup: BrowseGroupId | "";
  totalCount: number;
  onSelect: (id: BrowseGroupId | "") => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Compact layout for the mobile bottom sheet */
  variant?: "rail" | "sheet";
}

/**
 * Auction-house style left filter rail.
 * - One persistent surface for category selection
 * - Owner tier on top, safety-net tier below a thin divider
 * - Active state = filled charcoal underline + bold weight
 * - No boxes, no chrome — pure typographic list
 */
export function CollectionFilterRail({
  options,
  activeGroup,
  totalCount,
  onSelect,
  onClear,
  hasActiveFilters,
  variant = "rail",
}: CollectionFilterRailProps) {
  const reduced = useReducedMotion();
  const countMap = new Map(options.map((o) => [o.id, o.count]));

  const ownerItems = OWNER_BROWSE_ORDER.filter((id) => (countMap.get(id) ?? 0) > 0);
  const safetyItems = SAFETY_NET_BROWSE_ORDER.filter(
    (id) => (countMap.get(id) ?? 0) > 0,
  );

  const isSheet = variant === "sheet";

  return (
    <nav
      aria-label="Filter inventory by category"
      className={isSheet ? "px-1" : "sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"}
    >
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/50">
          Categories
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[10px] uppercase tracking-[0.2em] text-charcoal/55 hover:text-charcoal transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <ul className="space-y-1">
        <FilterRow
          label="All pieces"
          count={totalCount}
          active={!activeGroup}
          onClick={() => onSelect("")}
          reduced={reduced}
          emphasized
        />

        {ownerItems.length > 0 && (
          <li className="pt-3" aria-hidden />
        )}
        {ownerItems.map((id) => (
          <FilterRow
            key={id}
            label={BROWSE_GROUP_LABELS[id]}
            count={countMap.get(id) ?? 0}
            active={activeGroup === id}
            onClick={() => onSelect(id)}
            reduced={reduced}
          />
        ))}

        {safetyItems.length > 0 && (
          <li className="pt-4 mt-2 border-t border-charcoal/10" aria-hidden />
        )}
        {safetyItems.map((id) => (
          <FilterRow
            key={id}
            label={BROWSE_GROUP_LABELS[id]}
            count={countMap.get(id) ?? 0}
            active={activeGroup === id}
            onClick={() => onSelect(id)}
            reduced={reduced}
            muted
          />
        ))}
      </ul>
    </nav>
  );
}

interface FilterRowProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  reduced: boolean | null;
  emphasized?: boolean;
  muted?: boolean;
}

function FilterRow({
  label,
  count,
  active,
  onClick,
  reduced,
  emphasized,
  muted,
}: FilterRowProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className={[
          "group relative w-full flex items-baseline justify-between gap-3 py-1.5 text-left transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          emphasized ? "text-[13px]" : "text-[13px]",
          active
            ? "text-charcoal"
            : muted
              ? "text-charcoal/55 hover:text-charcoal"
              : "text-charcoal/75 hover:text-charcoal",
        ].join(" ")}
        aria-current={active ? "true" : undefined}
      >
        <span
          className={[
            "relative",
            active ? "font-medium" : "font-normal",
          ].join(" ")}
        >
          {label}
          {active && (
            <motion.span
              layoutId="filter-rail-active"
              className="absolute -left-3 top-1/2 -translate-y-1/2 h-[1px] w-2 bg-charcoal"
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 500, damping: 35 }
              }
            />
          )}
        </span>
        <span
          className={[
            "tabular-nums text-[11px]",
            active ? "text-charcoal/55" : "text-charcoal/35",
          ].join(" ")}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
