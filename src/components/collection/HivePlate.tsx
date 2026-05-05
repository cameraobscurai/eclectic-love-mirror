import type { CSSProperties, ReactNode } from "react";

// ---------------------------------------------------------------------------
// HivePlate — vector H landing artwork
//
// One asset, fourteen identities. The H letterform, "the HIVE" eyebrow and
// "SIGNATURE COLLECTION" footer are pure SVG (live <text> in Cormorant), so
// the composition reflows perfectly at any container size and per-category
// swaps are just a different `artifact` slot — no re-export.
//
// Container query aware: sized with `cqi` (% of slot inline-size), not the
// viewport, so the plate re-composes when the column shrinks (chat open,
// narrow window, tablet) without media queries.
// ---------------------------------------------------------------------------

export interface HivePlateProps {
  /**
   * Eyebrow above the H. Defaults to "the HIVE" — the lower-case "the"
   * stays italic per brand register.
   */
  eyebrow?: { italic: string; roman: string };
  /** Footer label under the H. Defaults to "SIGNATURE COLLECTION". */
  footer?: string;
  /**
   * Optional artifact (chair, glass, sconce) nested in the H's open
   * counter. Pass an <img> or any ReactNode — sized to ~38% of the H's
   * width and pinned to the bottom-center of the negative space.
   * Per-category override: pass a different artifact per route.
   */
  artifact?: ReactNode;
  /** Background tint. Defaults to --paper. */
  background?: string;
  /** Subtle interactivity: artifact lifts on hover. Default true. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function HivePlate({
  eyebrow = { italic: "the", roman: "HIVE" },
  footer = "SIGNATURE COLLECTION",
  artifact,
  background = "var(--paper)",
  interactive = true,
  className,
  style,
}: HivePlateProps) {
  return (
    <div
      className={`hive-plate relative grid place-items-center ${className ?? ""}`}
      data-interactive={interactive ? "true" : undefined}
      style={{
        background,
        containerType: "inline-size",
        // Outer breathing room scales with the plate's own width.
        padding: "clamp(20px, 6cqi, 72px)",
        ...style,
      }}
    >
      {/* SVG composition — viewBox tuned so the H and its labels fit
          edge-to-edge with optical balance. preserveAspectRatio meet
          centers the artwork inside any non-3:4 container. */}
      <svg
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${eyebrow.italic} ${eyebrow.roman} — ${footer}`}
        style={{
          width: "min(100%, 92cqi)",
          height: "auto",
          maxHeight: "100%",
          display: "block",
        }}
      >
        {/* Eyebrow — "the HIVE" — italic + roman pair */}
        <text
          x="380"
          y="145"
          textAnchor="middle"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 44,
            fill: "var(--charcoal)",
          }}
        >
          <tspan fontStyle="italic" fontWeight={400}>
            {eyebrow.italic}
          </tspan>
          <tspan dx={10} fontWeight={500} letterSpacing="0.04em">
            {eyebrow.roman}
          </tspan>
        </text>

        {/* The H — geometric construction with subtle serif terminals.
            Stems 70px wide, crossbar 38px tall, capped with thin flares
            top and bottom for editorial character without serif fragility. */}
        <g fill="var(--charcoal)">
          {/* Left stem */}
          <rect x="105" y="200" width="70" height="520" />
          {/* Right stem */}
          <rect x="425" y="200" width="70" height="520" />
          {/* Crossbar */}
          <rect x="175" y="455" width="250" height="38" />
          {/* Top serif flares */}
          <rect x="85" y="200" width="110" height="14" />
          <rect x="405" y="200" width="110" height="14" />
          {/* Bottom serif flares */}
          <rect x="85" y="706" width="110" height="14" />
          <rect x="405" y="706" width="110" height="14" />
        </g>

        {/* Artifact slot — only when provided. Positioned in the lower
            counter of the H (between the stems, below the crossbar) via
            a foreignObject so any DOM/raster can nest cleanly. */}
        {artifact && (
          <foreignObject
            x="200"
            y="500"
            width="200"
            height="220"
            className="hive-plate__artifact-slot"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "end center",
              }}
            >
              {artifact}
            </div>
          </foreignObject>
        )}

        {/* Footer — "SIGNATURE COLLECTION" */}
        <text
          x="300"
          y="775"
          textAnchor="middle"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "0.18em",
            fill: "var(--charcoal)",
          }}
        >
          {footer}
        </text>
      </svg>

      {/* Scoped styles — the artifact lifts gently on plate hover. */}
      <style>{`
        .hive-plate[data-interactive="true"] .hive-plate__artifact-slot > div {
          transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1),
                      filter 600ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .hive-plate[data-interactive="true"]:hover .hive-plate__artifact-slot > div {
          transform: translateY(-6px);
          filter: drop-shadow(0 18px 24px rgba(26, 26, 26, 0.12));
        }
        @media (prefers-reduced-motion: reduce) {
          .hive-plate[data-interactive="true"]:hover .hive-plate__artifact-slot > div {
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}
