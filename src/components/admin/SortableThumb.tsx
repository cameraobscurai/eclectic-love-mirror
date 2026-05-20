import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Trash2, Image as ImageIcon } from "lucide-react";

type Props = {
  url: string;
  index: number;
  isCover: boolean;
  isBackground: boolean;
  onPromote: () => void;
  onDelete: () => void;
  onSetBackground: () => void;
};

export function SortableThumb({
  url,
  index,
  isCover,
  isBackground,
  onPromote,
  onDelete,
  onSetBackground,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square bg-neutral-100 border ${
        isCover ? "border-emerald-500 border-2" : "border-neutral-300"
      }`}
    >
      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />

      {isCover && (
        <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-semibold">
          Cover
        </span>
      )}
      {isBackground && !isCover && (
        <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] uppercase tracking-widest px-1.5 py-0.5">
          BG
        </span>
      )}
      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
        {index + 1}
      </span>

      {/* Drag handle — visible on hover */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-white border border-neutral-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Hover action bar */}
      <div className="absolute bottom-0 inset-x-0 flex justify-end gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {!isCover && (
          <button
            type="button"
            onClick={onPromote}
            title="Set as cover"
            className="p-1 bg-white/90 hover:bg-white border border-neutral-300"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onSetBackground}
          title={isBackground ? "Backdrop set" : "Use as card backdrop"}
          className={`p-1 border border-neutral-300 ${
            isBackground ? "bg-indigo-500 text-white" : "bg-white/90 hover:bg-white"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Remove"
          className="p-1 bg-white/90 hover:bg-red-50 border border-neutral-300 text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
