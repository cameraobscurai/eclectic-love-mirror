## Goal

Replace the current `/privacy` placeholder (just a heading) with a real, plain-English privacy policy that:
- Covers what an event-design studio actually collects (contact form inquiries, basic analytics, cookies)
- Reads in Eclectic Hive's editorial voice (ALL CAPS section labels, Cormorant display heading, restrained body prose)
- Honors the site's locked design tokens (cream background, charcoal text, sand accents)
- Stays legally reasonable for a US-based (Denver) studio without overpromising

## Sections to include

1. **Effective date + intro** — one short paragraph: who Eclectic Hive is, what this policy covers
2. **Information we collect**
   - Information you give us (contact form: name, email, phone, event date, message)
   - Information collected automatically (IP, browser, pages viewed via standard analytics)
   - Cookies (essential + analytics)
3. **How we use it** — respond to inquiries, send proposals, improve the site, legal compliance
4. **Sharing** — service providers only (hosting/email/analytics); never sold; legal disclosure when required
5. **Data retention** — inquiries retained while the relationship is active + reasonable archival period
6. **Your choices & rights** — opt out of marketing, request access/deletion; California (CCPA) note
7. **Security** — reasonable safeguards, no system is 100% secure
8. **Children** — site not directed to under 13
9. **Third-party links** — not responsible for external sites
10. **Changes** — we may update; effective date at top reflects last change
11. **Contact** — info@eclectichive.com for privacy requests

## Design / layout

- Reuse existing `/privacy` shell (cream bg, nav offset, max-w-3xl)
- Page title: "PRIVACY" eyebrow → display "Privacy." (already in place) → effective date in small caps
- Body: long-form prose (mixed case allowed per DECISIONS.md: "legal long-form prose stays mixed case")
- Section headings: ALL CAPS tracked labels per typography rule
- Thin charcoal/15 dividers between sections, no cards or boxes
- Plenty of vertical rhythm (space-y-12)

## Files touched

- `src/routes/privacy.tsx` — replace component body with full policy
- Add a `head()` meta description for SEO ("Privacy policy for Eclectic Hive...")

## Out of scope (call out to user)

- This is a **plain-language template**, not legal advice. Recommend the owner have counsel review before relying on it — especially if they ever serve EU clients (GDPR) or run paid ads with retargeting pixels.
- No cookie consent banner is being added. If the studio adds analytics that track EU visitors, a banner becomes a separate task.
- "Effective date" needs a real date — I'll use today (May 10, 2026) unless you'd prefer another.

## Confirm before I implement

- OK to use today's date as the effective date?
- Any specific third-party services to name (Google Analytics, Mailchimp, Calendly, etc.) or keep generic?
- Add a CCPA section now, or keep it generic until needed?
