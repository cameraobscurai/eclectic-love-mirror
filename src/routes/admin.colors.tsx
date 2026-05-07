import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  listColorRows,
  overrideColor,
  setColorLocked,
  clearColorTag,
  type ColorRow,
} from "@/server/colors.functions";

export const Route = createFileRoute("/admin/colors")({
  component: ColorsQA,
  head: () => ({
    meta: [{ title: "Color QA — Admin" }],
  }),
});

const FAMILIES = [
  "black", "charcoal", "grey", "brown", "tan", "cream", "white",
  "red", "orange", "yellow", "green", "blue", "purple", "pink",
  "metallic-warm", "metallic-cool", "multi",
] as const;

const FAMILY_SWATCH: Record<string, string> = {
  black: "#1a1a1a", charcoal: "#3a3a3a", grey: "#888888",
  brown: "#6b4a2b", tan: "#c9a67a", cream: "#efe6d3", white: "#ffffff",
  red: "#a83232", orange: "#d97a3c", yellow: "#d8c34a",
  green: "#4f7a4a", blue: "#3a567a", purple: "#6e4d8a", pink: "#d29eb0",
  "metallic-warm": "#b89968", "metallic-cool": "#a8acb3", multi: "linear-gradient(90deg,#a83232,#d8c34a,#3a567a)",
};

type Filter = "all" | "needs_review" | "untagged" | "low_confidence" | "locked";

function ColorsQA() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listColorRows>> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [family, setFamily] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [selected, setSelected] = useState<ColorRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await listColorRows({
      data: {
        filter,
        family: family || undefined,
        category: category || undefined,
        limit: 2000,
      },
    });
    setData(res);
    if (selected) {
      const fresh = res.rows.find((r) => r.rms_id === selected.rms_id);
      if (fresh) setSelected(fresh);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, family, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    data?.rows.forEach((r) => r.category && set.add(r.category));
    return Array.from(set).sort();
  }, [data]);

  // Live preview strip — sort the active filtered rows by tonalRank-equivalent
  // (we replicate the bake formula inline so the strip updates instantly).
  const previewSorted = useMemo(() => {
    if (!data) return [];
    const rank = (r: ColorRow): number => {
      if (r.color_lightness == null) return Number.MAX_SAFE_INTEGER;
      const fam = (r.color_family || "").toLowerCase();
      const FB: Record<string, number> = {
        black: 0, charcoal: 1, grey: 2, gray: 2, brown: 3, tan: 4, cream: 5, white: 6,
        "metallic-warm": 5, "metallic-cool": 2,
        red: 7, orange: 7, yellow: 7, green: 8, blue: 8, purple: 8, pink: 7, multi: 9,
      };
      const bucket = FB[fam] ?? 9;
      const L = Math.max(0, Math.min(100, r.color_lightness));
      if (bucket <= 6) return bucket * 10000 + Math.round(L * 100);
      const h = r.color_hue ?? 0;
      const roygbiv = Math.floor(((h + 15) % 360) / (360 / 7));
      const neutralBase = L < 20 ? 1 : L < 40 ? 3 : L < 60 ? 4 : 5;
      return neutralBase * 10000 + Math.round(L * 100) + roygbiv;
    };
    return [...data.rows].sort((a, b) => rank(a) - rank(b));
  }, [data]);

  return (
    <div className="min-h-screen bg-cream text-charcoal p-6">
      <h1 className="text-3xl font-display tracking-wide mb-2">COLOR QA</h1>
      <p className="text-sm uppercase tracking-wide opacity-60 mb-6">
        Two-signal color tagging review · darkest → lightest preview
      </p>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 text-sm">
          <Stat label="Total" value={data.total} />
          <Stat label="Tagged" value={data.tagged} />
          <Stat label="Untagged" value={data.untagged} accent={data.untagged > 0 ? "warn" : undefined} />
          <Stat label="Needs review" value={data.needsReview} accent={data.needsReview > 0 ? "warn" : undefined} />
          <Stat label="Locked" value={data.locked} />
        </div>
      )}

      {/* Live preview strip */}
      {previewSorted.length > 0 && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest opacity-60 mb-2">
            Tonal preview ({previewSorted.length} items in current filter)
          </div>
          <div className="h-12 flex border border-charcoal/10 overflow-hidden">
            {previewSorted.slice(0, 200).map((r) => (
              <div
                key={r.rms_id}
                className="flex-1 min-w-[3px]"
                style={{ background: r.color_hex || "#dddddd" }}
                title={`${r.title} · ${r.color_family ?? "untagged"} · L=${r.color_lightness ?? "?"}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}
          className="border border-charcoal/20 bg-transparent px-2 py-1">
          <option value="all">All</option>
          <option value="needs_review">Needs review</option>
          <option value="untagged">Untagged</option>
          <option value="low_confidence">Low confidence (&lt;0.6)</option>
          <option value="locked">Locked</option>
        </select>
        <select value={family} onChange={(e) => setFamily(e.target.value)}
          className="border border-charcoal/20 bg-transparent px-2 py-1">
          <option value="">All families</option>
          {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-charcoal/20 bg-transparent px-2 py-1">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={refresh} className="border border-charcoal/20 px-3 py-1">Refresh</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {(data?.rows ?? []).map((r) => (
          <button
            key={r.rms_id}
            onClick={() => setSelected(r)}
            className={[
              "relative text-left bg-white border",
              selected?.rms_id === r.rms_id ? "border-charcoal" : "border-charcoal/10",
              "hover:border-charcoal/40 transition-colors",
            ].join(" ")}
          >
            <div className="aspect-square bg-charcoal/5 overflow-hidden">
              {r.hero ? (
                <img src={r.hero} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no img</div>
              )}
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1 mb-1">
                <span
                  className="inline-block w-4 h-4 border border-charcoal/20"
                  style={{ background: r.color_hex || "transparent" }}
                />
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {r.color_family ?? "—"}
                </span>
                {r.color_needs_review && <span className="text-[10px] text-orange-700">⚠</span>}
                {r.color_locked && <span className="text-[10px]">🔒</span>}
              </div>
              <div className="text-[11px] truncate" title={r.title}>{r.title}</div>
              <div className="text-[10px] opacity-50">
                L={r.color_lightness?.toFixed(0) ?? "—"} · c={r.color_confidence?.toFixed(2) ?? "—"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Side panel */}
      {selected && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white border-l border-charcoal/20 shadow-xl overflow-y-auto p-5 z-50">
          <button onClick={() => setSelected(null)} className="text-xs uppercase opacity-60 mb-3">← Close</button>
          <div className="aspect-square bg-charcoal/5 mb-3 overflow-hidden">
            {selected.hero && <img src={selected.hero} alt="" className="w-full h-full object-cover" />}
          </div>
          <h2 className="font-display text-lg leading-tight mb-1">{selected.title}</h2>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-3">
            {selected.category} · {selected.slug}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <Field label="Hex" value={selected.color_hex ?? "—"} swatch={selected.color_hex} />
            <Field label="Source" value={selected.color_source ?? "—"} />
            <Field label="Family" value={selected.color_family ?? "—"} />
            <Field label="Temp" value={selected.color_temperature ?? "—"} />
            <Field label="Lightness" value={selected.color_lightness?.toFixed(1) ?? "—"} />
            <Field label="Hue" value={selected.color_hue?.toFixed(0) ?? "—"} />
            <Field label="Chroma" value={selected.color_chroma?.toFixed(1) ?? "—"} />
            <Field label="Confidence" value={selected.color_confidence?.toFixed(2) ?? "—"} />
          </div>

          {/* Manual override */}
          <OverridePanel
            row={selected}
            busy={busy}
            onSave={async (patch) => {
              setBusy(true);
              try {
                await overrideColor({ data: { rms_id: selected.rms_id, ...patch } });
                await refresh();
              } finally { setBusy(false); }
            }}
            onLockToggle={async () => {
              setBusy(true);
              try {
                await setColorLocked({ data: { rms_id: selected.rms_id, locked: !selected.color_locked } });
                await refresh();
              } finally { setBusy(false); }
            }}
            onClear={async () => {
              if (!confirm("Clear color tag? (Skipped if locked)")) return;
              setBusy(true);
              try {
                await clearColorTag({ data: { rms_id: selected.rms_id } });
                await refresh();
              } finally { setBusy(false); }
            }}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "warn" }) {
  return (
    <div className="border border-charcoal/10 p-3">
      <div className="text-[10px] uppercase tracking-widest opacity-60">{label}</div>
      <div className={["text-2xl font-display", accent === "warn" ? "text-orange-700" : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, value, swatch }: { label: string; value: string; swatch?: string | null }) {
  return (
    <div className="border border-charcoal/10 px-2 py-1">
      <div className="text-[9px] uppercase tracking-widest opacity-60">{label}</div>
      <div className="flex items-center gap-1">
        {swatch && <span className="inline-block w-3 h-3 border border-charcoal/20" style={{ background: swatch }} />}
        <span className="text-xs">{value}</span>
      </div>
    </div>
  );
}

function OverridePanel({
  row, busy, onSave, onLockToggle, onClear,
}: {
  row: ColorRow;
  busy: boolean;
  onSave: (patch: { hex: string; family: typeof FAMILIES[number]; temperature?: "warm" | "neutral" | "cool"; notes?: string; lock?: boolean }) => Promise<void>;
  onLockToggle: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [hex, setHex] = useState(row.color_hex ?? "#888888");
  const [family, setFamily] = useState<typeof FAMILIES[number]>((row.color_family as typeof FAMILIES[number]) ?? "brown");
  const [temp, setTemp] = useState<"warm" | "neutral" | "cool">((row.color_temperature as "warm" | "neutral" | "cool") ?? "neutral");
  const [notes, setNotes] = useState(row.color_notes ?? "");

  useEffect(() => {
    setHex(row.color_hex ?? "#888888");
    setFamily((row.color_family as typeof FAMILIES[number]) ?? "brown");
    setTemp((row.color_temperature as "warm" | "neutral" | "cool") ?? "neutral");
    setNotes(row.color_notes ?? "");
  }, [row.rms_id, row.color_hex, row.color_family, row.color_temperature, row.color_notes]);

  return (
    <div className="border-t border-charcoal/10 pt-3 mt-3">
      <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Manual override</div>
      <div className="flex items-center gap-2 mb-3">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)}
          className="w-10 h-10 border border-charcoal/20" />
        <input type="text" value={hex} onChange={(e) => setHex(e.target.value)}
          className="flex-1 border border-charcoal/20 px-2 py-1 text-xs font-mono" />
      </div>

      <div className="grid grid-cols-3 gap-1 mb-3">
        {FAMILIES.map((f) => (
          <button key={f} onClick={() => setFamily(f)}
            className={[
              "text-[10px] uppercase px-1 py-1 border",
              family === f ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15",
            ].join(" ")}
            style={family === f ? undefined : { background: FAMILY_SWATCH[f]?.startsWith("linear") ? undefined : FAMILY_SWATCH[f] + "33" }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3 text-xs">
        {(["warm", "neutral", "cool"] as const).map((t) => (
          <button key={t} onClick={() => setTemp(t)}
            className={["flex-1 py-1 border uppercase", temp === t ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15"].join(" ")}>
            {t}
          </button>
        ))}
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Override reason (optional)"
        className="w-full border border-charcoal/20 px-2 py-1 text-xs mb-3" rows={2} />

      <div className="flex gap-2">
        <button disabled={busy} onClick={() => onSave({ hex, family, temperature: temp, notes, lock: true })}
          className="flex-1 bg-charcoal text-white py-2 text-xs uppercase tracking-widest disabled:opacity-50">
          Save & Lock
        </button>
        <button disabled={busy} onClick={onLockToggle}
          className="px-3 border border-charcoal/30 text-xs uppercase">
          {row.color_locked ? "Unlock" : "Lock"}
        </button>
        <button disabled={busy} onClick={onClear}
          className="px-3 border border-charcoal/30 text-xs uppercase">
          Clear
        </button>
      </div>
    </div>
  );
}
