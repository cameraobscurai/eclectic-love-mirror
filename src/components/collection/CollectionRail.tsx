import { useMemo, useState } from "react";
import {
  BROWSE_GROUP_ORDER,
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";

interface CollectionRailProps {
  /** Full catalog — used to source per-row thumbnail (firstProduct.primaryImage). */
  products: CollectionProduct[];
  activeGroup: BrowseGroupId | "";
  /** Group currently dominant in the viewport per scroll-spy. Drives a quiet
   *  highlight on the corresponding row when no manual filter is active. */
  spyActiveGroup?: BrowseGroupId | null;
  onSelect: (id: BrowseGroupId | "") => void;
  /** Compact layout for the mobile bottom sheet (≥44px touch targets) */
  variant?: "rail" | "sheet";
}

/**
 * Permanent left rail — always visible alongside the main pane.
 *
 * Front-door framing for the collection: thumbnail + name per browse group.
 * Counts intentionally absent everywhere on the collection page except
 * active-search feedback in the utility bar.
 *
 * Each row is thumbnail (28×20 white) + name. The thumbnail is sourced from
 * the first product in that browse group with a primaryImage, with optional
 * override via CATEGORY_COVERS. No new data, no curation pass needed to ship.
 */
export function CollectionRail({
  products,
  activeGroup,
  spyActiveGroup,
  onSelect,
  variant = "rail",
}: CollectionRailProps) {
  const isSheet = variant === "sheet";
  // Spy highlights only when the user hasn't pinned a group manually.
  const spyHighlightId = !activeGroup ? spyActiveGroup ?? null : null;

  // Build per-group thumbnail src once. CATEGORY_COVERS overrides, otherwise
  // pull from the first product in the bucket that has a primaryImage.
  const thumbByGroup = useMemo(() => {
    const map = new Map<BrowseGroupId, string | null>();
    for (const id of BROWSE_GROUP_ORDER) {
      const cover = CATEGORY_COVERS[id];
      if (cover) {
        map.set(id, cover);
        continue;
      }
      // Find the first product in this bucket with an image.
      let found: string | null = null;
      for (const p of products) {
        if (p.primaryImage && getCategoryGroup(p) === id) {
          found = withCdnWidth(p.primaryImage.url, 120);
          break;
        }
      }
      map.set(id, found);
    }
    return map;
  }, [products]);

  return (
    <nav
      aria-label="Browse inventory by category"
      className={isSheet ? "px-1" : ""}
      style={
        isSheet
          ? undefined
          : {
              position: "sticky",
              top: "calc(var(--nav-h) + var(--collection-heading-h, 0px))",
              maxHeight:
                "calc(100dvh - (var(--nav-h) + var(--collection-heading-h, 0px) + 1rem))",
              overflowY: "auto",
            }
      }
    >
      {/* Header — clickable, returns to overview state. */}
      <button
        type="button"
        onClick={() => onSelect("")}
        className="w-full text-left px-5 pt-5 pb-3 hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
        aria-label="Show all categories"
      >
        <span
          className="block uppercase text-charcoal/45"
          style={{
            fontSize: "10px",
            letterSpacing: "0.28em",
          }}
        >
          Browse by Category
        </span>
      </button>

      <ul role="list">
        {BROWSE_GROUP_ORDER.map((id) => {
          const label = BROWSE_GROUP_LABELS[id];
          const thumb = thumbByGroup.get(id) ?? null;
          const isActive = activeGroup === id;
          const isSpyHighlighted = !isActive && spyHighlightId === id;

          return (
            <li key={id}>
              <CategoryRow
                label={label}
                thumbSrc={thumb}
                isActive={isActive}
                isSpyHighlighted={isSpyHighlighted}
                isSheet={isSheet}
                onSelect={() => onSelect(id)}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface CategoryRowProps {
  label: string;
  thumbSrc: string | null;
  isActive: boolean;
  isSpyHighlighted: boolean;
  isSheet: boolean;
  onSelect: () => void;
}

function CategoryRow({
  label,
  thumbSrc,
  isActive,
  isSpyHighlighted,
  isSheet,
  onSelect,
}: CategoryRowProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = !!thumbSrc && !thumbFailed;

  // Active row uses Cormorant + charcoal. Inactive uses sans + quiet.
  // Spy-highlighted gets a subtle elevation without taking the active slot.
  const nameStyle: React.CSSProperties = isActive
    ? {
        fontFamily: "var(--font-display)",
        fontSize: isSheet ? "14px" : "12px",
        letterSpacing: "0.01em",
        textTransform: "none",
        color: "var(--charcoal)",
      }
    : {
        fontFamily: "var(--font-sans)",
        fontSize: isSheet ? "11px" : "10px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: isSpyHighlighted
          ? "var(--charcoal)"
          : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
      };

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      className="group w-full flex items-center gap-3 text-left transition-colors focus:outline-none focus-visible:bg-charcoal/[0.04]"
      style={{
        padding: isSheet ? "10px 20px 10px 18px" : "8px 18px 8px 16px",
        borderLeft: isActive
          ? "2px solid var(--charcoal)"
          : "2px solid transparent",
        minHeight: isSheet ? "44px" : undefined,
      }}
    >
      {/* Thumbnail: 28×20 explicit size so no layout shift on lazy load. */}
      <span
        aria-hidden
        className="shrink-0 inline-flex items-center justify-center bg-white"
        style={{
          width: "28px",
          height: "20px",
          border: "1px solid var(--archive-rule)",
        }}
      >
        {showThumb && (
          <img
            src={thumbSrc}
            alt=""
            width={28}
            height={20}
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
            className="block h-full w-full object-contain"
            style={{ padding: "1px" }}
          />
        )}
      </span>

      <span className="flex-1 min-w-0 truncate" style={nameStyle}>
        {label}
      </span>

    </button>
  );
}

function getCategoryGroup(p: CollectionProduct): BrowseGroupId | null {
  return getProductBrowseGroup(p);
}
