"""Full API regression settings: SQLite, local memory email, no production env."""
from rates.test_settings import *
from pathlib import Path
SECRET_KEY = 'local-audit-only-not-for-deployment-1234567890'
ROOT_URLCONF = 'core.audit_urls'
INSTALLED_APPS = [*INSTALLED_APPS, 'django.contrib.sessions', 'rest_framework_simplejwt.token_blacklist']
MIDDLEWARE = ['django.contrib.sessions.middleware.SessionMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware', 'core.middleware.TenantMiddleware']
REST_FRAMEWORK = {**REST_FRAMEWORK, 'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication','rest_framework.authentication.SessionAuthentication']}
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[Path(__file__).resolve().parents[1]/'templates'],'APP_DIRS':True}]
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
EMAIL_HOST=''
EMAIL_PORT=587
EMAIL_HOST_USER=''
EMAIL_HOST_PASSWORD=''
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL='shop@example.com'
STORE_EMAIL='shop@example.com'
STORE_NAME='Sahara Gold'
STORE_PHONE='01799281878'
STORE_ADDRESS='Dhaka'
RESEND_API_KEY=''
DEFAULT_TENANT_SLUG='sahara-gold'
FRONTEND_URL='http://localhost:5174'
BACKEND_URL='http://localhost:8000'
