import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { X, Upload, Loader2, FolderOpen, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { SortableThumb } from "./SortableThumb";
import { FocalEditor } from "./FocalEditor";
import { StoragePicker } from "./StoragePicker";
import {
  updateItemImages,
  setCardBackground,
  uploadItemImage,
} from "@/lib/inventory-images.functions";

type Item = {
  id: string;
  rms_id: string | null;
  title: string;
  images: string[];
  card_background_url?: string | null;
};

type Props = {
  item: Item;
  onClose: () => void;
  onSaved: (next: { images: string[]; card_background_url: string | null }) => void;
  /** When true, render inline (no fixed modal shell, no backdrop, no close X). */
  embedded?: boolean;
};

export function ImageOrderEditor({ item, onClose, onSaved, embedded = false }: Props) {
  const [urls, setUrls] = useState<string[]>(item.images ?? []);
  const [bg, setBg] = useState<string | null>(item.card_background_url ?? null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [tab, setTab] = useState<"manage" | "pick">("manage");

  const lastSavedRef = useRef<string[]>(item.images ?? []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useServerFn(updateItemImages);
  const setBgFn = useServerFn(setCardBackground);
  const uploadFn = useServerFn(uploadItemImage);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const flushSave = useCallback(
    async (next: string[]) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      setSaveState("saving");
      try {
        await update({
          data: {
            id: item.id,
            images: next,
            expectedLength: lastSavedRef.current.length,
          },
        });
        lastSavedRef.current = next;
        setSaveState("saved");
        setErrMsg(null);
        onSaved({ images: next, card_background_url: bg });
      } catch (e) {
        const msg = (e as Error).message || "Save failed";
        setErrMsg(msg);
        setSaveState("error");
        // STALE = our expectedLength disagrees with the server. Rolling back
        // to lastSavedRef would re-send the same wrong expectation forever
        // and trap the user. Re-sync from the server instead.
        if (msg.startsWith("STALE")) {
          const { data: fresh } = await supabase
            .from("inventory_items")
            .select("images, card_background_url")
            .eq("id", item.id)
            .single();
          const truth = (fresh?.images ?? []) as string[];
          lastSavedRef.current = truth;
          setUrls(truth);
          if (fresh?.card_background_url !== undefined) {
            setBg(fresh.card_background_url as string | null);
          }
        } else {
          setUrls(lastSavedRef.current);
        }
        throw e;
      }
    },
    [item.id, update, onSaved, bg],
  );

  const scheduleSave = useCallback(
    (next: string[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave(next).then(() => {
          setTimeout(
            () => setSaveState((s) => (s === "saved" ? "idle" : s)),
            3000,
          );
        }).catch(() => {});
      }, 400);
    },
    [flushSave],
  );

  // Close handler: flush any pending save before unmounting so the star /
  // reorder / delete the user just clicked actually persists.
  const handleClose = useCallback(async () => {
    if (saveTimer.current) {
      try {
        await flushSave(urls);
      } catch {
        // flushSave already surfaced the error + rolled back state.
        return;
      }
    }
    onClose();
  }, [flushSave, urls, onClose]);


  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Escape key closes the modal — keyboard-first users were trapped before.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const apply = (next: string[]) => {
    setUrls(next);
    scheduleSave(next);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveUrl(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveUrl(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = urls.indexOf(String(active.id));
    const newIdx = urls.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    apply(arrayMove(urls, oldIdx, newIdx));
  };

  const promote = (url: string) => {
    if (urls[0] === url) return;
    apply([url, ...urls.filter((u) => u !== url)]);
  };
  const remove = (url: string) => {
    apply(urls.filter((u) => u !== url));
  };
  const toggleBackground = async (url: string) => {
    const next = bg === url ? null : url;
    setBg(next);
    try {
      await setBgFn({ data: { id: item.id, url: next } });
      onSaved({ images: urls, card_background_url: next });
    } catch (e) {
      setErrMsg((e as Error).message);
      setBg(bg);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setErrMsg(null);
    try {
      const arr = Array.from(files);
      const appended: string[] = [];
      for (const file of arr) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) continue;
        if (file.size > 10 * 1024 * 1024) {
          setErrMsg(`${file.name} exceeds 10MB`);
          continue;
        }
        const buf = new Uint8Array(await file.arrayBuffer());
        // chunked btoa to avoid call-stack overflow on large arrays
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          bin += String.fromCharCode(...buf.subarray(i, i + chunk));
        }
        const base64 = btoa(bin);
        const res = await uploadFn({
          data: {
            id: item.id,
            rmsId: item.rms_id,
            filename: file.name,
            contentType: file.type as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/avif",
            base64,
          },
        });
        appended.push(res.url);
      }
      if (appended.length) apply([...urls, ...appended]);
    } catch (e) {
      setErrMsg((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Re-fetch row on mount in case data is stale (single read, no refetch loop).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("images, card_background_url")
        .eq("id", item.id)
        .single();
      if (data?.images) {
        setUrls(data.images as string[]);
        lastSavedRef.current = data.images as string[];
      }
      if (data?.card_background_url !== undefined) {
        setBg(data.card_background_url as string | null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => void handleClose()}
    >
      <div
        className="bg-white max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div>
            <h2 className="font-serif text-xl text-[hsl(var(--charcoal))]">
              {item.title}
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-0.5">
              {urls.length} {urls.length === 1 ? "image" : "images"} · RMS {item.rms_id ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest">
              {saveState === "saving" && (
                <span className="text-neutral-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving
                </span>
              )}
              {saveState === "saved" && (
                <span className="text-emerald-600">Saved</span>
              )}
              {saveState === "error" && (
                <span className="text-red-600" title={errMsg ?? ""}>
                  Error — reverted
                </span>
              )}
            </span>
            <button
              onClick={() => void handleClose()}
              className="p-1 hover:bg-neutral-100 border border-neutral-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-neutral-200 px-5">
          <TabBtn active={tab === "manage"} onClick={() => setTab("manage")}>
            <LayoutGrid className="h-3.5 w-3.5" /> Manage
          </TabBtn>
          <TabBtn active={tab === "pick"} onClick={() => setTab("pick")}>
            <FolderOpen className="h-3.5 w-3.5" /> Pick from storage
          </TabBtn>
        </div>

        {/* Body */}
        <div
          className={`flex-1 overflow-auto p-5 ${
            tab === "manage" && dropActive
              ? "bg-emerald-50/50 ring-2 ring-emerald-400 ring-inset"
              : ""
          }`}
          onDragOver={(e) => {
            if (tab !== "manage") return;
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDropActive(true);
            }
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            if (tab !== "manage") return;
            if (e.dataTransfer.files.length) {
              e.preventDefault();
              setDropActive(false);
              void handleFiles(e.dataTransfer.files);
            }
          }}
        >
          {tab === "pick" ? (
            <StoragePicker
              rmsId={item.rms_id}
              existingUrls={urls}
              onPick={(picked) => {
                const next = [...urls, ...picked.filter((u) => !urls.includes(u))];
                apply(next);
                setTab("manage");
              }}
            />
          ) : urls.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 text-sm">
              No images yet. Drop files here, upload below, or pick from storage.
            </div>
          ) : (
            <div className="space-y-5">
              <FocalEditor
                id={item.id}
                coverUrl={urls[0]}
                initialX={null}
                initialY={null}
              />
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={urls} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {urls.map((url, i) => (
                      <SortableThumb
                        key={url}
                        url={url}
                        index={i}
                        isCover={i === 0}
                        isBackground={bg === url}
                        onPromote={() => promote(url)}
                        onDelete={() => remove(url)}
                        onSetBackground={() => toggleBackground(url)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeUrl && (
                    <div className="aspect-square w-full max-w-[180px] border-2 border-emerald-500 shadow-lg">
                      <img
                        src={activeUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="border-t border-neutral-200 px-5 py-3 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs uppercase tracking-widest cursor-pointer border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload images"}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            First image is the cover · Drag to reorder · Autosaves
          </p>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-widest border-b-2 -mb-px transition-colors ${
        active
          ? "border-neutral-900 text-neutral-900"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
