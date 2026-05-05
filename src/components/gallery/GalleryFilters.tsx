export interface GalleryFiltersProps<T extends string> {
  filters: T[];
  active: T;
  counts: Record<T, number>;
  onChange: (next: T) => void;
}

export function GalleryFilters<T extends string>({
  filters,
  active,
  counts,
  onChange,
}: GalleryFiltersProps<T>) {
  return (
    <section className="px-6 lg:px-12 pb-10">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = f === active;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              className={[
                "px-4 py-2 text-xs uppercase tracking-[0.18em] border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40",
                on
                  ? "bg-cream text-charcoal border-cream"
                  : "bg-transparent text-cream/60 border-cream/20 hover:border-cream/40 hover:text-cream",
              ].join(" ")}
            >
              {f}
              <span className="ml-2 opacity-60 tabular-nums">
                {String(counts[f] ?? 0).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
