# Sahara Gold production deployment

## Required environment

Set these values in the deployment secret store. Do not commit a `.env` file.
PostgreSQL is required in every environment; SQLite is not supported.

The AI knowledge search uses PostgreSQL `pg_trgm` for indexed lexical retrieval
and stores Hugging Face embeddings in PostgreSQL for semantic reranking. The
local PostgreSQL installation does not include `pgvector`; a managed deployment
can add `pgvector` later for indexed vector distance search without changing
the customer-facing AI contract.

```text
DEBUG=False
SECRET_KEY=<at least 50 random characters>
ALLOWED_HOSTS=shop.example.com,api.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com
FRONTEND_URL=https://shop.example.com
BACKEND_URL=https://api.example.com
DATABASE_ENGINE=postgresql
DB_NAME=sahara_gold
DB_USER=<database user>
DB_PASSWORD=<database password>
DB_HOST=<database host>
DB_PORT=5432
SSLCOMMERZ_IS_SANDBOX=False
SSLCOMMERZ_STORE_ID=<production store id>
SSLCOMMERZ_STORE_PASS=<production store password>
SECURE_HSTS_SECONDS=31536000
```

## Release commands

Run from `backend`:

```powershell
python -m pip install -r requirements.txt
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
gunicorn sahara_gold.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
```

Build the frontend from `frontend` with `npm ci` and `npm run build`, then serve
the generated `dist` directory through the same HTTPS origin or a CDN. Proxy
`/api`, `/media`, and `/static` to the backend and configure SPA fallback to
`index.html`.

Back up PostgreSQL and media files before every release. Test restoring both
before accepting live orders.