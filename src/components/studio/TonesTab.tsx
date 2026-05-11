import type { ToneAnalysis } from "@/lib/color-engine";

const toneConfig = [
  { key: "warm", label: "Warm", fill: "hsl(15, 70%, 52%)" },
  { key: "cool", label: "Cool", fill: "hsl(212, 65%, 54%)" },
  { key: "neutral", label: "Neutral", fill: "hsl(48, 3%, 53%)" },
  { key: "light", label: "Light", fill: "hsl(90, 45%, 73%)" },
  { key: "dark", label: "Dark", fill: "hsl(250, 42%, 37%)" },
  { key: "saturated", label: "Saturated", fill: "hsl(340, 60%, 58%)" },
  { key: "muted", label: "Muted", fill: "hsl(45, 5%, 68%)" },
] as const;

export function TonesTab({ tones, imageCount }: { tones: ToneAnalysis | null; imageCount: number }) {
  if (!tones) {
    return <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 p-4">Run analyze to read tones</p>;
  }
  const temp = tones.warm > tones.cool
    ? (tones.warm > tones.neutral ? "Warm" : "Warm-neutral")
    : (tones.cool > tones.neutral ? "Cool" : "Cool-neutral");
  const value = tones.light > tones.dark ? "Light" : "Dark";
  const sat = tones.saturated > tones.muted ? "Vibrant" : "Subdued";

  return (
    <div>
      <div className="p-4 border-b border-charcoal/10">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">Temperature & value</h3>
        <div className="space-y-2">
          {toneConfig.map((t) => (
            <div key={t.key} className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-charcoal/65">
                <span>{t.label}</span>
                <span className="tabular-nums">{tones[t.key]}%</span>
              </div>
              <div className="h-[3px] bg-charcoal/10 overflow-hidden">
                <div className="h-full transition-all duration-500" style={{ width: `${tones[t.key]}%`, background: t.fill }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">Character</h3>
        <div className="grid grid-cols-2 gap-px bg-charcoal/10 border border-charcoal/10">
          {[
            { val: temp, label: "Temperature" },
            { val: value, label: "Value" },
            { val: sat, label: "Saturation" },
            { val: String(imageCount), label: "Images" },
          ].map((s) => (
            <div key={s.label} className="bg-cream p-3">
              <p className="font-display text-lg leading-none">{s.val}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
