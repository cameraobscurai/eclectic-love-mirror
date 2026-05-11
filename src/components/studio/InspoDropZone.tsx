import { useRef, useState, useCallback } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

interface Props {
  onFiles: (files: FileList | File[]) => Promise<void> | void;
  disabled?: boolean;
  count: number;
  max?: number;
}

export function InspoDropZone({ onFiles, disabled, count, max = 12 }: Props) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(async (files: FileList | File[]) => {
    setBusy(true);
    try { await onFiles(files); } finally { setBusy(false); }
  }, [onFiles]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) { handle(e.target.files); e.target.value = ""; } }}
      />
      <div
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) handle(e.dataTransfer.files); }}
        className={`border border-dashed rounded-sm min-h-[160px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors p-8 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${over ? "border-charcoal/60 bg-charcoal/5" : "border-charcoal/25 hover:border-charcoal/50 hover:bg-charcoal/[0.03]"}`}
      >
        {busy ? <Loader2 className="h-6 w-6 text-charcoal/50 animate-spin" /> : <ImagePlus className="h-6 w-6 text-charcoal/50" />}
        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/65 text-center">
          {busy ? "Uploading…" : "Drop inspiration images"}
        </p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
          {count} / {max}
        </p>
      </div>
    </>
  );
}
