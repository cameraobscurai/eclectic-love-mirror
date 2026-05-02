import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Shared layoutId for the active underline (one per pill row). */
  layoutGroupId: string;
  /** Optional variant: 'primary' (large) or 'sub' (smaller secondary row). */
  variant?: "primary" | "sub";
}

export function CategoryPill({
  label,
  active,
  onClick,
  layoutGroupId,
  variant = "primary",
}: CategoryPillProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  // Auto-scroll active pill into view (mobile horizontal scroll)
  useEffect(() => {
    if (!active || !ref.current) return;
    ref.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active, reduced]);

  const isSub = variant === "sub";

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "relative whitespace-nowrap uppercase shrink-0 snap-start transition-colors active:scale-[0.96]",
        isSub
          ? "text-[11px] tracking-[0.16em] px-3 py-1.5"
          : "text-xs tracking-[0.18em] px-3 py-2.5 pb-3",
        active
          ? "text-charcoal"
          : "text-charcoal/55 hover:text-charcoal",
      )}
      style={{ transition: "color 150ms, transform 100ms" }}
    >
      {label}
      {active && (
        <motion.div
          layoutId={layoutGroupId}
          className={cn(
            "absolute left-2 right-2 bottom-0 bg-charcoal",
            isSub ? "h-[1.5px]" : "h-[2px]",
          )}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
        />
      )}
    </button>
  );
}
