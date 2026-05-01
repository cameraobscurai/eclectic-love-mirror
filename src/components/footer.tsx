import { Link } from "@tanstack/react-router";

const footerLinks = {
  studio: [
    { href: "/atelier", label: "Atelier by The Hive" },
    { href: "/collection", label: "Hive Signature Collection" },
    { href: "/gallery", label: "The Gallery" },
    { href: "/contact", label: "Contact" },
  ],
  info: [
    { href: "/process", label: "Process" },
    { href: "/faq", label: "FAQ" },
    { href: "/privacy", label: "Privacy" },
  ],
} as const;

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream border-t border-cream/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h2 className="font-brand text-3xl tracking-[0.12em] uppercase">
              Eclectic Hive
            </h2>
            <p className="mt-4 text-cream/60 max-w-sm leading-relaxed">
              Two parts luxe, one part regal, and a dash of edge. Full-service
              luxury event design, custom fabrication, and furniture rental.
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-cream/40">
              Denver, Colorado
            </p>
            <a
              href="mailto:hello@eclectichive.com"
              className="mt-2 inline-block text-cream/80 hover:text-cream transition-colors editorial-link"
            >
              hello@eclectichive.com
            </a>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-cream/40 mb-5">
              Studio
            </h3>
            <ul className="space-y-3">
              {footerLinks.studio.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="text-sm text-cream/70 hover:text-cream transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-cream/40 mb-5">
              Info
            </h3>
            <ul className="space-y-3">
              {footerLinks.info.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="text-sm text-cream/70 hover:text-cream transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-cream/10 flex flex-col md:flex-row justify-between gap-4 text-xs uppercase tracking-[0.2em] text-cream/30">
          <p>© {new Date().getFullYear()} Eclectic Hive</p>
          <p>Designed in Denver</p>
        </div>
      </div>
    </footer>
  );
}
