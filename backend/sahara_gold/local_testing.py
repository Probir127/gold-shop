"""Isolated interactive testing. Never loads .env or the production database."""
from pathlib import Path
import secrets
import json
from datetime import timedelta
BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_STATE = BASE_DIR.parent / '.local-testing'
LOCAL_STATE.mkdir(exist_ok=True, mode=0o700)
key_file = LOCAL_STATE / 'django-key'
if not key_file.exists():
    key_file.write_text(secrets.token_urlsafe(64))
    key_file.chmod(0o600)
SECRET_KEY = key_file.read_text().strip()
DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
INSTALLED_APPS = ['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','rest_framework','rest_framework_simplejwt.token_blacklist','products','orders','rates','payments','cms','ai','core']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware','django.middleware.clickjacking.XFrameOptionsMiddleware','core.middleware.TenantMiddleware','core.local_testing.LocalSafetyMiddleware']
ROOT_URLCONF = 'sahara_gold.urls'
DATABASES = {'default': {'ENGINE':'django.db.backends.sqlite3','NAME':LOCAL_STATE / 'database.sqlite3'}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.PBKDF2PasswordHasher']
AUTH_PASSWORD_VALIDATORS = [{'NAME':'django.contrib.auth.password_validation.' + name} for name in ['UserAttributeSimilarityValidator','MinimumLengthValidator','CommonPasswordValidator','NumericPasswordValidator']]
USE_TZ = True
TIME_ZONE = 'Asia/Dhaka'
LANGUAGE_CODE = 'en-us'
FRONTEND_DIR = BASE_DIR.parent / 'frontend/dist'
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[BASE_DIR/'templates',FRONTEND_DIR],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
MEDIA_ROOT = LOCAL_STATE / 'media'
MEDIA_URL = '/media/'
STATIC_URL = '/static/'
STATIC_ROOT = LOCAL_STATE / 'static'
REST_FRAMEWORK = {'DEFAULT_AUTHENTICATION_CLASSES':['core.authentication.SafeJWTAuthentication','rest_framework.authentication.SessionAuthentication'],'DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.PageNumberPagination','PAGE_SIZE':50}
SIMPLE_JWT = {'ACCESS_TOKEN_LIFETIME':timedelta(minutes=30),'REFRESH_TOKEN_LIFETIME':timedelta(days=7),'ROTATE_REFRESH_TOKENS':True,'BLACKLIST_AFTER_ROTATION':True}
FRONTEND_URL = 'http://127.0.0.1:5175'
BACKEND_URL = 'http://127.0.0.1:8001'
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
DEFAULT_TENANT_SLUG = 'sahara-gold'
STORE_NAME = 'New Sahara Gold and Diamond — LOCAL TEST'
STORE_EMAIL = DEFAULT_FROM_EMAIL = 'local-test@example.com'
STORE_PHONE = '01799-281878'
STORE_ADDRESS = 'LOCAL TEST DATA — not a real purchase'
LOCAL_EMAIL_CAPTURE_DIR = LOCAL_STATE / 'emails'
EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = LOCAL_EMAIL_CAPTURE_DIR
RESEND_API_KEY = EMAIL_HOST = EMAIL_HOST_USER = EMAIL_HOST_PASSWORD = ''
# Explicit private opt-in enables real transactional mail without loading a
# production database or importing unrelated credentials from .env.
mail_config_file = LOCAL_STATE / 'mail-config.json'
if mail_config_file.exists():
    mail_config = json.loads(mail_config_file.read_text())
    if mail_config.get('delivery_enabled') is True:
        RESEND_API_KEY = mail_config.get('RESEND_API_KEY', '')
        RESEND_FROM_EMAIL = mail_config.get('RESEND_FROM_EMAIL', '')
        if not RESEND_API_KEY or not RESEND_FROM_EMAIL:
            raise ValueError('Real local mail requires Resend credentials and a sender.')
        DEFAULT_FROM_EMAIL = RESEND_FROM_EMAIL
        LOCAL_EMAIL_CAPTURE_DIR = None
    del mail_config
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
SSLCOMMERZ_IS_SANDBOX = True
SSLCOMMERZ_STORE_ID = SSLCOMMERZ_STORE_PASS = ''
BKASH_APP_KEY = BKASH_APP_SECRET = BKASH_USERNAME = BKASH_PASSWORD = ''
BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
PHONE_NUMBER_ID = WHATSAPP_TOKEN = META_APP_SECRET = HUGGINGFACE_API_KEY = ''
AI_MODEL = ''
INVOICE_LINK_MAX_AGE = 7 * 24 * 60 * 60
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
