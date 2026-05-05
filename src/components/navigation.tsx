import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { acquireScrollLock } from "@/lib/scroll-lock";

// Brand signature per the deck: "ATELIER *by* THE HIVE" — lowercase italic
// "by" set in Saol Display between caps. Render as JSX so the italic survives
// the site-wide ALL-CAPS rule (CSS `text-transform: uppercase` would kill it).
const NAV_LINKS = [
  {
    href: "/atelier",
    label: "ATELIER BY THE HIVE",
    render: (
      <>
        ATELIER{" "}
        <span
          className="font-display italic font-light normal-case lowercase"
          style={{
            // Saol italic needs room — bump 1.35× and pull tracking back to 0,
            // matching the deck's signature lockup.
            fontSize: "1.35em",
            letterSpacing: "0",
            margin: "0 0.08em",
            verticalAlign: "baseline",
          }}
        >
          by
        </span>{" "}
        THE HIVE
      </>
    ),
  },
  { href: "/collection", label: "HIVE SIGNATURE COLLECTION", render: "HIVE SIGNATURE COLLECTION" },
  { href: "/gallery", label: "THE GALLERY", render: "THE GALLERY" },
  { href: "/contact", label: "CONTACT", render: "CONTACT" },
] as const;


// Pages with a light hero where the nav must invert to charcoal text.
// Collection is intentionally pure white (auction-house archive); cream-hero
// pages get cream nav, white archive gets white. Gallery is intentionally
// DARK (cinematic exhibition page) — it stays out of LIGHT_BG_PAGES so the
// nav renders cream-on-charcoal there.
const LIGHT_BG_PAGES = [
  "/atelier",
  "/collection",
  "/contact",
  "/privacy",
];

const WHITE_BG_PAGES = ["/collection"];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const pathname = location.pathname;
  const burgerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);

  // Reactively expose the rendered nav height as `--nav-h` on :root so route
  // <main> wrappers (and the gallery masthead height clamp) can offset
  // correctly. The nav shrinks on scroll (py-6→py-4) so a hardcoded value
  // would always be wrong on at least one state.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isLightPage = LIGHT_BG_PAGES.includes(pathname);
  const isWhitePage = WHITE_BG_PAGES.includes(pathname);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, (y / docHeight) * 100) : 0);
      setScrolled(y > 40);
      if (y > lastScrollY.current && y > 200) setHidden(true);
      else setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open. Goes through the shared
  // ref-counted lock so it can't fight Quick View / lightbox locks on close.
  useEffect(() => {
    if (!isOpen) return undefined;
    const release = acquireScrollLock();
    return release;
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          // Glass frost on every state — keeps the bar legible against the
          // home photo (which previously rendered the nav invisible) while
          // staying consistent with the hero wordmark band.
          "backdrop-blur-md backdrop-saturate-150",
          "border-b",
          scrolled
            ? "bg-charcoal/70 border-cream/10"
            : isWhitePage
            ? "bg-white/65 border-charcoal/10"
            : isLightPage
            ? "bg-cream/65 border-charcoal/10"
            : "bg-charcoal/30 border-cream/15",
          hidden && !isOpen ? "-translate-y-full" : "translate-y-0"
        )}
        style={{
          WebkitBackdropFilter: "blur(14px) saturate(1.5)",
        }}
      >
        <nav
          className={cn(
            "flex items-center justify-between px-6 lg:px-12 transition-all duration-300",
            scrolled ? "py-4 lg:py-5" : "py-6 lg:py-8"
          )}
        >
          <Link to="/" preload="intent" className="relative" aria-label="ECLECTIC HIVE — home">
            <span
              className={cn(
                "font-brand text-[0.8rem] lg:text-[0.9rem] tracking-[0.18em] uppercase transition-colors duration-300",
                scrolled
                  ? "text-cream"
                  : isLightPage
                  ? "text-charcoal"
                  : "text-cream"
              )}
              style={{ fontWeight: 400 }}
            >
              ECLECTIC HIVE
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-12">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              const dark = scrolled || !isLightPage;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  preload="intent"
                  className={cn(
                    "relative group text-[13px] xl:text-[14px] tracking-[0.28em] uppercase font-light transition-colors duration-300",
                    dark
                      ? active
                        ? "text-cream"
                        : "text-cream/70 hover:text-cream"
                      : active
                      ? "text-charcoal"
                      : "text-charcoal/70 hover:text-charcoal"
                  )}
                >
                  {link.render}
                  <span
                    className={cn(
                      "absolute -bottom-1 left-0 w-full h-px origin-left transition-transform duration-300",
                      dark ? "bg-cream/50" : "bg-charcoal/50",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          <button
            ref={burgerRef}
            onClick={() => setIsOpen((o) => !o)}
            className="lg:hidden flex flex-col justify-center items-center w-11 h-11 -mr-2"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            <span
              className={cn(
                "w-6 h-px transition-all duration-300",
                scrolled || !isLightPage ? "bg-cream" : "bg-charcoal",
                isOpen ? "rotate-45 translate-y-px" : "-translate-y-1"
              )}
            />
            <span
              className={cn(
                "w-6 h-px transition-all duration-300",
                scrolled || !isLightPage ? "bg-cream" : "bg-charcoal",
                isOpen ? "-rotate-45" : "translate-y-1"
              )}
            />
          </button>
        </nav>

        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-px",
            scrolled || !isLightPage ? "bg-cream/5" : "bg-charcoal/10"
          )}
          aria-hidden
        >
          <div
            className="h-full bg-sand"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-charcoal transition-all duration-700 ease-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ overscrollBehavior: "contain" }}
      >
        <div
          className="flex flex-col h-[100dvh] pt-24 px-6 pb-12"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          <nav className="flex-1 flex flex-col justify-center">
            <Link to="/" preload="intent" className="py-4 min-h-[44px] flex items-center">
              <span className="text-cream font-display text-[7vw] sm:text-4xl md:text-5xl tracking-[0.04em] uppercase font-light hover:text-sand transition-colors">
                Home
              </span>
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                preload="intent"
                className="py-4 min-h-[44px] flex items-center"
              >
                <span
                  className={cn(
                    "font-display text-[7vw] sm:text-4xl md:text-5xl tracking-[0.04em] uppercase font-light transition-colors",
                    pathname === link.href
                      ? "text-cream"
                      : "text-cream/70 hover:text-cream"
                  )}
                >
                  {link.render}
                </span>
              </Link>
            ))}
          </nav>
          <div className="pt-8 border-t border-cream/10">
            <p className="text-cream/40 text-sm">Denver, Colorado</p>
            <a
              href="mailto:info@eclectichive.com"
              className="text-cream/60 text-sm hover:text-cream transition-colors"
            >
              info@eclectichive.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
