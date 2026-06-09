Reality check: the site is not ruined. The two real problems are controllable: the Bar tile asset needs to be corrected to the exact uploaded cream bar, and the email pipeline needs a proof-level test instead of “it seemed to work.”

Plan:

1. Lock the correct Bar cover
- Replace the current Bar cover with the newly uploaded `image-128.png` cream/tan bar.
- Crop/normalize only if needed so the bar sits like the reference: centered horizontally, not floating high, label clear.
- Remove the earlier wrong Bar cover references from the category cover import path so cached transforms cannot show the black bar or PDF mockup again.
- Verify the collection overview screenshot at desktop and mobile.

2. Fix the collection grid alignment safely
- Audit every category cover tile in `CategoryTonalGrid`: Bar, Lighting, Cocktail Tables, Storage, Rugs, Tableware, Throws, etc.
- Keep the existing flat checker grid and category order.
- Adjust only per-category padding/positioning where the rendered screenshot proves a tile is off.
- Do not make broad performance or loading changes.
- Confirm Bar tile click routes to the right Cocktail & Bar view and does not produce an empty or misleading grid.

3. Harden the inquiry/contact email flow
- Confirm the verified sender domain is active: `notify.eclectichive.com` is already verified.
- Keep admin notifications going to `info@eclectichive.com`.
- Fix the route response so it reports:
  - inquiry saved
  - admin email queued
  - confirmation email queued
  - any queue/log failure
- Make confirmation email logging explicit. Current code exists, but recent logs prove only admin notification sends; confirmation send is not yet proven.
- Keep user-facing success safe: if the inquiry saves but email queue fails, the visitor gets a useful fallback instead of a false “everything is perfect.”

4. Run one controlled proof test
- Submit one edge-case inquiry with selected items, long-ish message, reply-to email, project date, budget, and scope.
- Verify in backend logs:
  - inquiry row exists
  - admin notification row reaches `sent`
  - confirmation row reaches `sent`
  - no `failed`, `dlq`, or suppressed result
- Verify the admin email recipient is `info@eclectichive.com`.
- Verify the confirmation goes to the submitter.

5. Site-wide launch risk pass
- Check core routes: Home, Collection overview, Bar/Cocktail & Bar route, Contact, Atelier, Gallery.
- Check obvious client errors and broken network requests in preview.
- Check inquiry buttons/tray handoff from collection into contact.
- Check no old Contact FAQ route has been reintroduced.
- Check no missing image imports or wrong category cover files remain.

6. Final handoff
- Give you a blunt status report:
  - fixed
  - verified
  - still risky
  - what not to touch before client review
- No vague reassurance. Only proof-backed status.