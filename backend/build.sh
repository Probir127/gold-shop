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

# Existing admin accounts and catalogue ownership are preserved during deployment.
# First-time admin creation is an explicit operator action, not a build step.

# Catalogue records are managed by admin. Deployment never inserts demo products.

echo "==> Render build finished successfully!"
