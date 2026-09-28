"""Isolated pricing regression settings; never connect to the production database."""
SECRET_KEY = 'pricing-tests-only'
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'rates', 'products', 'core', 'orders', 'ai']
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
MIGRATION_MODULES = {app: None for app in ['products', 'core', 'orders', 'ai']}
ROOT_URLCONF = 'rates.test_urls'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'Asia/Dhaka'
REST_FRAMEWORK = {'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication']}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

REST_FRAMEWORK.update({'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination', 'PAGE_SIZE': 100})
ALLOWED_HOSTS = ['testserver']
