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

// Shared rhythm tokens — match the home page spacing system.
const COL_HEADING = "text-[11px] uppercase tracking-[0.22em] text-cream/40 mb-6 sm:mb-8";
const COL_LIST = "space-y-3 sm:space-y-4";
const LINK_CLASS =
  "inline-block py-1 text-[11px] uppercase tracking-[0.18em] text-cream/70 hover:text-cream transition-colors";
const META_CLASS = "text-[11px] uppercase tracking-[0.22em] text-cream/35";

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream border-t border-cream/10">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-16 sm:pt-20 lg:pt-24 pb-8 lg:pb-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-12 sm:gap-y-14 gap-x-8 md:gap-x-10">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-5">
            <h2 className="font-brand text-[1.25rem] lg:text-[1.4rem] tracking-[0.18em] uppercase font-light">
              ECLECTIC HIVE
            </h2>
            <p className="mt-6 sm:mt-8 text-cream/65 max-w-md leading-[1.7] text-[11px] uppercase tracking-[0.18em]">
              AN ATELIER OF DESIGN AND PRODUCTION. CONCEPT, FABRICATION, AND SPACE — IMMERSIVE ENVIRONMENTS.
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
            <h3 className={COL_HEADING}>CONNECT</h3>
            <ul className={COL_LIST}>
              <li>
                <Link to="/contact" className={LINK_CLASS}>
                  START A CONVERSATION
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@eclectichive.com"
                  className={`${LINK_CLASS} break-all`}
                >
                  INFO@ECLECTICHIVE.COM
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-16 sm:mt-20 pt-6 border-t border-cream/10 flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className={META_CLASS}>© {new Date().getFullYear()} ECLECTIC HIVE</p>
          <p className={META_CLASS}>DENVER, COLORADO</p>
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
  return (
    <div className={className}>
      <h3 className={COL_HEADING}>{title}</h3>
      <ul className={COL_LIST}>
        {links.map((l) => (
          <li key={`${l.href}${l.hash ?? ""}`}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {l.label}
              </a>
            ) : (
              <Link to={l.href} hash={l.hash} className={LINK_CLASS}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
