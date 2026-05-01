import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/atelier", label: "Atelier by The Hive" },
  { href: "/collection", label: "Hive Signature Collection" },
  { href: "/gallery", label: "The Gallery" },
  { href: "/contact", label: "Contact" },
] as const;

const LIGHT_BG_PAGES = [
  "/atelier",
  "/collection",
  "/contact",
  "/faq",
  "/privacy",
  "/process",
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const pathname = location.pathname;
  const burgerRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);

  const isLightPage = LIGHT_BG_PAGES.includes(pathname);

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

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.removeProperty("overflow");
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-charcoal/95 backdrop-blur-sm"
            : isLightPage
            ? "bg-cream/80 backdrop-blur-sm"
            : "bg-transparent",
          hidden && !isOpen ? "-translate-y-full" : "translate-y-0"
        )}
      >
        <nav
          className={cn(
            "flex items-center justify-between px-6 lg:px-12 transition-all duration-300",
            scrolled ? "py-4 lg:py-5" : "py-6 lg:py-8"
          )}
        >
          <Link to="/" className="relative" aria-label="ECLECTIC HIVE — home">
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
                  className={cn(
                    "relative group text-xs tracking-[0.2em] uppercase font-light transition-colors duration-300",
                    dark
                      ? active
                        ? "text-cream"
                        : "text-cream/70 hover:text-cream"
                      : active
                      ? "text-charcoal"
                      : "text-charcoal/70 hover:text-charcoal"
                  )}
                >
                  {link.label}
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
      >
        <div className="flex flex-col h-full pt-24 px-6 pb-12">
          <nav className="flex-1 flex flex-col justify-center">
            <Link to="/" className="py-4 min-h-[44px] flex items-center">
              <span className="text-cream font-display text-[7vw] sm:text-4xl md:text-5xl tracking-tight font-light italic hover:text-sand transition-colors">
                Home
              </span>
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="py-4 min-h-[44px] flex items-center"
              >
                <span
                  className={cn(
                    "font-display text-[7vw] sm:text-4xl md:text-5xl tracking-tight font-light italic transition-colors",
                    pathname === link.href
                      ? "text-cream"
                      : "text-cream/70 hover:text-cream"
                  )}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="pt-8 border-t border-cream/10">
            <p className="text-cream/40 text-sm">Denver, Colorado</p>
            <a
              href="mailto:hello@eclectichive.com"
              className="text-cream/60 text-sm hover:text-cream transition-colors"
            >
              hello@eclectichive.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
