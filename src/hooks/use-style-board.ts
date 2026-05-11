import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeMoodboard,
  type AnalysisResult,
  type ColorInfo,
  type ToneAnalysis,
  type DesignInsight,
} from "@/lib/color-engine";
import {
  getStudioWorkspace,
  signInspoUploadUrl,
  getInspoSignedUrls,
  saveStyleBoard,
  deleteInspoFile,
  type InspoImageRecord,
  type StudioInquiry,
} from "@/server/studio.functions";
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";

export type BoardStatus = "draft" | "ready" | "sent";

export interface InspoTile extends InspoImageRecord {
  signed_url?: string;
}

interface State {
  ready: boolean;
  boardId: string | null;
  status: BoardStatus;
  inquiry: StudioInquiry | null;
  inspo: InspoTile[];
  pinned: string[];
  palette: ColorInfo[];
  tones: ToneAnalysis | null;
  insights: DesignInsight[];
  perImage: AnalysisResult["perImage"];
  curatorNotes: string;
  analyzing: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;
}

const empty = (): State => ({
  ready: false,
  boardId: null,
  status: "draft",
  inquiry: null,
  inspo: [],
  pinned: [],
  palette: [],
  tones: null,
  insights: [],
  perImage: [],
  curatorNotes: "",
  analyzing: false,
  saving: false,
  dirty: false,
  error: null,
});

export function useStyleBoard(inquiryId: string) {
  const [state, setState] = useState<State>(empty);
  const [catalog, setCatalog] = useState<Map<string, CollectionProduct>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load catalog (cached at module level downstream).
  useEffect(() => {
    let alive = true;
    getCollectionCatalog().then(({ products }) => {
      if (!alive) return;
      const m = new Map<string, CollectionProduct>();
      for (const p of products) m.set(String(p.id), p);
      setCatalog(m);
    });
    return () => { alive = false; };
  }, []);

  // Load workspace (inquiry + board).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ws = (await getStudioWorkspace({ data: { inquiryId } })) as { inquiry: StudioInquiry; board: import("@/server/studio.functions").StyleBoardRow | null };
        if (!alive) return;
        const board = ws.board;
        let pinned: string[];
        if (board) {
          pinned = board.pinned_rms_ids ?? [];
        } else {
          // Seed from inquiry.item_snapshots (the rms_ids the visitor pinned).
          const snaps = (ws.inquiry.item_snapshots ?? []) as Array<Record<string, unknown>>;
          const fromSnaps = snaps
            .map((s) => String((s.id ?? s.rms_id ?? "") as string))
            .filter(Boolean);
          const fromMeta = ((ws.inquiry.metadata?.rms_ids as string[] | undefined) ?? [])
            .map(String);
          pinned = Array.from(new Set([...fromSnaps, ...fromMeta]));
        }
        const inspo = (board?.inspo_images ?? []) as InspoTile[];
        // Hydrate signed URLs for any existing inspo tiles.
        let hydrated = inspo;
        if (inspo.length) {
          const map = await getInspoSignedUrls({ data: { paths: inspo.map((i) => i.storage_path) } });
          hydrated = inspo.map((i) => ({ ...i, signed_url: map[i.storage_path] }));
        }
        setState((s) => ({
          ...s,
          ready: true,
          boardId: board?.id ?? null,
          status: (board?.status as BoardStatus) ?? "draft",
          inquiry: ws.inquiry,
          inspo: hydrated,
          pinned,
          palette: (board?.palette as ColorInfo[]) ?? [],
          tones: ((board?.tones as unknown) as ToneAnalysis) ?? null,
          insights: (board?.insights as DesignInsight[]) ?? [],
          curatorNotes: board?.curator_notes ?? "",
          dirty: false,
        }));
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, ready: true, error: (e as Error).message }));
      }
    })();
    return () => { alive = false; };
  }, [inquiryId]);

  const addInspoFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 12);
    const added: InspoTile[] = [];
    for (const f of arr) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const { uploadUrl, storage_path } = await signInspoUploadUrl({ data: { inquiryId, ext } });
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type, "x-upsert": "true" },
        body: f,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      added.push({
        id: crypto.randomUUID(),
        name: f.name,
        storage_path,
        signed_url: URL.createObjectURL(f), // immediate preview; we'll re-hydrate via signed URL on next load
      });
    }
    setState((s) => ({ ...s, inspo: [...s.inspo, ...added].slice(0, 12), dirty: true }));
  }, [inquiryId]);

  const removeInspo = useCallback(async (id: string) => {
    let removedPath: string | null = null;
    setState((s) => {
      const target = s.inspo.find((x) => x.id === id);
      removedPath = target?.storage_path ?? null;
      return { ...s, inspo: s.inspo.filter((x) => x.id !== id), dirty: true };
    });
    if (removedPath) {
      try { await deleteInspoFile({ data: { path: removedPath } }); } catch { /* swallow */ }
    }
  }, []);

  const pin = useCallback((rmsId: string) => {
    setState((s) => s.pinned.includes(rmsId)
      ? s
      : { ...s, pinned: [...s.pinned, rmsId], dirty: true });
  }, []);

  const unpin = useCallback((rmsId: string) => {
    setState((s) => ({ ...s, pinned: s.pinned.filter((x) => x !== rmsId), dirty: true }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, curatorNotes: notes, dirty: true }));
  }, []);

  const analyze = useCallback(async () => {
    setState((s) => ({ ...s, analyzing: true, error: null }));
    try {
      // Re-sign inspo URLs for stable, non-blob sources (canvas needs CORS-safe URLs).
      const paths = state.inspo.map((i) => i.storage_path);
      const signedMap = paths.length
        ? await getInspoSignedUrls({ data: { paths } })
        : {};
      const inspoImgs = state.inspo
        .map((i) => ({ id: i.id, name: i.name, url: signedMap[i.storage_path] || i.signed_url || "" }))
        .filter((x) => x.url);

      const catImgs = state.pinned
        .map((rms) => {
          const p = catalog.get(rms);
          if (!p?.primaryImage) return null;
          return { id: `inv:${rms}`, name: p.title, url: p.primaryImage.url };
        })
        .filter((x): x is { id: string; name: string; url: string } => Boolean(x));

      const all = [...inspoImgs, ...catImgs];
      if (!all.length) {
        setState((s) => ({ ...s, analyzing: false, error: "Add inspiration images or pin pieces first" }));
        return;
      }
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const result = await analyzeMoodboard(all, canvasRef.current);
      setState((s) => ({
        ...s,
        analyzing: false,
        palette: result.palette,
        tones: result.tones,
        insights: result.insights,
        perImage: result.perImage,
        dirty: true,
      }));
    } catch (e) {
      setState((s) => ({ ...s, analyzing: false, error: (e as Error).message }));
    }
  }, [state.inspo, state.pinned, catalog]);

  const save = useCallback(async (status?: BoardStatus) => {
    setState((s) => ({ ...s, saving: true }));
    try {
      const row = (await saveStyleBoard({
        data: {
          inquiryId,
          boardId: state.boardId,
          status: status ?? state.status,
          inspo: state.inspo.map(({ id, name, storage_path }) => ({ id, name, storage_path })),
          pinned: state.pinned,
          palette: state.palette as unknown[],
          tones: (state.tones ?? {}) as Record<string, unknown>,
          insights: state.insights as unknown[],
          curatorNotes: state.curatorNotes || null,
        },
      })) as import("@/server/studio.functions").StyleBoardRow;
      setState((s) => ({
        ...s,
        boardId: row.id,
        status: row.status as BoardStatus,
        saving: false,
        dirty: false,
      }));
    } catch (e) {
      setState((s) => ({ ...s, saving: false, error: (e as Error).message }));
    }
  }, [inquiryId, state.boardId, state.status, state.inspo, state.pinned, state.palette, state.tones, state.insights, state.curatorNotes]);

  return {
    state,
    catalog,
    addInspoFiles,
    removeInspo,
    pin,
    unpin,
    setNotes,
    analyze,
    save,
  };
}
