# Website release audit

## Current follow-up — 28 October 2026

The redesign is published to GitHub main and both Render services are live. Earlier dated entries below are historical and do not describe the current deployment status.

- Fixed public chat input validation: non-object payloads, non-text/oversized messages and phone-number visitor IDs return 400 before conversation creation or inference. New visitor IDs use a full UUID. Added dedicated per-IP chat throttling (30/minute). Regressions cover malformed requests and 429/Retry-After responses; 88 backend tests pass.
- Hugging Face key connection and account identity verified. The provider explicitly rejects inference because the account has no remaining credits. Rates, catalogue suggestions, tracking instructions and purity comparisons remain independent of the provider. No payment or provider change was made.
- No production products, orders or media were modified by this follow-up.
- Durable email outbox added: order events commit atomically with orders; PDF snapshots survive restarts; Resend retries reuse idempotency keys; ambiguous SMTP and expired retry windows require review. Gunicorn workers consume the database queue. Local tests cover retry, rollback, partial preparation, expiry and deduplication. New table migration rehearsed locally; existing store tables are unchanged.
- Dynamic product sitemap added at backend /sitemap.xml and advertised in storefront robots.txt. It reflects in-stock products from the default store without rebuilding.
- Fresh validation: 96 backend tests pass. Mobile browser launch is blocked by this machine’s browser sandbox, so measured performance/accessibility is unverified.
- Still incomplete/unverified: real owner/customer inbox delivery; HTTP 404 status for unknown SPA routes; measured mobile performance/accessibility audit; MFA/HttpOnly token storage; business review of interim policies. These are not covered by a successful build or the backend test count.

## Historical audit — 30 September 2026

## Verified changes

- New editorial homepage imagery, retained Sahara branding, favicon and social artwork; abstract animation replaces misleading showroom imagery.
- Staff-only content API and admin Settings editor for homepage text, image URLs, contact details, interim policies, SEO description, social preview and GA4 measurement ID. Plain text renders without HTML injection. Unknown fields and unsafe image schemes are rejected. Existing product editor remains responsible for actual inventory/photos/descriptions.
- Privacy, terms and returns pages have editable interim copy, no invented 7-day return/20% deduction/lifetime warranty promises, and no falsely changing daily revision date. Facebook reference was linked, but its contents could not be retrieved; no terms were inferred from it.
- GA4 G-T846CB93BQ is configured. Optional analytics loads only after consent; privacy controls allow withdrawal. Private/order routes and query strings are excluded. External Maps is click-to-load.
- Custom 404; route-specific canonical URL; existing robots and static sitemap retained.
- Contact and checkout client validation; server contact validation/honeypot/throttling; order quantity bounds, address/phone validation, payment reference fields read-only, invalid status rejection. Server remains authoritative for totals.
- Disabled staff cannot be reactivated through public customer registration/verification; session mutations enforce CSRF; login/verification throttles; production secret configuration fails closed; broader wildcard origins removed.
- Invoice actions scope lookups to the tenant, preserve paid status when resending, require POST for PDF generation, and fail rather than email broken PDFs. Mail supports configured SMTP TLS/SSL ports, validates recipients and reports provider acceptance rather than guaranteed delivery.
- Catalogue pagination refuses links that could send authentication to an unrelated origin.
- Collection images compressed: bangle campaign from ~2.5 MB to 135 KB; necklaces ~395 KB to17 KB; earrings426 KB to19 KB. Hero preloaded; pages code-split.

## Fresh verification

- `python backend/manage.py test core orders rates products --settings=core.audit_settings`: **60 passed**, SQLite in-memory, no real emails.
- `node --test frontend/src/services/*.test.js frontend/src/utils/*.test.js`: **14 passed**.
- `npm --prefix frontend run build`: **passed**, 2892 modules. This is a bundle check, not a Lighthouse score.
- Safari local page loads published manual rates, catalogue links and privacy controls. Essential-only selection dismissed the banner.
- Earlier broad test attempt used pricing-only routes and produced404s; replaced with isolated full API audit settings. Mail mocks and cache isolation corrected; all listed backend tests now pass.

## Remaining release gates

- Full mobile/keyboard/contrast and checkout browser walkthrough, real-device load-speed measurement, and Google tag network/Realtime verification. Do not claim these are complete.
- Real Resend verified sender domain/DNS and delivery log confirmation; sandbox payment configuration in render.yaml must be replaced with real merchant settings before accepting live payments. No payment was made or email sent during this audit.
- Verify shared Redis is configured: per-worker local-memory throttles do not provide a global production limit. Account-based lockout/MFA and HttpOnly token migration are not implemented; existing tokens use localStorage.
- Review actual privacy processing/retention, shipping and returns with the owner before publication. These are interim business drafts, not legal certification.
- New content migration `core.0005` and JWT blacklist migrations must run against the deployment database after approval. Read-only design preview cannot save admin changes; use a local backend for that verification.
- Static sitemap does not yet enumerate live product URLs. SPA404 is a visible route, not an HTTP404 response from the host; server/prerender SEO remains to be assessed.
- Not every hardcoded page/detail is admin-editable yet: About, some navigation labels and legacy AI copy need continued migration.
- No exhaustive dependency vulnerability scan or full API provider/end-to-end audit has been completed. Additional authenticated admin AI workflows remain to be exercised.
- 12ui automatic prototype validation previously failed under Chromium sandbox; final improve attempt now fails because its temporary launcher was removed. Exported design source is retained in ../sahara-design.

## References consulted

- https://threeui.com/browse — visual inspiration only.
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html — authentication behavior.
- https://resend.com/changelog/smtp-service — SMTP TLS/SSL ports.
- https://bdlaws.minlaw.gov.bd/act-print-1014.html — Bangladesh consumer-rights context; no statutory compliance guarantee.

### Backend verification — 2 October (supersedes earlier test/mail/lockout status)

- Added an isolated, migrated SQLite backend and interactive frontend at port 5175. See `LOCAL_BACKEND_TESTING.md` for local credentials and the control matrix. Production database credentials are not loaded.
- **65 backend tests, 14 frontend tests and production build passed.** Seven HTTP verification groups passed against the running backend, including admin/customer login, two refresh rotations, content/product edits, manual control, invoice PDF/capture, access restrictions and authoritative order totals.
- Manual rate changes reached both public chat and admin bot tester. Automatic public fallback returned fresh market data; this does not verify the supplied APISED credential or general LLM/admin AI workflows.
- Resend accepted one explicitly authorized zero-value TEST invoice with PDF for the user's requested address. Inbox delivery is unconfirmed. Routine local mail remains captured to files.
- Added a five-failure, 15-minute account lockout shared across customer/admin login and username/email aliases. Shared production cache remains required. Fixed both frontend clients to retain rotated refresh tokens. Replaced market-wide `cache.clear()` with targeted invalidation so rate changes do not reset login protection.
- Exposed production credentials require rotation. No live credentials were committed, no production data changed, and no deployment or main push occurred. MFA, HttpOnly token storage, shared Redis verification and the remaining release gates above remain open.

### Redesign continuation — 30 September

Implemented collection, cart, native-dialog cart drawer, About, product/checkout palette, supporting-page palette, and additional admin content fields. Removed unsupported cart warranty/price-lock claims and About certifications. Corrected invisible collection content caused by animation gating in Safari. Build passed; 14 frontend tests and 3 content tests passed. Browser confirmed category filtering and local add-to-bag. 12ui `improve --target` remains blocked by missing temporary Chromium executable. Mobile and signed-in checkout review remain open.

### Reference alignment — 1 October

- Rebuilt customer-page layouts and unified warm champagne styling from the original 12ui exports. Compact navigation, image-based rates section, real catalogue cards, vertical multi-photo product gallery, explicit description/specifications/making charge, bounded quantity selection, redesigned search and chat dialogs.
- Added admin-backed copy for rate/contact/account/footer sections and chatbot greeting, plus rate editorial imagery. Earlier note about About/AI greeting not being editable is superseded; navigation and some transactional helper labels remain code-owned.
- Fixed category links falling back to All, empty gallery thumbnail lanes, unnamed icon-only account link, blank failed catalogue images, and missing preview file-watch events.
- Compressed hero to 115,158 bytes (previously 1,271,360). No measured Lighthouse claim.
- Build, 14 frontend tests and 3 content tests pass. Local browser confirms live read-only product data/description and manual rate status. Original 12ui product LayerDoc recovered successfully; automated target alignment is blocked by macOS MachPort permissions, not a missing browser anymore.
- Admin visual overhaul, mobile/keyboard walkthrough and the existing authenticated/provider release gates remain open. No Render deployment or main push.

### Catalogue connection and production guardrails — 2 October

- Homepage collection names/slugs and footer links now read the same category API as admin/shop. Images are selected only from products belonging to that category; absent photography has a labelled fallback. Removed hardcoded category destinations and unrelated editorial category images.
- Cinematic category showcase uses large actual catalogue images, a scroll progress line and desktop horizontal pinning. Admin category/image changes rebuild the sequence. Fewer than two categories stay unpinned; mobile, reduced motion and animation-module failure retain native scrolling. This visual direction still needs user sign-off with real inventory.
- Production settings reject a non-PostgreSQL DATABASE_URL as well as a non-PostgreSQL engine. Render already declares managed PostgreSQL. The isolated local test database remains SQLite and was not migrated to production.
- Deployment build no longer invokes sample-catalogue population, even if a stale AUTO_POPULATE_DATA environment variable is true. This does not remove existing records from any database.
- Render template now disables payment sandbox overrides, requires merchant ID configuration and uses exact allowed hosts. These configuration edits have NOT been applied to Render. Live merchant credentials remain a release blocker.
- Verification: 68 backend tests on isolated SQLite, 17 frontend tests and production frontend build passed. This is not a PostgreSQL integration test or production deployment certification.
- Remaining gates: actual production/PostgreSQL migration rehearsal with backup, shared cache, rotated exposed credentials, full payment/AI/provider checks, real-catalogue browser/mobile acceptance and owner policy review. Do not describe the release as production-ready until these pass.

### Production-data preservation — 2 October

User requirement: retain all current production products, photographs, categories and orders. No production data was modified during this work.

Deployment no longer executes `create_admin.py` or any catalogue seeding. Explicit first-time admin setup now requires supplied credentials, never resets an existing account, never promotes a customer, and never assigns/rewrites products or categories. Three preservation regression tests pass. The pending `core.0005` migration only creates the website-content table; it does not replace the catalogue.

For eventual deployment, retain the existing DATABASE_URL and media disk. Do not provision a replacement empty database, copy the local SQLite fixture into PostgreSQL, flush, seed or reset production. Take and validate a PostgreSQL backup and media backup before applying migrations; compare catalogue counts and image references afterward. Deployment and this backup/migration rehearsal have not been performed.

## 5 October release preparation (not deployed)
- Added owner email for committed admin order/payment status changes; unchanged submissions do not resend. Regression demonstrated the missing notification before the fix and passes afterward. Delivery failure is logged without undoing the committed status. Durable retry remains an open gate.
- Production migration inventory verified read-only: core through 0004, orders through 0004, products through 0006, rates through 0004. Pending migrations create storefront/payment configuration and add the manual payment choice; no catalogue replacement is planned. Inventory remains 13 products, 5 categories, 5 orders.
- Blueprint references the already-provisioned cache without managing a second cache declaration (supported by https://render.com/docs/blueprint-spec). Production env example now disables seeding/sandbox payment, lists exact origins and the owner notification address. Pattern scan of tracked/untracked non-ignored text found no credential-prefix, private-key or credentialed PostgreSQL URL candidates; this is not an exhaustive secret audit.
- Recovery page recovered after reselecting Chrome tab: confirmed a three-day point-in-time recovery window. Requested a logical database export at October 5, 2026, 6:23 PM (dashboard time); completion/download and restore validation remain pending. Full backend regression suite now passes 83 tests.
- Follow-up verification: Render SSH now reaches the host with its verified key, but rejects this machine's public key. User signed into Chrome; database Info page confirmed available PostgreSQL 18. Recovery page currently renders no accessible content, so backup verification remains pending.
- Fixed cached unpaid invoice PDFs surviving admin payment approval. Regression first failed on the retained old PDF path, then passed after invalidating that path when payment status changes; subsequent download/send regenerates it. Fourteen focused order/invoice/email tests pass.
- Paid cache red-db1i2mnavr4c73c18cjg was created with user approval ($10/month); backend wiring remains pending. Resend accepted the zero-value owner TEST invoice (receipt retained in ignored local test files); inbox delivery remains unverified.
- User authorized GitHub/production release after checks; supersedes earlier local-only delivery constraint.
- Replaced oversized pinned collection rail with compact catalogue-driven card stack, spring shuffle, category selectors and previous/next controls. Reduced-motion users receive immediate state changes. Safari verified next selection changes the active category and real catalogue photograph.
- Fixed rate reads writing unchanged controls; added a read-only regression. SQLite local preview now serializes pricing refreshes because SQLite does not implement SELECT FOR UPDATE. PostgreSQL retains cross-worker row locking.
- Owner notifications now use ADMIN_NOTIFICATION_EMAIL (default saharagold19@gmail.com), independently of public STORE_EMAIL. Order alerts continue after customer invoice exceptions; order/manual invoice dispatch copies include generated PDF attachments. Contact enquiries target the owner. Actual receipt remains unverified, and background-thread delivery still needs durability review.
- Fresh checks: 82 backend tests passed (core/rates/products/orders); 17 frontend data/validation tests passed; frontend build passed.
- Render workspace verified: tea-d3nnn2emcj7s73fipu50. Existing backend srv-dalneue5vjqs738163n0, frontend srv-dalnggu1egvs73f7ofug, PostgreSQL dpg-dalnek65vjqs73814rr0-a. Read-only inventory before deployment: 13 products, 5 categories, 5 orders. Persistent media disk remains attached at /var/data.
- Release gates still open: real owner mail acceptance/receipt check; shared production login cache configuration; PostgreSQL backup/migration verification; mobile card interaction check; final diff/secret audit and post-deploy smoke tests. No push or deploy has occurred.
