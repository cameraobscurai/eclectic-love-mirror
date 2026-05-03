import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useInquiry } from "@/hooks/use-inquiry";

export function InquiryTray() {
  const { ids, count, clear } = useInquiry();
  const reduced = useReducedMotion();
  const href = `/contact?items=${encodeURIComponent(ids.join(","))}#inquiry`;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="tray"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 60 }}
          transition={{
            duration: reduced ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed left-1/2 -translate-x-1/2 z-40 bg-charcoal text-cream shadow-2xl"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          role="region"
          aria-label="Inquiry"
        >
          <div className="flex items-center gap-5 px-5 py-3">
            <span className="text-[11px] uppercase tracking-[0.22em]">
              SELECTED PIECES
              <span className="ml-2 text-cream/60 tabular-nums">
                {String(count).padStart(2, "0")}
              </span>
            </span>
            <button
              onClick={clear}
              className="text-[10px] uppercase tracking-[0.22em] text-cream/60 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal transition-colors"
            >
              CLEAR
            </button>
            <Link
              to={href as never}
              className="bg-white text-charcoal px-4 py-2 text-[11px] uppercase tracking-[0.22em] hover:bg-white/85 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal transition-all"
            >
              REVIEW INQUIRY
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
