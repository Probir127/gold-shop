# Sahara Gold: Deployment and Security Runbook

This document is the operational handoff for the Sahara Gold AI-powered jewelry shop.
It describes the current architecture, completed work, validation status, deployment
procedure, and the remaining requirements before accepting live customer payments.

## 1. System overview

Sahara Gold has three connected layers:

- React/Vite storefront and customer account at `/`, `/shop`, `/account`, and related routes.
- React command center at `/admin/` for normal store operations.
- Django/Jazzmin platform administration at `/django-admin/` for controlled maintenance.
- Django REST APIs under `/api/`.
- PostgreSQL as the only supported database.
- Hugging Face/Qwen integration for optional AI completion and embeddings.
- SSLCommerz integration for hosted payment sessions and server-side callback validation.

Normal business operations belong in the React command center. Django Admin is a
platform maintenance tool and must not be treated as the normal tenant workflow.

## 2. Completed implementation

### Storefront and commerce

- Product catalog with categories, stock visibility, search, product details, cart, checkout, and order confirmation.
- Gold-rate display and live-rate integration.
- Public storefront reads remain available without customer login.
- Orders calculate prices from current server-side product/rate data rather than trusting browser prices.
- Empty orders, non-positive quantities, and out-of-stock products are rejected.
- Order and invoice creation is transactional.
- Customer order tracking uses normalized phone verification.
- Customer registration and login use Django users plus JWT tokens.
- Customer order history requires an authenticated customer token.

### Payments and invoices

- SSLCommerz payment initialization verifies the order phone number.
- Success callbacks are validated server-to-server with SSLCommerz.
- Callback order ID, amount, currency, status, and duplicate-payment state are checked.
- Payment failure and cancellation routes exist in the frontend.
- Invoice PDF, sending, paid-state changes, and HTML rendering require authentication.
- Invoice data is filtered by active tenant.
- Administrative invoice copies require staff access.

### Administration and authorization

- React admin uses JWT access/refresh tokens and tenant headers.
- Tenant membership is resolved by `X-Tenant-Slug` or the user's active membership.
- Tenant membership is checked before tenant-scoped API access.
- Staff-only protection exists for catalog, rate, and order operational mutations.
- Tenant manager/admin protection exists for CRM, conversations, dashboard operations, and destructive resets.
- Sensitive tenant credentials are redacted from API serialization.
- Sensitive-file probes for `.env`, `.git`, database files, backups, and SQL dumps return `404` instead of the SPA shell.

### PostgreSQL and AI

- SQLite is not supported and is rejected at Django startup.
- PostgreSQL is configured through `DATABASE_ENGINE=postgresql` and `DB_*` variables.
- Existing catalog, users, rates, orders, AI, and CMS data was migrated to PostgreSQL.
- PostgreSQL `pg_trgm` is enabled through migration `core.0002`.
- Knowledge chunks have a GIN trigram index named `knowledge_content_trgm_idx`.
- AI knowledge search uses PostgreSQL lexical retrieval plus Hugging Face embedding reranking.
- Embeddings are currently stored in PostgreSQL JSON fields and ranked in Python.
- The local PostgreSQL server does not provide `pgvector`; native vector distance indexes are therefore not enabled.

## 3. Repository layout

```text
backend/       Django project, API, PostgreSQL migrations, AI services
frontend/      React/Vite storefront and React command center
backend/.env   Local secrets; ignored by Git and never committed
backend/PRODUCTION.md
DEPLOYMENT_AND_SECURITY.md
```

## 4. Local development

Start PostgreSQL first. The local environment must contain a `backend/.env` with
PostgreSQL credentials. Copy the shape from `backend/.env.example`; never copy
real secrets into tracked files.

Start the backend:

```powershell
Set-Location D:\shop\sahara-gold\gold-shop\backend
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Start the frontend in another terminal:

```powershell
Set-Location D:\shop\sahara-gold\gold-shop\frontend
npm install
npm run dev -- --port 5174
```

Open:

```text
http://localhost:5174/
```

The Vite proxy sends `/api` and `/media` to `http://127.0.0.1:8000`.

## 5. Validation commands

Run backend checks from `backend`:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
python manage.py check --deploy
```

Run the frontend checks from `frontend`:

```powershell
npm run build
npm run lint
```

The production build and backend tests are release gates. The repository currently
has a known ESLint backlog; lint must be cleaned before making it a blocking CI gate.

Expected critical smoke checks:

```text
GET  /api/products/              200
GET  /api/rates/latest/          200
GET  /api/cms/content/homepage/  200
GET  /api/ai/price-insight/      200
POST /api/ai/chat/               200 with a valid message
GET  /api/invoices/              401 without authentication
POST /api/products/              401 without staff authentication
POST /api/rates/                 401 without staff authentication
GET  /.env                       404
GET  /.git/HEAD                  404
```

## 6. Production environment

Set these in a deployment secret manager, not in Git:

```text
DEBUG=False
SECRET_KEY=<long random value, at least 50 characters>
ALLOWED_HOSTS=shop.example.com,api.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com
FRONTEND_URL=https://shop.example.com
BACKEND_URL=https://api.example.com
DATABASE_ENGINE=postgresql
DB_NAME=sahara_gold
DB_USER=<dedicated application role>
DB_PASSWORD=<database password>
DB_HOST=<managed PostgreSQL host>
DB_PORT=5432
DB_CONN_MAX_AGE=60
SSLCOMMERZ_IS_SANDBOX=False
SSLCOMMERZ_STORE_ID=<production store id>
SSLCOMMERZ_STORE_PASS=<production store password>
SECURE_HSTS_SECONDS=31536000
EMAIL_BACKEND=<production SMTP backend>
EMAIL_HOST_USER=<SMTP user>
EMAIL_HOST_PASSWORD=<SMTP password>
DEFAULT_FROM_EMAIL=<verified sender>
STORE_EMAIL=<store mailbox>
HUGGINGFACE_API_KEY=<rotated production key, if AI completion is enabled>
```

Production startup intentionally fails if the secret is weak, hosts are wildcarded,
URLs are not HTTPS, CORS is missing, SSLCommerz is still in sandbox mode, or the
database engine is not PostgreSQL.

## 7. Production release procedure

1. Provision managed PostgreSQL and a dedicated application role.
2. Provision object/media storage or a durable media volume.
3. Configure the production secret manager with the values above.
4. Rotate any API keys that were ever stored in local development files.
5. Install backend dependencies:

```powershell
python -m pip install -r backend/requirements.txt
```

6. Validate configuration:

```powershell
Set-Location backend
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

7. Build the frontend:

```powershell
Set-Location frontend
npm ci
npm run build
```

8. Serve the frontend `dist` directory through HTTPS with SPA fallback to
   `index.html`.
9. Run Django behind a production WSGI server such as Gunicorn:

```powershell
gunicorn sahara_gold.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
```

10. Put Nginx, a managed load balancer, or equivalent in front of the services.
   Proxy `/api`, `/media`, and `/static`; terminate TLS at the edge.
11. Run public API, admin login, customer registration, checkout, payment callback,
   invoice, and AI smoke tests against the deployed HTTPS domain.
12. Enable monitoring, error reporting, database backups, media backups, and alerts.

## 8. Required pre-launch checks

Do not accept real orders until every item below is complete:

- [ ] Production PostgreSQL is managed, backed up, and restore-tested.
- [ ] Production `SECRET_KEY` is random and stored only in a secret manager.
- [ ] `DEBUG=False` and explicit `ALLOWED_HOSTS` are active.
- [ ] HTTPS certificate, redirect, secure cookies, HSTS, and CORS are verified.
- [ ] Production SSLCommerz account and callback URLs are verified in sandbox first,
      then switched to live mode.
- [ ] Payment success, failure, cancellation, replay, amount mismatch, and invalid
      callback tests are completed.
- [ ] SMTP delivery is verified for customer and store notifications.
- [ ] Hugging Face keys are rotated and AI fallback behavior is tested.
- [ ] Admin accounts use strong passwords and appropriate tenant roles.
- [ ] Django Admin access is restricted to platform staff and protected by HTTPS.
- [ ] Rate limiting/WAF protection is enabled for login, customer auth, order,
      tracking, payment, and AI endpoints.
- [ ] PostgreSQL and media restore procedures are tested.
- [ ] Monitoring and alerting are active.
- [ ] A browser-level checkout and mobile smoke test is complete.
- [ ] The remaining ESLint backlog is either fixed or explicitly accepted in CI.
- [ ] An authenticated external security assessment is completed against the real domain.

## 9. Security limitations and honest status

The local application has been checked and hardened, but local checks cannot prove
that external payment, SMTP, DNS, TLS, WAF, hosting, backups, or third-party AI
credentials are correctly configured. Those must be verified in the deployment
environment before the site is described as a live production gold-commerce system.

The current AI implementation is PostgreSQL-backed and production-usable without
pgvector. If the managed PostgreSQL provider supports pgvector, it can later be
introduced with a dedicated `VectorField` migration and HNSW/IVFFlat indexes after
an embedding rebuild and relevance test.
