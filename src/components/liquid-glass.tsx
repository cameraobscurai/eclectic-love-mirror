import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

let filterInjected = false;
function injectGlassFilter() {
  if (filterInjected || typeof document === "undefined") return;
  filterInjected = true;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <defs>
      <filter id="liquid-glass-refract" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGBLinear">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.025" numOctaves="3" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
        <feComposite in="blurred" in2="SourceGraphic" operator="in" />
      </filter>
      <filter id="liquid-glass-refract-hover" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGBLinear">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.025" numOctaves="3" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred" />
        <feComposite in="blurred" in2="SourceGraphic" operator="in" />
      </filter>
    </defs>`;
  document.body.appendChild(svg);
}

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  hovered?: boolean;
  rounded?: string;
}

export function LiquidGlass({
  children,
  className,
  hovered = false,
  rounded = "rounded-[14px]",
}: LiquidGlassProps) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.3 });
  useEffect(() => {
    injectGlassFilter();
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }
  function handleMouseLeave() {
    setMousePos({ x: 0.5, y: 0.3 });
  }
  const specX = Math.round(mousePos.x * 100);
  const specY = Math.round(mousePos.y * 100);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", rounded, className)}
      style={{ isolation: "isolate" }}
    >
      <div
        aria-hidden
        className={cn("absolute inset-0", rounded)}
        style={{
          backdropFilter: hovered
            ? "blur(20px) saturate(1.2) brightness(1.15)"
            : "blur(12px) saturate(1.1) brightness(1.1)",
          WebkitBackdropFilter: hovered
            ? "blur(20px) saturate(1.2) brightness(1.15)"
            : "blur(12px) saturate(1.1) brightness(1.1)",
          filter: hovered
            ? "url(#liquid-glass-refract-hover)"
            : "url(#liquid-glass-refract)",
          background: hovered
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.015)",
          transition: "backdrop-filter 0.4s ease, background 0.4s ease",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className={cn("absolute inset-0 pointer-events-none", rounded)}
        style={{
          background: `radial-gradient(ellipse 80% 60% at ${specX}% ${specY}%, rgba(255,255,255,${
            hovered ? "0.10" : "0.04"
          }) 0%, rgba(255,255,255,0.015) 60%, transparent 90%)`,
          transition: hovered ? "background 0.15s ease" : "background 0.6s ease",
          zIndex: 1,
        }}
      />
      <div
        aria-hidden
        className={cn("absolute inset-0 pointer-events-none", rounded)}
        style={{
          boxShadow: hovered
            ? "inset 0 1px 0 0 rgba(255,255,255,0.18), inset 1px 0 0 0 rgba(255,255,255,0.08), inset 0 -1px 0 0 rgba(255,255,255,0.03), inset -1px 0 0 0 rgba(255,255,255,0.03)"
            : "inset 0 1px 0 0 rgba(255,255,255,0.08), inset 1px 0 0 0 rgba(255,255,255,0.03), inset 0 -1px 0 0 rgba(255,255,255,0.015), inset -1px 0 0 0 rgba(255,255,255,0.015)",
          transition: "box-shadow 0.35s ease",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className={cn("absolute inset-0 pointer-events-none", rounded)}
        style={{
          background: `linear-gradient(to bottom, transparent 70%, rgba(0,0,0,${
            hovered ? "0.12" : "0.18"
          }) 100%)`,
          transition: "background 0.35s ease",
          zIndex: 3,
        }}
      />
      <div className="relative" style={{ zIndex: 4 }}>
        {children}
      </div>
    </div>
  );
}
