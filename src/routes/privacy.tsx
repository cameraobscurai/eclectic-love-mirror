import { createFileRoute, Link } from "@tanstack/react-router";

const EFFECTIVE_DATE = "May 10, 2026";

const SECTION_LABEL =
  "text-[11px] uppercase tracking-[0.28em] text-charcoal/55 mb-4";
const SECTION_WRAP = "border-t border-charcoal/15 pt-10";
const PROSE =
  "text-[15px] leading-[1.75] text-charcoal/80 space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-charcoal/30 hover:[&_a]:decoration-charcoal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Eclectic Hive" },
      {
        name: "description",
        content:
          "Privacy Policy for Eclectic Hive: how personal information is collected, used, disclosed, retained, and protected.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <header className="pb-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-charcoal/50">
            PRIVACY POLICY
          </p>
          <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">
            Privacy.
          </h1>
          <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-charcoal/55">
            EFFECTIVE {EFFECTIVE_DATE.toUpperCase()}
          </p>
        </header>

        {/* Intro */}
        <section className={SECTION_WRAP}>
          <div className={PROSE}>
            <p>
              Eclectic Hive is an event design and production studio based in
              Denver, Colorado. This Privacy Policy describes how Eclectic Hive
              collects, uses, discloses, and safeguards personal information
              in connection with{" "}
              <a href="https://eclectichive.com">eclectichive.com</a> (the
              &ldquo;Site&rdquo;), inquiries submitted to the studio, and
              other interactions with Eclectic Hive (collectively, the
              &ldquo;Services&rdquo;).
            </p>
            <p>
              By accessing the Site or providing information to Eclectic Hive,
              the user acknowledges having read and understood this Privacy
              Policy. Users who do not agree with its terms should not use the
              Services.
            </p>
          </div>
        </section>

        {/* Information collected */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>INFORMATION COLLECTED</h2>
          <div className={PROSE}>
            <p>
              <strong>Information provided directly.</strong> Eclectic Hive
              collects information submitted through inquiry forms, email, or
              other communications, which may include name, email address,
              telephone number, event date, event location, budget range, and
              project details.
            </p>
            <p>
              <strong>Information collected automatically.</strong> When the
              Site is accessed, Eclectic Hive and its service providers may
              automatically collect certain technical information, including
              IP address, device identifiers, browser type and version,
              operating system, referring URLs, pages viewed, and timestamps.
            </p>
            <p>
              <strong>Cookies and similar technologies.</strong> The Site uses
              cookies, pixels, and similar technologies that are strictly
              necessary for the Site to function and, where applicable, to
              measure traffic and performance. Cookies may be managed through
              browser settings; disabling certain cookies may impair
              functionality.
            </p>
          </div>
        </section>

        {/* How information is used */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW INFORMATION IS USED</h2>
          <div className={PROSE}>
            <p>
              Eclectic Hive processes personal information for the following
              purposes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To respond to inquiries and provide proposals, quotes, and other requested information.</li>
              <li>To negotiate, perform, and administer contracts, including scheduling, invoicing, and event delivery.</li>
              <li>To operate, maintain, secure, and improve the Site and Services.</li>
              <li>To prevent fraud, enforce applicable terms, and protect the rights, property, and safety of Eclectic Hive, its clients, and its personnel.</li>
              <li>To comply with applicable laws, regulations, and legal process.</li>
            </ul>
            <p>
              Eclectic Hive does not sell personal information and does not
              engage in automated decision-making that produces legal or
              similarly significant effects.
            </p>
          </div>
        </section>

        {/* Disclosure */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW INFORMATION IS DISCLOSED</h2>
          <div className={PROSE}>
            <p>
              Eclectic Hive discloses personal information only as described
              below and under appropriate confidentiality obligations:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Service providers</strong> that perform functions on
                behalf of Eclectic Hive, including website hosting, email
                delivery, file storage, analytics, and payment processing.
              </li>
              <li>
                <strong>Production partners</strong>, including vendors,
                fabricators, venues, and contractors, solely to the extent
                necessary to design and deliver an event.
              </li>
              <li>
                <strong>Legal, regulatory, and safety</strong> disclosures
                where required by law, subpoena, court order, or other legal
                process, or where disclosure is reasonably necessary to
                protect rights, property, or safety.
              </li>
              <li>
                <strong>Business transactions</strong> in connection with a
                merger, acquisition, financing, reorganization, or sale of
                assets, subject to customary confidentiality protections.
              </li>
            </ul>
          </div>
        </section>

        {/* Retention */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>DATA RETENTION</h2>
          <div className={PROSE}>
            <p>
              Eclectic Hive retains personal information for as long as
              necessary to fulfill the purposes for which it was collected,
              including providing the Services, maintaining business records,
              resolving disputes, and complying with legal, tax, accounting,
              and regulatory obligations. When information is no longer
              required, it will be deleted or anonymized in accordance with
              Eclectic Hive&apos;s retention practices.
            </p>
          </div>
        </section>

        {/* Rights */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>USER CHOICES &amp; RIGHTS</h2>
          <div className={PROSE}>
            <p>
              Subject to applicable law, users may request access to,
              correction of, or deletion of personal information held by
              Eclectic Hive, and may opt out of marketing communications at
              any time by following the unsubscribe instructions in any
              message or by contacting Eclectic Hive directly.
            </p>
            <p>
              <strong>California residents.</strong> The California Consumer
              Privacy Act, as amended, provides California residents with
              certain rights regarding their personal information, including
              the right to know what categories and specific pieces of
              personal information have been collected, the sources from
              which it was collected, the business or commercial purposes for
              collection, and the categories of third parties with whom it is
              shared; the right to request deletion or correction; and the
              right to opt out of the sale or sharing of personal
              information. Eclectic Hive does not sell or share personal
              information as those terms are defined under California law.
              Eclectic Hive will not discriminate against any user for
              exercising these rights. To submit a verifiable consumer
              request, contact{" "}
              <a href="mailto:info@eclectichive.com">info@eclectichive.com</a>.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>SECURITY</h2>
          <div className={PROSE}>
            <p>
              Eclectic Hive maintains reasonable administrative, technical,
              and physical safeguards designed to protect personal
              information against unauthorized access, disclosure,
              alteration, and destruction. However, no method of transmission
              over the internet or method of electronic storage is completely
              secure, and absolute security cannot be guaranteed.
            </p>
          </div>
        </section>

        {/* Children */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHILDREN&apos;S PRIVACY</h2>
          <div className={PROSE}>
            <p>
              The Services are not directed to children under 13, and
              Eclectic Hive does not knowingly collect personal information
              from children under 13. If Eclectic Hive becomes aware that
              such information has been collected without verifiable parental
              consent, it will be deleted promptly.
            </p>
          </div>
        </section>

        {/* Third-party links */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>THIRD-PARTY LINKS &amp; SERVICES</h2>
          <div className={PROSE}>
            <p>
              The Site may contain links to third-party websites, products,
              or services not operated by Eclectic Hive. Eclectic Hive is not
              responsible for the content, privacy practices, or security of
              any third party. Users are encouraged to review the privacy
              policies of any third party before providing personal
              information.
            </p>
          </div>
        </section>

        {/* International */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>INTERNATIONAL USERS</h2>
          <div className={PROSE}>
            <p>
              The Services are operated from the United States. Users
              accessing the Services from outside the United States
              acknowledge that their information may be transferred to,
              stored, and processed in the United States, where data
              protection laws may differ from those in the user&apos;s
              jurisdiction.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHANGES TO THIS POLICY</h2>
          <div className={PROSE}>
            <p>
              Eclectic Hive may update this Privacy Policy from time to time.
              The effective date at the top of this page indicates when the
              policy was last revised. Material changes will be posted on
              this page and, where appropriate, communicated through other
              channels. Continued use of the Services following any update
              constitutes acceptance of the revised policy.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CONTACT</h2>
          <div className={PROSE}>
            <p>
              For questions or requests regarding this Privacy Policy or the
              handling of personal information, contact:
            </p>
            <p>
              Eclectic Hive
              <br />
              Denver, Colorado
              <br />
              <a href="mailto:info@eclectichive.com">info@eclectichive.com</a>
            </p>
            <p className="pt-4">
              <Link
                to="/contact"
                className="text-[11px] uppercase tracking-[0.28em] no-underline border-b border-charcoal/40 pb-1 hover:border-charcoal"
              >
                CONTACT FORM →
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
