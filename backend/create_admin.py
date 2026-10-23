"""Run explicitly for first-time setup; not a deployment-time data rewrite."""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sahara_gold.settings')
django.setup()
from core.bootstrap import initialize_admin

if __name__ == '__main__':
    initialize_admin(
        os.environ.get('DJANGO_SUPERUSER_USERNAME', '').strip(),
        os.environ.get('DJANGO_SUPERUSER_EMAIL', '').strip(),
        os.environ.get('DJANGO_SUPERUSER_PASSWORD', ''),
    )
    print('Admin workspace is available. Existing credentials and catalogue were preserved.')
