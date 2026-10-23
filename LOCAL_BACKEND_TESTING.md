# Full local testing — 2 October 2026

Open **http://127.0.0.1:5175/** for the interactive storefront and **http://127.0.0.1:5175/admin/login** for admin. This uses the isolated backend at port 8001. The retired port 5174 redirects here so admin and store use the same local database.

Your generated local admin and customer credentials are in [.local-testing/LOGIN.md](.local-testing/LOGIN.md). These are local accounts, not your production accounts. The credentials, database and captured mail are ignored by Git. The local database contains a clearly labelled practice product and zero-value test invoice; it is not a copy of live inventory.

## What you can try

| Admin location | Try this | Verification |
| --- | --- | --- |
| Settings → Website content & policies | Change homepage text, editorial image URLs, contact information, policies, SEO and analytics ID; save and refresh the storefront | Content saves and invalid image URL rejection passed through HTTP |
| Jewelry Catalog | Edit the practice product description, weight and making charge | Description persistence passed through HTTP |
| Daily Gold Rates | Publish manual rates or switch to automatic mode | Manual values reached public chat and admin bot tester; automatic public fallback returned fresh data |
| Orders & Dispatch | Inspect a locally placed cash-on-delivery order | Customer order creation passed; forged totals and invalid quantity tested |
| Gold Invoices | Generate the zero-value test PDF and dispatch it | PDF generation and local mail capture passed |
| AI Bot Sandbox | Ask for today's gold rates after changing them | Current rate response verified; general AI and other admin tools remain to be tested |

## Email delivery

Real transactional email is now enabled for this local shop through the private, Git-ignored `.local-testing/mail-config.json` with `delivery_enabled: true`. Signup verification, resend, and invoice actions use the configured Resend sender. Provider acceptance is not proof of inbox delivery. Never enter secrets in public content fields.

To return to captured mail, set `delivery_enabled` to `false` and restart the backend. Captured messages go into `.local-testing/emails/`; signup explicitly reports that no message was sent. The automated `check_local_backend.py` refuses to run with real delivery enabled to avoid emailing practice recipients. Django's mocked test suite remains safe to run.

The database is still isolated local data. Payments and webhook actions remain blocked, and general AI services are not yet configured here. This environment is not fully production-ready.

## Restart locally

From the `gold-shop` directory, using the existing Python environment:

```sh
../test-venv/bin/python backend/manage.py migrate --settings=sahara_gold.local_testing
../test-venv/bin/python backend/manage.py setup_local_testing --settings=sahara_gold.local_testing
../test-venv/bin/python backend/manage.py runserver 127.0.0.1:8001 --settings=sahara_gold.local_testing
```

In a second terminal, with Node 22 available:

```sh
cd frontend
npm run dev:local
```

These settings do not load the production `.env`. Do not replace them with production database credentials. Source-file edits reload through Vite; saved admin content persists in the local SQLite database.

## Verified and still outstanding

65 backend tests, 14 frontend tests and the production frontend build passed. Seven additional HTTP checks passed against the running local backend, covering login, token rotation, content, products/rates, invoice capture, permissions and order validation. `scripts/check_local_backend.py` repeats these checks and creates a local practice order. `scripts/check_local_rates_chat.py` exercises rate publication and restores the original local manual values.

New protections include a five-failure account lockout for 15 minutes, IP throttling, rotated-refresh-token persistence in both clients, and targeted market cache invalidation that preserves authentication counters. Existing regression coverage also checks CSRF, tenant invoice access, password/OTP handling and authoritative order pricing.

This is not a complete security certification. Production still needs shared Redis verification, exact host/origin configuration, exposed-secret rotation, live payment configuration, dependency review, broader AI/integration testing and browser/device walkthroughs. Tokens currently use localStorage; MFA and HttpOnly token migration are not implemented. These changes have not been deployed. Some navigation and transactional labels remain code-owned, and the admin dashboard has not received the full visual redesign.

## Manual merchant payment (current checkout)

New orders use manual merchant payment. Customers call the configured shop number to obtain/confirm merchant payment details and quote their order reference. The order stays `pending` / `awaiting_payment`; customers cannot submit paid or confirmed statuses. Admin → Orders → payment status → **Approve payment (verified)** marks payment paid and automatically confirms a pending manual order. Confirmation, processing, shipping and delivery are rejected until paid. Existing historical COD/online orders are preserved.

Admin → Settings → **Checkout & payment approval** controls the contact number, optional public merchant number and instructions. SSLCommerz is hidden and blocked by the API until staff saves live credentials and enables it. Its password is encrypted and write-only. No live merchant credentials or gateway transaction have been tested. Before deployment set a stable `PAYMENT_ENCRYPTION_KEY` (Fernet key); if omitted, encryption derives from the stable Django SECRET_KEY. Changing the encryption key requires re-entering the gateway password.

Additive migrations `core.0006` and `orders.0005` have been applied only locally. No production data was copied, erased or replaced. These changes do not certify the whole site as production-ready.
