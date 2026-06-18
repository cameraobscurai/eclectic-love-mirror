import { toast } from "sonner";
import type { AnalysisResult, ColorInfo } from "@/lib/color-engine";

const copy = (hex: string) => {
  navigator.clipboard?.writeText(hex);
  toast(`Copied ${hex}`);
};

// Relative luminance → pick label color so hex stays readable on every chip.
function readableInk(hex: string): string {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return "#1a1a1a";
  const [r, g, b] = m.map((h) => parseInt(h, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.58 ? "#1a1a1a" : "#ffffff";
}

function SwatchChip({ color }: { color: ColorInfo }) {
  const ink = readableInk(color.hex);
  return (
    <button
      type="button"
      onClick={() => copy(color.hex)}
      aria-label={`Copy ${color.hex}`}
      className="group relative aspect-[5/4] min-w-0 flex items-end p-2 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
      style={{ background: color.hex }}
    >
      <span
        className="font-mono text-[9px] tracking-[0.1em] uppercase opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ color: ink }}
      >
        {color.hex}
      </span>
    </button>
  );
}

function MiniSwatch({ color }: { color: ColorInfo }) {
  return (
    <button
      type="button"
      onClick={() => copy(color.hex)}
      title={color.hex}
      aria-label={`Copy ${color.hex}`}
      className="h-5 flex-1 min-w-[14px] rounded-[1px] transition-transform hover:-translate-y-0.5"
      style={{ background: color.hex }}
    />
  );
}

export function PaletteTab({ result }: { result: AnalysisResult }) {
  if (!result.palette.length) {
    return (
      <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 p-4">
        Run analyze to extract palette
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border-b border-charcoal/10">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50">
            Combined palette
          </h3>
          <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 tabular-nums">
            {result.palette.length} tones
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {result.palette.map((c, i) => (
            <SwatchChip key={i} color={c} />
          ))}
        </div>
      </div>

      {result.perImage.length > 0 && (
        <div className="px-4 pb-4">
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">
            Per image
          </h3>
          <div className="space-y-3">
            {result.perImage.map((pi, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 w-28 shrink-0 truncate"
                  title={pi.name}
                >
                  {pi.name}
                </span>
                <div className="flex flex-1 min-w-0 gap-1">
                  {pi.colors.slice(0, 8).map((c, j) => (
                    <MiniSwatch key={j} color={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
