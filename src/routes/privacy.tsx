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
          "Privacy Policy for Eclectic Hive: how the website collects, uses, maintains, and discloses information from users.",
      },
      { property: "og:title", content: "Privacy — Eclectic Hive" },
      { property: "og:url", content: "https://eclectichive.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://eclectichive.com/privacy" }],
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
              This Privacy Policy governs the manner in which the website
              collects, uses, maintains and discloses information collected
              from users (each, a &ldquo;User&rdquo;) of the website
              (&ldquo;Site&rdquo;). This privacy policy applies to the Site
              and all products and services offered by ECLECTIC HIVE.
            </p>
          </div>
        </section>

        {/* Personal Identification Information */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>PERSONAL IDENTIFICATION INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We may collect personal identification information from Users in
              a variety of ways, including, but not limited to, when Users
              visit our site, register on the site, subscribe to the
              newsletter, and in connection with other activities, services,
              features or resources we make available on our Site. Users may
              be asked for, as appropriate, email address. Users may, however,
              visit our Site anonymously. We will collect personal
              identification information from Users only if they voluntarily
              submit such information to us. Users can always refuse to supply
              personally identification information, except that it may
              prevent them from engaging in certain Site related activities.
            </p>
          </div>
        </section>

        {/* Non-Personal Identification Information */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>NON-PERSONAL IDENTIFICATION INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We may collect non-personal identification information about
              Users whenever they interact with our Site. Non-personal
              identification information may include the browser name, the
              type of computer and technical information about Users means of
              connection to our Site, such as the operating system and the
              Internet service providers utilized and other similar
              information.
            </p>
          </div>
        </section>

        {/* Web Browser Cookies */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>WEB BROWSER COOKIES</h2>
          <div className={PROSE}>
            <p>
              Our Site may use &ldquo;cookies&rdquo; to enhance User
              experience. User&apos;s web browser places cookies on their hard
              drive for record-keeping purposes and sometimes to track
              information about them. User may choose to set their web browser
              to refuse cookies, or to alert you when cookies are being sent.
              If they do so, note that some parts of the Site may not function
              properly.
            </p>
          </div>
        </section>

        {/* How We Use Collected Information */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE USE COLLECTED INFORMATION</h2>
          <div className={PROSE}>
            <p>
              ECLECTIC HIVE may collect and use Users personal information for
              the following purposes:
            </p>
            <p>
              <strong>To improve customer service.</strong> Information you
              provide helps us respond to your customer service requests and
              support needs more efficiently.
            </p>
            <p>
              <strong>To personalize user experience.</strong> We may use
              information in the aggregate to understand how our Users as a
              group use the services and resources provided on our Site.
            </p>
            <p>
              <strong>To send periodic emails.</strong> We may use the email
              address to send User information and updates pertaining to their
              order. It may also be used to respond to their inquiries,
              questions, and/or other requests. If User decides to opt-in to
              our mailing list, they will receive emails that may include
              company news, updates, related product or service information,
              etc. If at any time the User would like to unsubscribe from
              receiving future emails, we include detailed unsubscribe
              instructions at the bottom of each email or User may contact us
              via our Site.
            </p>
          </div>
        </section>

        {/* How We Protect Your Information */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE PROTECT YOUR INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We adopt appropriate data collection, storage and processing
              practices and security measures to protect against unauthorized
              access, alteration, disclosure or destruction of your personal
              information, username, password, transaction information and
              data stored on our Site.
            </p>
          </div>
        </section>

        {/* Sharing Your Personal Information */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>SHARING YOUR PERSONAL INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We do not sell, trade, or rent Users personal identification
              information to others. We may share generic aggregated
              demographic information not linked to any personal
              identification information regarding visitors and users with
              our business partners, trusted affiliates and advertisers for
              the purposes outlined above.
            </p>
          </div>
        </section>

        {/* Third Party Websites */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>THIRD PARTY WEBSITES</h2>
          <div className={PROSE}>
            <p>
              Users may find advertising or other content on our Site that
              link to the sites and services of our partners, suppliers,
              advertisers, sponsors, licensors and other third parties. We do
              not control the content or links that appear on these sites and
              are not responsible for the practices employed by websites
              linked to or from our Site. In addition, these sites or
              services, including their content and links, may be constantly
              changing. These sites and services may have their own privacy
              policies and customer service policies. Browsing and interaction
              on any other website, including websites which have a link to
              our Site, is subject to that website&apos;s own terms and
              policies.
            </p>
          </div>
        </section>

        {/* Changes to This Privacy Policy */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHANGES TO THIS PRIVACY POLICY</h2>
          <div className={PROSE}>
            <p>
              ECLECTIC HIVE has the discretion to update this privacy policy
              at any time. When we do, we will revise the updated date at the
              bottom of this page. We encourage Users to frequently check this
              page for any changes to stay informed about how we are helping
              to protect the personal information we collect. You acknowledge
              and agree that it is your responsibility to review this privacy
              policy periodically and become aware of modifications.
            </p>
          </div>
        </section>

        {/* Your Acceptance of These Terms */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>YOUR ACCEPTANCE OF THESE TERMS</h2>
          <div className={PROSE}>
            <p>
              By using this Site, you signify your acceptance of this policy.
              If you do not agree to this policy, please do not use our Site.
              Your continued use of the Site following the posting of changes
              to this policy will be deemed your acceptance of those changes.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CONTACT</h2>
          <div className={PROSE}>
            <p>
              For questions regarding this Privacy Policy, contact:
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
