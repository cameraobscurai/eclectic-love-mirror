import { Link } from "@tanstack/react-router";

const studioLinks = [
  { href: "/atelier", label: "Atelier by The Hive" },
  { href: "/collection", label: "Hive Signature Collection" },
  { href: "/gallery", label: "The Gallery" },
] as const;

const informationLinks = [
  { href: "/process", label: "Process" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream border-t border-cream/10">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-24 pb-10">
        {/* Top: brand block + three columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-10">
          {/* Brand block — Vercel uses a quiet editorial paragraph */}
          <div className="md:col-span-5">
            <h2 className="font-brand text-[1.3rem] lg:text-[1.5rem] tracking-[0.18em] uppercase font-light">
              Eclectic Hive
            </h2>
            <p className="mt-6 text-cream/65 max-w-md leading-[1.7] text-[15px]">
              Two parts luxe, one part regal, and a dash of edge. A full-service
              design and production house creating cinematic, art-forward event
              environments.
            </p>
          </div>

          <FooterColumn title="Studio" links={studioLinks} className="md:col-span-2" />
          <FooterColumn
            title="Information"
            links={informationLinks}
            className="md:col-span-2"
          />

          {/* Connect column — Vercel persistent corner content */}
          <div className="md:col-span-3">
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-cream/40 mb-5">
              Connect
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/contact"
                  className="text-[14px] text-cream/70 hover:text-cream transition-colors"
                >
                  Start a conversation
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@eclectichive.com"
                  className="text-[14px] text-cream/70 hover:text-cream transition-colors"
                >
                  hello@eclectichive.com
                </a>
              </li>
              <li className="text-[14px] text-cream/55">Denver, Colorado</li>
            </ul>
          </div>
        </div>

        {/* Bottom rule — quiet copyright */}
        <div className="mt-20 pt-6 border-t border-cream/10 flex flex-col md:flex-row justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-cream/35">
          <p>© {new Date().getFullYear()} Eclectic Hive</p>
          <p>Denver, Colorado</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
  className?: string;
}

function FooterColumn({ title, links, className }: FooterColumnProps) {
  return (
    <div className={className}>
      <h3 className="text-[10px] uppercase tracking-[0.28em] text-cream/40 mb-5">
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              to={l.href}
              className="text-[14px] text-cream/70 hover:text-cream transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
