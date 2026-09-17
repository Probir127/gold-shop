# Sahara Gold: Render Free Tier Deployment Guide

This guide walks you through deploying **Sahara Gold** completely free on [Render](https://render.com).

---

## 1. Architecture on Render

- **Frontend (`sahara-gold-frontend`)**: **Render Static Site (100% Free Forever)**
  - Fast global CDN with automatic SSL.
  - Zero cold starts (visitors can browse the catalog instantly).
  - Single-Page Application rewrites configured via `_redirects` and `render.yaml`.
- **Backend (`sahara-gold-backend`)**: **Render Web Service (Free Tier)**
  - Python WSGI server using `gunicorn` with worker optimization for 512MB RAM.
  - Managed build script (`build.sh`) handles migrations and static files collection.
  - Automatic spin-down after 15 minutes of inactivity; wakes up on incoming API requests.
- **Database (`sahara-gold-db`)**: **PostgreSQL**
  - Connects using `DATABASE_URL` via `dj-database-url`.
  - *Tip*: Render's free PostgreSQL databases expire after 30 days. For a permanent free database, you can create a free database on [Supabase](https://supabase.com) or [Neon](https://neon.tech) and paste its connection string into `DATABASE_URL`.

---

## 2. Default Superuser Credentials

When the database is initialized, the following administrator is automatically provisioned:
- **Username**: `shara_gold`
- **Password**: `sahara1122@@`
- **Email**: `saharagold19@gmail.com`
- **Assigned Workspace**: `sahara-gold`

---

## 3. Deployment Steps

### Option A: 1-Click Blueprint Deployment (Fastest)

1. Push this repository to your GitHub account:
   ```bash
   git push -u origin main
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect your `gold-shop` repository.
5. Render will automatically detect `render.yaml` and configure:
   - The PostgreSQL Database
   - The Django Backend Web Service
   - The React Frontend Static Site
6. Click **Apply**.

---

### Option B: Manual Setup via Render Dashboard

If you prefer creating services manually:

#### Step 1: Create the Database
1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. Name: `sahara-gold-db`
3. Plan: **Free**
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (or External if connecting from outside).

#### Step 2: Create the Backend Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your `gold-shop` repository.
3. Configure the service:
   - **Name**: `sahara-gold-backend`
   - **Root Directory**: `backend`
   - **Language / Environment**: `Python`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn sahara_gold.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120`
   - **Plan**: **Free**
4. In the **Environment Variables** section, click **Add from .env** and paste the production environment block provided below.

#### Step 3: Create the Frontend Static Site
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect your `gold-shop` repository.
3. Configure the service:
   - **Name**: `sahara-gold-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects/Rewrites**:
   - Add a rewrite rule: Source: `/*`, Destination: `/index.html`, Action: `Rewrite`.
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://sahara-gold-backend.onrender.com/api` (replace with your actual backend URL)
   - `VITE_BACKEND_URL`: `https://sahara-gold-backend.onrender.com`
   - `VITE_SITE_URL`: `https://sahara-gold-frontend.onrender.com`

---

## 4. Production Environment Variables (Backend)

When setting up your Backend Web Service, copy and paste this into Render's **"Add from .env"** box:

```text
DEBUG=False
SECRET_KEY=your-secure-random-secret-key-at-least-50-chars
ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
AUTO_POPULATE_DATA=True
DJANGO_SUPERUSER_USERNAME=shara_gold
DJANGO_SUPERUSER_EMAIL=saharagold19@gmail.com
DJANGO_SUPERUSER_PASSWORD=sahara1122@@
SSLCOMMERZ_IS_SANDBOX=True
ALLOW_SANDBOX_PAYMENTS=True
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASS=qwerty
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_USE_TLS=False
EMAIL_HOST_USER=saharagold19@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=saharagold19@gmail.com
STORE_EMAIL=saharagold19@gmail.com
HUGGINGFACE_API_KEY=your-huggingface-token-if-any
APISED_API_KEY=your-apised-key-if-any
USD_TO_BDT_RATE=122.5
AI_MODEL=Qwen/Qwen2.5-72B-Instruct
STORE_NAME=Sahara Gold & Diamond
STORE_PHONE=01799-281878
STORE_WHATSAPP=8801799281878
STORE_ADDRESS=Level-7, Block-A, Shop-19, Bashundhara City Shopping Mall, Dhaka
```

*(Note: If you linked a Render database, Render automatically adds `DATABASE_URL`. If using Supabase or Neon, add `DATABASE_URL=postgresql://...` to the list).*
