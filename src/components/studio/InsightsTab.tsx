import type { DesignInsight } from "@/lib/color-engine";

export function InsightsTab({ insights }: { insights: DesignInsight[] }) {
  if (!insights.length) {
    return <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 p-4">Run analyze to read style insights</p>;
  }
  return (
    <div className="p-4">
      <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">Style read</h3>
      <div>
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-charcoal/10 last:border-b-0">
            <div className="w-7 h-7 bg-charcoal/5 grid place-items-center flex-shrink-0 text-sm">{ins.icon}</div>
            <div className="text-[11px] leading-relaxed text-charcoal/70">
              <span className="font-display text-charcoal uppercase tracking-[0.14em] text-[12px]">{ins.title}</span>
              <span className="block mt-0.5">{ins.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
