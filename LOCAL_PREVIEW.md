# Sahara storefront design preview

Branch: `design/luxury-storefront-preview`. This branch is not deployed to Render.

For both the storefront and editable admin, use **http://127.0.0.1:5175/**. Follow [LOCAL_BACKEND_TESTING.md](LOCAL_BACKEND_TESTING.md) to start the isolated backend and run `npm run dev:local` from `frontend`.

The retired port 5174 now redirects to 5175, preserving the page path. It no longer reads production data. Successful admin product, category, rate and website-content saves invalidate storefront data in the same tab and other open tabs on the same origin. Use the exact 127.0.0.1 address for both.

Main files:
- `src/pages/HomePage.jsx`: homepage
- `src/components/layout/Header.jsx` and `Footer.jsx`: shared navigation
- `src/pages/ShopPage.jsx`: collection browsing
- `src/pages/ProductPage.jsx`: product details
- `src/maison.css`: luxury storefront styles (loaded after shared `src/index.css`)
- `public/editorial/`: editorial campaign imagery
- `public/brand/`: logo, favicon, and social sharing artwork

The local preview implements concept A from four 12ui directions: warm ivory, cinematic gold imagery, restrained typography, and an abstract animated brand section. Original product photographs remain on purchasable catalogue pages for accuracy. Homepage collection imagery is editorial.

Design source exports are in `../sahara-design`; the homepage uses the recovered responsive hero and collection assets. Automatic Chromium prototype validation was blocked by the local sandbox; the implementation is checked separately in Safari and with the production build.

Nothing from this design branch has been deployed to Render.

## Current audit work

See `RELEASE_AUDIT.md` for verified changes and open release gates, and `PLUGIN_REVIEW.md` for the plugin review. GA4 is configured for `G-T846CB93BQ` behind optional consent.

The new content API requires the backend migration before admin saves can work. The preview intentionally proxies only reads to the current live backend, which does not yet have this new endpoint; bundled defaults keep the storefront review available. Edit `frontend/src/data/storefrontDefaults.json` to preview copy locally. Keep matching backend defaults in `backend/core/storefront-defaults.json` aligned for initial deployment. Admin editing uses saved database content once the backend is migrated.

### Storefront continuation — 30 September

The local version now includes a collection heading and category toolbar, redesigned bag and accessible bag drawer, light product details and checkout panels, a rewritten About page, and matching palettes on rates, contact, account, and tracking pages. Collection and About copy are included in the admin website content editor. Public content defaults remain available while the backend content migration is pending.

Verified: production frontend build, 14 frontend tests, 3 content API tests; browser collection filtering and adding a real catalogue item to the local bag. Removed the route/product-grid opacity gates after Safari displayed invisible content. No order or email was submitted.

The 12ui comparison was attempted again; its temporary installation is missing the Chromium headless executable. Automated visual alignment, mobile-width checks, and authenticated checkout still need verification. These are not production-release claims.

### Reference alignment — 1 October

The original 12ui mockups remain the visual target. This pass replaces the previous two-row masthead with a compact centred brand layout, restores photographic rate storytelling and four-column catalogue cards, and aligns product detail with the reference's gallery, purity/weight/price columns, making charge, quantity selector and rounded actions. It uses the original exported rate artwork; the product gallery always uses actual catalogue photographs. Single-photo products do not reserve an empty thumbnail column. Failed catalogue photographs show an explicit branded fallback.

The supporting pages now have rebuilt layouts: checkout, account, rates/calculator, contact, order tracking, order result/error, policies, search and concierge. This does not mean the existing admin dashboard has been visually rebuilt or its external integrations certified.

Editable titles, descriptions, editorial image URLs, contact information, policy text, analytics ID and chatbot greeting are in **Admin → Settings → Website content & policies** after the backend content migration. New rate artwork is `public/editorial/rate-study.webp`; shared reference styling is `src/atelier.css`; product/checkout structure is in `src/pages/purchase-v2.css`. `src/components/layout/storefront-shell.css` owns navigation, search and footer. Local fallback content remains `src/data/storefrontDefaults.json`.

The hero was recompressed from 1.27 MB to 115 KB. Preview file polling is enabled because the workspace file watcher missed some changes. Save a file to update the preview; use a browser refresh if it was already open when the server restarted.

Verified this pass: production build; 14 frontend tests; 3 content API tests; Safari renders the saved product description and current price breakdown; Chrome renders the correct category URLs and manual pricing state. 12ui recovered the original product LayerDoc successfully. Its URL-based alignment attempt remains blocked by macOS Chromium MachPort permissions even after restoring its browser dependency. Full mobile/keyboard and authenticated payment/email/admin verification remain release gates. No deployment, live order, email or admin data mutation was performed.

### Scroll choreography and contrast — 2 October

Replaced the generic entrance observer with GSAP ScrollTrigger. Shared route headings/cards/forms reveal on entry; jewellery photographs scale with scroll. On desktop, the homepage hero scales into a rounded frame and collection panels move horizontally through a pinned section. Mobile and reduced-motion layouts keep ordinary document flow; reduced motion removes the GSAP effects. Category links support keyboard focus while pinned. Removed the redundant homepage Framer wrapper.

Fixed the story section's inherited dark-theme foregrounds: heading #1c1512, body #514438 and overline #715526 on #f3e6e0 give contrast ratios 14.76:1, 7.70:1 and 5.68:1 respectively. These are the specified colour pairs, not a complete rendered-site audit.

Production build passes. Browser loaded updated homepage successfully, but native browser control lost window access before a complete scroll walkthrough. Desktop motion timing, mobile device behaviour and reduced-motion toggling still require visual sign-off. No deployment.

### Reference alignment — 4 October

The homepage now uses the approved craft photograph and a photo-led visit row with the actual Bashundhara City address. Editorial artwork is labelled; the fictional showroom and hours from the mockup are not used. The shared footer has the reference's contact, shopping and brand panel, followed by collection/account/policy links. New craft, visit and footer content fields are available in Admin Settings; saved values override defaults.

The local content API returns the new fields and their images successfully. The production build and existing content access-control tests pass. Full visual acceptance is still pending: 12ui's Chromium capture fails at macOS MachPort registration, and native browser captures intermittently fail with ScreenCaptureKit/noWindowsAvailable. These checks do not establish mobile fidelity or complete motion verification. No deployment or production database migration was performed.

### Visual review — 4 October 2026

- Checked the homepage and product `/product/3` in Safari with a 390px-wide iframe viewport using the actual local app and API. This checks responsive layout, not physical-device performance.
- Verified the new logo, product description, complete photograph, purity/weight/price, making charges and purchase controls at this width.
- Fixed an exposed edge in the craftsmanship image during scroll animation by clipping its frame and retaining image overscan.
- Text reveals now keep full opacity, preserving contrast while moving gently into place.
- The temporary review frame was removed before rebuilding. Production catalogue and database were not changed.
- Full-site device testing and final reference-image comparison remain pending; this is not production approval.

### Editorial asset and footer follow-up — 4 October 2026
- Replaced the 600px rate-study artwork with a 1536×1024 editorial refinement matching the supplied warm stone/silk reference; WebP delivery is 305,646 bytes. The existing admin-selected asset URL is preserved.
- Inspected the rendered rate section in Safari: four rate bands, status, headings and actions remain readable over the artwork.
- Verified the corrected footer logo sizing in Safari alongside contact and shopping panels. Product records and production services were not changed.
- This verifies these desktop sections only; full reference fidelity and cross-device completion remain under review.
