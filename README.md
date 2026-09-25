# Sahara Gold & Diamond — E-Commerce Platform

> A full-stack, multi-tenant gold jewellery store built with Django + React.  
> Live at **[shaharagold.org](https://www.shaharagold.org)**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 · Django 5 · Django REST Framework · JWT Auth |
| Database | PostgreSQL (Render) · SQLite (local dev) |
| Frontend | React 18 · Vite · React Router v6 |
| Payments | SSLCommerz (Bangladesh gateway) |
| Email | Resend API (transactional) |
| Deployment | Render (Blueprint · Free Tier) |
| Gold Rates | Apised live rate API |

---

## Features

- **Storefront** — Product catalogue with category filtering, search, and live gold rate display
- **Cart & Checkout** — Full cart flow with SSLCommerz payment gateway integration
- **Order Management** — Admin dashboard with real-time order status and payment tracking
- **Invoice System** — Auto-generated invoices synced to order payment state
- **Interactive Payment Controls** — One-click payment status updates and order settlement
- **Multi-tenant Architecture** — Isolated store data per tenant
- **Transactional Email** — Order confirmations and invoice delivery via Resend
- **Live Gold Rates** — Real-time BDT/gram pricing via Apised API
- **AI Analytics** — Admin insights panel
- **Django Admin** — Full database-level admin at `/django-admin/`

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone & Setup Backend
```bash
git clone https://github.com/Probir127/gold-shop.git
cd gold-shop/backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env           # Fill in your local values
python manage.py migrate
python manage.py runserver
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 3. One-command start (Windows)
```powershell
.\start-dev.ps1
```

Backend runs at `http://localhost:8000` · Frontend at `http://localhost:5173`

---

## Production Deployment (Render)

See **[RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)** for the full step-by-step guide.

**TL;DR:**
1. Connect this repo to [render.com](https://render.com) → **New → Blueprint**
2. Set dashboard secrets: `RESEND_API_KEY`, `APISED_API_KEY`
3. Click **Apply** — Render auto-deploys database + backend + frontend

### Pre-Deploy Audit
```bash
python scripts/verify_production_readiness.py
```
All 28 checks must pass before deploying.

---

## Project Structure

```
gold-shop/
├── backend/
│   ├── sahara_gold/        # Django project (settings, urls, wsgi)
│   ├── products/           # Product catalogue, categories, tenants
│   ├── orders/             # Order management, invoice settlement
│   ├── payments/           # SSLCommerz payment gateway
│   ├── core/               # Auth, middleware, tenant resolution
│   ├── rates/              # Live gold rate fetching
│   ├── ai/                 # Analytics & AI insights
│   ├── cms/                # Content management
│   ├── build.sh            # Render build script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # Storefront, Admin, Orders, Checkout
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Data fetching hooks
│   │   └── context/        # Auth & Cart context
│   └── package.json
├── scripts/
│   └── verify_production_readiness.py   # Pre-deploy audit
├── .github/
│   └── workflows/
│       └── render_keepalive.yml         # Cold-start prevention
├── render.yaml             # Render Blueprint (1-click deploy)
└── RENDER_DEPLOY_GUIDE.md  # Deployment documentation
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` for local development.

Key variables:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret (auto-generated in production) |
| `DEBUG` | `True` locally, `False` in production |
| `DATABASE_URL` | Postgres URL (auto-wired by Render) |
| `RESEND_API_KEY` | Transactional email (set in Render dashboard) |
| `SSLCOMMERZ_STORE_ID` | Payment gateway credentials |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | Frontend origins for CORS |
| `FRONTEND_URL` | Live frontend URL |

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health/` | Health check (used by Render) |
| `GET /api/products/` | Product catalogue |
| `GET /api/rates/latest/` | Current gold rates |
| `POST /api/orders/` | Place an order |
| `POST /api/payments/initiate/` | Start SSLCommerz payment |
| `GET /api/cms/` | Store content |
| `GET /django-admin/` | Django admin panel |

---

## Keep-Alive (Render Free Tier)

Render Free Tier spins down after 15 min of inactivity. A GitHub Actions workflow pings `/api/health/` every 13 minutes during business hours to prevent cold starts.

**Enable:** Add `RENDER_BACKEND_URL` to GitHub repo secrets → Settings → Secrets → Actions.

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built for Sahara Gold & Diamond · Bashundhara City Shopping Mall, Dhaka*