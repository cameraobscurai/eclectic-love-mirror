
import {
  BROWSE_GROUP_LABELS,
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
  /** Group currently dominant in the viewport per scroll-spy. Drives a quiet
   *  highlight on the corresponding row when no manual filter is active. The
   *  spy never changes the URL or filter state — it only orients the eye. */
  spyActiveGroup?: BrowseGroupId | null;
  onSelect: (id: BrowseGroupId | "") => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Compact layout for the mobile bottom sheet (≥44px touch targets) */
  variant?: "rail" | "sheet";
}

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
  spyActiveGroup,
  onSelect,
  onClear,
  hasActiveFilters,
  variant = "rail",
}: CollectionFilterRailProps) {
  const isSheet = variant === "sheet";
  // Spy highlights only when the user hasn't pinned a group manually.
  const spyHighlightId = !activeGroup ? spyActiveGroup ?? null : null;

  // Single unified list rendered in BROWSE_GROUP_ORDER. Tier metadata still
  // drives a quieter weight for safety-net categories so the owner's curation
  // is felt without breaking the navigational flow.
  return (
    <nav
      aria-label="Filter inventory by category"
      className={isSheet ? "px-1" : "pr-2"}
      style={
        isSheet
          ? undefined
          : {
              // Sticky offset = global nav + sticky utility row. Both sourced
              // from tokens so any height change propagates here automatically.
              position: "sticky",
              top: "calc(var(--nav-h) + var(--archive-utility-h))",
              maxHeight:
                "calc(100dvh - (var(--nav-h) + var(--archive-utility-h) + 1rem))",
              overflowY: "auto",
            }
      }
    >
      <div className="flex items-baseline justify-between mb-3">
        <p
          className="uppercase"
          style={{
            fontSize: "var(--label-size-micro)",
            letterSpacing: "var(--label-tracking-micro)",
            color: "var(--archive-text-muted)",
          }}
        >
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
        {/* Return-to-overview link — only visible when a category is pinned.
            "All Inventory" used to live here as a destination; it isn't one
            anymore. Returning sends the user back to the category gallery. */}
        {activeGroup && (
          <li className="pb-3">
            <button
              onClick={() => onSelect("")}
              className="text-[11px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
            >
              ← All Categories
            </button>
          </li>
        )}

        {orderedGroupIds.length > 0 && !activeGroup && <li className="pt-1" aria-hidden />}
        {orderedGroupIds.map((id) => {
          const count = counts.get(id) ?? 0;
          // Safety-net categories render in a quieter weight — preserves the
          // owner's emphasis without forcing them into a visual second-class.
          const isSafety = SAFETY_SET.has(id);
          return (
            <FilterRow
              key={id}
              label={BROWSE_GROUP_LABELS[id]}
              count={count}
              active={activeGroup === id}
              spied={spyHighlightId === id}
              disabled={count === 0}
              onClick={() => onSelect(id)}
              isSheet={isSheet}
              muted={isSafety}
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
  /** Quiet highlight when scroll-spy says this section is in the viewport
   *  but the user hasn't pinned a manual filter. Visually below `active`. */
  spied?: boolean;
  onClick: () => void;
  isSheet: boolean;
  muted?: boolean;
  disabled?: boolean;
}

function FilterRow({
  label,
  count,
  active,
  spied,
  onClick,
  isSheet,
  muted,
  disabled,
}: FilterRowProps) {
  // Color logic — disabled trumps muted trumps active trumps spied.
  const tone = disabled
    ? "text-charcoal/30 cursor-not-allowed"
    : active
      ? "text-charcoal"
      : spied
        ? "text-charcoal/85"
        : muted
          ? "text-charcoal/55 hover:text-charcoal"
          : "text-charcoal/55 hover:text-charcoal";

  // Border accent — active is solid, spied is a thinner half-tone tick.
  const borderColor = active
    ? "border-charcoal"
    : spied
      ? "border-charcoal/40"
      : "border-transparent";

  return (
    <li>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={[
          "group relative w-full flex items-baseline justify-between gap-3 text-left transition-colors leading-none uppercase",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          // Left rule lives in the row itself; reserve 10px padding-left always
          // so labels never shift horizontally when active toggles.
          "pl-[10px] border-l-2",
          borderColor,
          isSheet
            ? "py-3 min-h-[44px] text-[13px]"
            : "py-[7px] text-[13px]",
          tone,
        ].join(" ")}
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.18em",
        }}
      >
        <span className={active ? "font-semibold" : "font-normal"}>
          {label}
        </span>
        <span
          className={[
            "tabular-nums text-[11px]",
            // Counter stays in sans for clean numerals
            disabled
              ? "text-charcoal/20"
              : active
                ? "text-charcoal/70"
                : "text-charcoal/35",
          ].join(" ")}
          style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.05em" }}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
