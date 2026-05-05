import {
  PARENT_LABELS,
  PARENT_SUBS,
  type ParentId,
} from "@/lib/collection-parents";

interface Props {
  parent: ParentId;
  active: string; // sub id, or "all"
  onSelect: (sub: string) => void;
}

/**
 * Contextual horizontal rail rendered on the active product page.
 *
 * Renders [All, ...PARENT_SUBS[parent]] — taxonomy only, never inventory
 * counts. Quiet ALL CAPS, charcoal underline on the active sub. Replaces the
 * old 18-row flattened rail.
 */
export function SubcategoryRail({ parent, active, onSelect }: Props) {
  const subs = PARENT_SUBS[parent];
  const items = [{ id: "all", label: "All" }, ...subs];

  return (
    <nav
      aria-label={`${PARENT_LABELS[parent]} subcategories`}
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={[
              "text-[10px] uppercase tracking-[0.22em] py-1 transition-colors",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
              isActive
                ? "text-charcoal border-b border-charcoal"
                : "text-charcoal/55 hover:text-charcoal border-b border-transparent",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
