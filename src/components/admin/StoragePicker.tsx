import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Check } from "lucide-react";
import { listStorageFiles } from "@/lib/photos-admin.functions";

type Props = {
  rmsId: string | null;
  existingUrls: string[];
  onPick: (urls: string[]) => void;
};

type ItemFile = { url: string; name: string; updatedAt: string | null };
type RecentFile = ItemFile & { folder: string };

export function StoragePicker({ rmsId, existingUrls, onPick }: Props) {
  const fn = useServerFn(listStorageFiles);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemFiles, setItemFiles] = useState<ItemFile[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fn({ data: { rmsId, limit: 60, search: search || undefined } })
      .then((r) => {
        if (!alive) return;
        setItemFiles(r.itemFiles);
        setRecent(r.recent);
      })
      .catch((e) => alive && setErr((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fn, rmsId, search]);

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const attach = () => {
    if (selected.size === 0) return;
    onPick(Array.from(selected));
    setSelected(new Set());
  };

  const isAlready = (url: string) => existingUrls.includes(url);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename…"
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-neutral-300 uppercase tracking-widest focus:outline-none focus:border-neutral-600"
          />
        </div>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={attach}
          className="text-[11px] uppercase tracking-widest border border-neutral-900 bg-neutral-900 text-white px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Attach {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {rmsId && (
            <Section
              title={`This item · ${itemFiles.length}`}
              empty="No files in this item's folder."
              files={itemFiles}
              selected={selected}
              isAlready={isAlready}
              onToggle={toggle}
            />
          )}
          <Section
            title={`Recent uploads · ${recent.length}`}
            empty="Nothing recent."
            files={recent}
            selected={selected}
            isAlready={isAlready}
            onToggle={toggle}
            showFolder
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  files,
  selected,
  isAlready,
  onToggle,
  showFolder = false,
}: {
  title: string;
  empty: string;
  files: Array<{ url: string; name: string; folder?: string }>;
  selected: Set<string>;
  isAlready: (url: string) => boolean;
  onToggle: (url: string) => void;
  showFolder?: boolean;
}) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
        {title}
      </h4>
      {files.length === 0 ? (
        <p className="text-xs text-neutral-400">{empty}</p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {files.map((f) => {
            const already = isAlready(f.url);
            const sel = selected.has(f.url);
            return (
              <button
                key={f.url}
                type="button"
                disabled={already}
                onClick={() => onToggle(f.url)}
                className={`group relative aspect-square bg-neutral-100 border transition-all ${
                  sel
                    ? "border-emerald-600 border-2 ring-2 ring-emerald-200"
                    : already
                    ? "border-neutral-300 opacity-40 cursor-not-allowed"
                    : "border-neutral-300 hover:border-neutral-600"
                }`}
                title={showFolder && f.folder ? `${f.folder} / ${f.name}` : f.name}
              >
                <img
                  src={f.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {already && (
                  <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-[10px] uppercase tracking-widest text-neutral-700">
                    Attached
                  </span>
                )}
                {sel && (
                  <span className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {showFolder && f.folder && (
                  <span className="absolute bottom-1 left-1 text-[9px] uppercase tracking-widest bg-black/60 text-white px-1 py-0.5 truncate max-w-[90%]">
                    {f.folder}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
