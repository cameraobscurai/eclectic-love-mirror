import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  OWNER_BROWSE_ORDER,
  SAFETY_NET_BROWSE_ORDER,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";

interface CollectionFilterRailProps {
  /**
   * Stable list of group ids to render, in order. Computed once from the full
   * public-ready catalog so it never reorders or disappears while a user types.
   */
  orderedGroupIds: BrowseGroupId[];
  /** Per-group counts under the *committed* search/filter state. May be 0. */
  counts: Map<BrowseGroupId, number>;
  /** Total count for the "All Inventory" anchor under current commit. */
  totalCount: number;
  activeGroup: BrowseGroupId | "";
  onSelect: (id: BrowseGroupId | "") => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Compact layout for the mobile bottom sheet (≥44px touch targets) */
  variant?: "rail" | "sheet";
}

const OWNER_SET = new Set<BrowseGroupId>(OWNER_BROWSE_ORDER);
const SAFETY_SET = new Set<BrowseGroupId>(SAFETY_NET_BROWSE_ORDER);

/**
 * Auction-house style left filter rail.
 * - Order is fixed by the parent (derived from the full catalog) — never
 *   reorders during typing.
 * - Counts respond to filtered state. Zero-count rows render muted + disabled
 *   instead of disappearing, so navigation stays stable.
 */
export function CollectionFilterRail({
  orderedGroupIds,
  counts,
  totalCount,
  activeGroup,
  onSelect,
  onClear,
  hasActiveFilters,
  variant = "rail",
}: CollectionFilterRailProps) {
  const reduced = useReducedMotion();
  const isSheet = variant === "sheet";

  // Split ordered list into owner / safety-net while preserving order.
  const ownerIds = orderedGroupIds.filter((id) => OWNER_SET.has(id));
  const safetyIds = orderedGroupIds.filter((id) => SAFETY_SET.has(id));

  return (
    <nav
      aria-label="Filter inventory by category"
      className={
        isSheet
          ? "px-1"
          : "sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"
      }
    >
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/50">
          Categories
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[10px] uppercase tracking-[0.2em] text-charcoal/55 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <ul className="space-y-1">
        <FilterRow
          label="All Inventory"
          count={totalCount}
          active={!activeGroup}
          onClick={() => onSelect("")}
          reduced={reduced}
          isSheet={isSheet}
        />

        {ownerIds.length > 0 && <li className="pt-3" aria-hidden />}
        {ownerIds.map((id) => {
          const count = counts.get(id) ?? 0;
          return (
            <FilterRow
              key={id}
              label={BROWSE_GROUP_LABELS[id]}
              count={count}
              active={activeGroup === id}
              disabled={count === 0}
              onClick={() => onSelect(id)}
              reduced={reduced}
              isSheet={isSheet}
            />
          );
        })}

        {safetyIds.length > 0 && (
          <li
            className="pt-4 mt-2 border-t border-charcoal/10"
            aria-hidden
          />
        )}
        {safetyIds.map((id) => {
          const count = counts.get(id) ?? 0;
          return (
            <FilterRow
              key={id}
              label={BROWSE_GROUP_LABELS[id]}
              count={count}
              active={activeGroup === id}
              disabled={count === 0}
              onClick={() => onSelect(id)}
              reduced={reduced}
              isSheet={isSheet}
              muted
            />
          );
        })}
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
  isSheet: boolean;
  muted?: boolean;
  disabled?: boolean;
}

function FilterRow({
  label,
  count,
  active,
  onClick,
  reduced,
  isSheet,
  muted,
  disabled,
}: FilterRowProps) {
  // Color logic — disabled trumps muted trumps active.
  const tone = disabled
    ? "text-charcoal/25 cursor-not-allowed"
    : active
      ? "text-charcoal"
      : muted
        ? "text-charcoal/55 hover:text-charcoal"
        : "text-charcoal/75 hover:text-charcoal";

  return (
    <li>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={[
          "group relative w-full flex items-baseline justify-between gap-3 text-left transition-colors",
          "rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          isSheet
            ? "py-2.5 min-h-[44px] text-[14px]"
            : "py-1.5 text-[13px]",
          tone,
        ].join(" ")}
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
            disabled
              ? "text-charcoal/20"
              : active
                ? "text-charcoal/55"
                : "text-charcoal/35",
          ].join(" ")}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
