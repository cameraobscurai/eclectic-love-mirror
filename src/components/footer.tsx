import { Link } from "@tanstack/react-router";

const studioLinks = [
  { href: "/atelier", label: "ATELIER BY THE HIVE" },
  { href: "/collection", label: "HIVE SIGNATURE COLLECTION" },
  { href: "/gallery", label: "THE GALLERY" },
] as const;

const informationLinks = [
  { href: "/contact", label: "FAQ", hash: "faq" },
  { href: "https://eclectic-hive.breezy.hr/", label: "CAREERS", external: true },
  { href: "/privacy", label: "PRIVACY" },
] as const;

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream border-t border-cream/10">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-12 sm:pt-16 lg:pt-24 pb-8 lg:pb-10">
        {/* Top: brand block + columns. Mobile uses 2-col so STUDIO/INFO/CONNECT
            don't each become a full-width block adding ~150px each. */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 sm:gap-10 md:gap-10">
          {/* Brand block — full row on mobile so the wordmark sets the tone. */}
          <div className="col-span-2 md:col-span-5">
            <h2 className="font-brand text-[1.05rem] sm:text-[1.2rem] lg:text-[1.5rem] tracking-[0.16em] sm:tracking-[0.18em] uppercase font-light">
              ECLECTIC HIVE
            </h2>
            <p className="mt-4 sm:mt-6 text-cream/65 max-w-md leading-[1.6] text-[11px] sm:text-[13px] uppercase tracking-[0.14em] sm:tracking-[0.18em]">
              AN ATELIER OF DESIGN AND PRODUCTION. CONCEPT, FABRICATION, AND SPACE — IMMERSIVE ENVIRONMENTS.
            </p>
            <p className="mt-3 text-cream/55 max-w-md text-[11px] sm:text-[13px] uppercase tracking-[0.14em] sm:tracking-[0.18em]">
              DENVER, COLORADO
            </p>
          </div>

          <FooterColumn title="STUDIO" links={studioLinks} className="md:col-span-2" />
          <FooterColumn
            title="INFORMATION"
            links={informationLinks}
            className="md:col-span-2"
          />

          {/* Connect column */}
          <div className="col-span-2 md:col-span-3">
            <h3 className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.28em] text-cream/40 mb-3 sm:mb-5">
              CONNECT
            </h3>
            <ul className="space-y-2.5 sm:space-y-3">
              <li>
                <Link
                  to="/contact"
                  className="inline-block py-1 text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cream/70 hover:text-cream transition-colors"
                >
                  START A CONVERSATION
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@eclectichive.com"
                  className="inline-block py-1 text-[12px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-cream/70 hover:text-cream transition-colors break-all"
                >
                  INFO@ECLECTICHIVE.COM
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom rule — quiet copyright */}
        <div className="mt-10 sm:mt-16 pt-5 sm:pt-6 border-t border-cream/10 flex flex-col md:flex-row justify-between gap-2 sm:gap-3 text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.28em] text-cream/35">
          <p>© {new Date().getFullYear()} ECLECTIC HIVE</p>
          <p>DENVER, COLORADO</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: ReadonlyArray<{ href: string; label: string; hash?: string; external?: boolean }>;
  className?: string;
}

function FooterColumn({ title, links, className }: FooterColumnProps) {
  const linkClass =
    "inline-block py-1 text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cream/70 hover:text-cream transition-colors";
  return (
    <div className={className}>
      <h3 className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.28em] text-cream/40 mb-3 sm:mb-5">
        {title}
      </h3>
      <ul className="space-y-2.5 sm:space-y-3">
        {links.map((l) => (
          <li key={`${l.href}${l.hash ?? ""}`}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {l.label}
              </a>
            ) : (
              <Link to={l.href} hash={l.hash} className={linkClass}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
