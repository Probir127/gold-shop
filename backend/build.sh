#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> Upgrading pip..."
python -m pip install --upgrade pip

echo "==> Installing backend dependencies..."
pip install -r requirements.txt

echo "==> Collecting static files..."
python manage.py collectstatic --no-input

echo "==> Running database migrations..."
python manage.py migrate

# Ensure admin credentials and tenant associations are always configured
echo "==> Ensuring admin user and tenant setup..."
python create_admin.py || true

# Optional auto-setup demo catalog data ONLY if explicitly enabled
if [ "$AUTO_POPULATE_DATA" = "True" ] || [ "$AUTO_POPULATE_DATA" = "true" ] || [ "$AUTO_POPULATE_DATA" = "1" ]; then
    echo "==> Auto-populating initial sample catalog data..."
    python populate_data.py || true
fi

echo "==> Render build finished successfully!"
