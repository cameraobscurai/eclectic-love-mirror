import { Link } from "@tanstack/react-router";
import { analytics } from "@/lib/analytics";

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

// Layout-only utilities. Type roles live in src/styles.css as
// .footer-wordmark / .footer-eyebrow / .footer-link.
const COL_HEADING = "footer-eyebrow text-cream/40 mb-4 sm:mb-8";
const COL_LIST = "space-y-2.5 sm:space-y-4";
const LINK_CLASS =
  "footer-link inline-block py-1 text-cream/70 hover:text-cream transition-colors";
const META_CLASS = "footer-eyebrow text-cream/35";

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream border-t border-cream/10">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-12 pt-12 sm:pt-20 lg:pt-24 pb-10 lg:pb-10">
        {/* Mobile: brand block on top, then STUDIO+INFORMATION as a 2-col pair,
            then CONNECT full width. Desktop: 12-col with brand at left. */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-10 sm:gap-y-14 gap-x-6 sm:gap-x-8 md:gap-x-10">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-5">
            <h2 className="footer-wordmark">ECLECTIC HIVE</h2>
            <p className="footer-link mt-5 sm:mt-8 text-cream/65 max-w-md">
              AN ATELIER OF DESIGN AND PRODUCTION. CONCEPT, FABRICATION, AND SPACE — IMMERSIVE ENVIRONMENTS.
            </p>
          </div>

          <FooterColumn title="STUDIO" links={studioLinks} className="col-span-1 md:col-span-2" />
          <FooterColumn
            title="INFORMATION"
            links={informationLinks}
            className="col-span-1 md:col-span-2"
          />

          {/* Connect column — full width on mobile so the email never wraps awkwardly */}
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
                  onClick={() => analytics.contactClick("email", "footer")}
                >
                  INFO@ECLECTICHIVE.COM
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-12 sm:mt-20 pt-5 sm:pt-6 border-t border-cream/10 flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
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
