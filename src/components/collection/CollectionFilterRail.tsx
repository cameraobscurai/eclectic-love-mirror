
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
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45">
          Categories
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[10px] uppercase tracking-[0.2em] text-charcoal/55 hover:text-charcoal focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <ul className="space-y-0">
        <FilterRow
          label="All Inventory"
          count={totalCount}
          active={!activeGroup}
          onClick={() => onSelect("")}
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
              isSheet={isSheet}
            />
          );
        })}

        {safetyIds.length > 0 && (
          <li
            className="pt-3 mt-2 border-t border-black/[0.08]"
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
        ? "text-charcoal/55 hover:text-charcoal/90"
        : "text-charcoal/55 hover:text-charcoal/90";

  return (
    <li>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={[
          "group relative w-full flex items-baseline justify-between gap-3 text-left transition-colors leading-none",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          // Left rule lives in the row itself; reserve 10px padding-left always
          // so labels never shift horizontally when active toggles.
          "pl-[10px] border-l-2",
          active ? "border-charcoal" : "border-transparent",
          isSheet
            ? "py-3 min-h-[44px] text-[14px]"
            : "py-2 text-[14px]",
          tone,
        ].join(" ")}
      >
        <span
          className={active ? "font-medium" : "font-normal"}
        >
          {label}
        </span>
        <span
          className={[
            "tabular-nums text-[12px]",
            disabled
              ? "text-charcoal/20"
              : active
                ? "text-charcoal/70"
                : "text-charcoal/35",
          ].join(" ")}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
