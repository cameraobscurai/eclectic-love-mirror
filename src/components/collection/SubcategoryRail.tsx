import { COMBINED_SUBS, PARENT_LABELS, PARENT_SUBS, type ParentId } from "@/lib/collection-parents";

interface Props {
  parent: ParentId;
  active: string; // sub id, combined sub id, or "all"
  onSelect: (sub: string) => void;
}

/**
 * Contextual horizontal rail rendered on the active product page.
 *
 * Renders [All, ...PARENT_SUBS[parent]] — taxonomy only, never inventory
 * counts. A UI-only combined selection (COMBINED_SUBS) gets its own chip,
 * shown only while active, so "All" never lies about the current filter.
 */
export function SubcategoryRail({ parent, active, onSelect }: Props) {
  const subs = PARENT_SUBS[parent];
  const combined = COMBINED_SUBS[active];
  const items = [
    { id: "all", label: "All" },
    ...subs,
    ...(combined && combined.parent === parent ? [{ id: active, label: combined.label }] : []),
  ];

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
