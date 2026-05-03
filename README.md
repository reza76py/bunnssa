# Bunnings SSA

Bunnings SSA is a staff allocation platform with a Django REST API backend and a React frontend. It supports multi-user ownership, road-distance allocation, centralized SMTP delivery with client-visible sender headers, email verification on registration, and a customized Django admin panel for super-admin operations.

## Repository Layout

```text
ssa2/
├── backend/
│   ├── backend/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── ssa/
│   ├── templates/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── docker/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   ├── .env.production
│   └── package.json
├── deploy/
│   ├── nginx/
│   ├── supervisor/
│   └── systemd/
├── docker-compose.yml
├── docker-compose.prod.yml
├── deploy.sh
└── .gitignore
```

## Local Development Setup

### Backend

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Local Django defaults to `backend.settings.development` via `manage.py`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend reads `REACT_APP_API_URL` from `frontend/.env` during development.

## Environment Variables

### Backend

Use `backend/.env.example` as the production template. Important variables:

```env
DJANGO_SETTINGS_MODULE=backend.settings.production
SECRET_KEY=replace-with-a-strong-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com
DB_ENGINE=django.db.backends.mysql
DB_NAME=bunnings_ssa
DB_USER=bunnings_user
DB_PASSWORD=replace-with-a-strong-database-password
DB_HOST=localhost
DB_PORT=3306
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
CORS_ALLOWED_ORIGINS=https://your-domain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
STATIC_ROOT=/srv/bunnings-ssa/backend/staticfiles
MEDIA_ROOT=/srv/bunnings-ssa/backend/media
```

### Frontend

Development:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

Production:

```env
REACT_APP_API_URL=https://api.example.com/api
```

## Allocation Email Behavior

Allocation emails are sent through the centrally configured SMTP transport (`EMAIL_HOST_USER`).

- Visible `From` and `Reply-To` use the allocation creator's registered profile email.
- Recipients see and can reply to the client email.
- No per-user SMTP or OAuth setup is required.

## Settings Split

- `backend.settings.base`: shared settings, database/email/static/media/cors config
- `backend.settings.development`: local development defaults, non-secure cookies
- `backend.settings.production`: SSL redirect, secure cookies, HSTS, production-only defaults

Use one of these when starting Django:

```bash
python manage.py runserver --settings=backend.settings.development
gunicorn backend.wsgi:application
```

For production, set `DJANGO_SETTINGS_MODULE=backend.settings.production`.

## Production Deployment

### Gunicorn + Nginx + Systemd

1. Clone the repository to `/srv/bunnings-ssa`
2. Create and activate a virtual environment
3. Install backend dependencies with `pip install -r backend/requirements.txt`
4. Copy `backend/.env.example` to `backend/.env` and fill all production values
5. Run `python backend/manage.py migrate --settings=backend.settings.production`
6. Run `python backend/manage.py collectstatic --noinput --settings=backend.settings.production`
7. Build the frontend with `npm ci && npm run build` inside `frontend/`
8. Copy `deploy/nginx/bunnings-ssa.conf` into `/etc/nginx/sites-available/`
9. Enable the site and reload Nginx
10. Copy `deploy/systemd/bunnings-ssa.service` to `/etc/systemd/system/`
11. Run `sudo systemctl daemon-reload && sudo systemctl enable --now bunnings-ssa`

### Deploy Script

`deploy.sh` automates pull, install, migrate, collectstatic, frontend build, and service restarts.

### Docker

- `docker-compose.yml`: local development stack (frontend, backend, MySQL)
- `docker-compose.prod.yml`: production-style stack
- `backend/Dockerfile`: gunicorn-based Django container
- `frontend/Dockerfile`: build React and serve with Nginx

## Safe GitHub Usage

Safe to commit:

- source code in `backend/` and `frontend/src/`
- deployment configs in `deploy/`
- `docker-compose*.yml`
- `README.md`
- `.gitignore`
- `backend/.env.example`

Never commit:

- `backend/.env`
- `frontend/.env`
- `frontend/.env.production`
- virtual environments (`.venv/`, `backend/venv/`)
- `node_modules/`
- `staticfiles/`, `media/`
- logs, secrets, credentials, real app passwords

## Deployment Checklist

1. Confirm `DEBUG=False`
2. Confirm a strong `SECRET_KEY`
3. Confirm `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`
4. Confirm SSL and secure cookie flags are enabled
5. Confirm static files are collected
6. Confirm frontend production API URL points at the live API
7. Confirm no secret values are tracked by Git
