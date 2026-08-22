// Share a piece — native share sheet on phones, copy-to-clipboard everywhere
// else. The URL always carries the current configurator selection so a shared
// link opens on the exact variant the sender was looking at.

import { cn } from "@/lib/utils";

const SITE = "https://eclectichive.com";

export function ShareButton({
  title,
  slug,
  variantKey,
  className,
}: {
  title: string;
  slug: string;
  variantKey?: string | null;
  className?: string;
}) {
  const url = `${SITE}/collection/${slug}${variantKey ? `?v=${encodeURIComponent(variantKey)}` : ""}`;

  const onShare = async () => {
    const { toast } = await import("sonner");
    // navigator.share needs a user gesture and https; both hold here.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (e) {
        // AbortError = the user dismissed the sheet. Not a failure.
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      aria-label={`Share ${title}`}
      className={cn(
        "inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase",
        "text-muted-foreground hover:text-foreground transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40",
        className,
      )}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 15V3" />
        <path d="m8 7 4-4 4 4" />
      </svg>
      Share
    </button>
  );
}
