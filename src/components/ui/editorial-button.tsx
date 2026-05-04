import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * EditorialButton — single source of truth for the project's editorial CTAs.
 *
 * Goals:
 * - Consistent typography (uppercase, tracking 0.22em, text-[11px])
 * - WCAG AA touch targets (min 44px height on md/lg)
 * - Unified focus ring (charcoal/40, ring-offset-2 on cream)
 * - Pass-through aria-pressed / aria-busy for stateful CTAs
 * - `loading` prop swaps in an inline pulse and sets aria-busy + aria-disabled
 *   (preferred over native `disabled`, which removes the element from the
 *   accessible name tree and breaks aria-describedby relationships).
 */
const editorialButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "uppercase tracking-[0.22em] font-medium",
    "border transition-colors motion-reduce:transition-none",
    "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
    "aria-disabled:opacity-50 aria-disabled:cursor-not-allowed",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  {
    variants: {
      variant: {
        // Inverted fill — primary CTA on cream surfaces
        solid:
          "bg-charcoal text-cream border-charcoal hover:bg-charcoal/85 active:scale-[0.98]",
        // Hairline outline — default editorial CTA
        outline:
          "bg-transparent text-charcoal border-charcoal hover:bg-charcoal hover:text-cream",
        // Text-only — quiet utility actions (REMOVE, etc.)
        ghost:
          "bg-transparent border-transparent text-charcoal/55 hover:text-charcoal",
      },
      size: {
        // Compact, still ≥36px (use only for inline utility actions like REMOVE)
        sm: "h-9 px-4 text-[10px]",
        // Default editorial CTA — 44px touch target
        md: "h-11 px-7 text-[11px]",
        // Primary form submit
        lg: "h-12 px-8 text-xs",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export interface EditorialButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof editorialButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** When true, disables interaction via aria-disabled (keeps focusable). */
  disabled?: boolean;
}

export const EditorialButton = React.forwardRef<
  HTMLButtonElement,
  EditorialButtonProps
>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled = false,
      type,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const inert = loading || disabled;
    return (
      <Comp
        ref={ref}
        // Default to type="button" to avoid accidental form submits
        type={asChild ? undefined : (type ?? "button")}
        aria-busy={loading || undefined}
        aria-disabled={inert || undefined}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (inert) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick?.(e);
        }}
        className={cn(editorialButtonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"
          />
        ) : null}
        {children}
      </Comp>
    );
  },
);
EditorialButton.displayName = "EditorialButton";

export { editorialButtonVariants };
