from decouple import config

from .base import *

DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=lambda value: [item.strip() for item in value.split(',') if item.strip()],
)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
