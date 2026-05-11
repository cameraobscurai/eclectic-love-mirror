import { toast } from "sonner";
import type { AnalysisResult, ColorInfo } from "@/lib/color-engine";

const copy = (hex: string) => {
  navigator.clipboard?.writeText(hex);
  toast(`Copied ${hex}`);
};

function Swatch({ color }: { color: ColorInfo }) {
  return (
    <button
      type="button"
      onClick={() => copy(color.hex)}
      className="flex-1 cursor-pointer relative transition-all hover:flex-[2] group"
      style={{ background: color.hex }}
      aria-label={color.hex}
    >
      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-charcoal text-cream px-2 py-1 text-[10px] uppercase tracking-[0.18em] whitespace-nowrap z-50 pointer-events-none">
        {color.hex}
      </div>
    </button>
  );
}

export function PaletteTab({ result }: { result: AnalysisResult }) {
  if (!result.palette.length) {
    return <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45 p-4">Run analyze to extract palette</p>;
  }
  return (
    <div className="space-y-4">
      <div className="p-4 border-b border-charcoal/10">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">Combined palette</h3>
        <div className="flex h-12 overflow-hidden mb-3">
          {result.palette.map((c, i) => <Swatch key={i} color={c} />)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result.palette.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => copy(c.hex)}
              className="flex items-center gap-1.5 px-2 py-1 bg-charcoal/5 text-[10px] border border-charcoal/10 hover:border-charcoal/40 transition-colors"
            >
              <span className="w-3 h-3 flex-shrink-0" style={{ background: c.hex }} />
              <span className="font-mono uppercase tracking-[0.1em]">{c.hex}</span>
            </button>
          ))}
        </div>
      </div>

      {result.perImage.length > 0 && (
        <div className="px-4 pb-4">
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-charcoal/50 mb-3">Per image</h3>
          <div className="space-y-2.5">
            {result.perImage.map((pi, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 w-20 truncate" title={pi.name}>
                  {pi.name}
                </span>
                <div className="flex flex-1 h-5 gap-0.5 overflow-hidden">
                  {pi.colors.map((c, j) => (
                    <button
                      type="button"
                      key={j}
                      onClick={() => copy(c.hex)}
                      className="flex-1 cursor-pointer"
                      style={{ background: c.hex }}
                      title={c.hex}
                    />
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
