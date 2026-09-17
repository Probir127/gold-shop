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

# Optional auto-setup admin & sample data if env flag set
if [ "$AUTO_POPULATE_DATA" = "True" ] || [ "$AUTO_POPULATE_DATA" = "true" ] || [ "$AUTO_POPULATE_DATA" = "1" ]; then
    echo "==> Auto-populating initial admin and catalog data..."
    python create_admin.py || true
    python populate_data.py || true
fi

echo "==> Render build finished successfully!"
