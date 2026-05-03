from decouple import config, Csv

from .base import *

DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config(
	'ALLOWED_HOSTS',
	default='staffallocation.rezteche.com,www.staffallocation.rezteche.com',
	cast=Csv(),
)
CSRF_TRUSTED_ORIGINS = config(
	'CSRF_TRUSTED_ORIGINS',
	default='https://staffallocation.rezteche.com,https://www.staffallocation.rezteche.com',
	cast=Csv(),
)
CORS_ALLOWED_ORIGINS = config(
	'CORS_ALLOWED_ORIGINS',
	default='https://staffallocation.rezteche.com,https://www.staffallocation.rezteche.com',
	cast=Csv(),
)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
