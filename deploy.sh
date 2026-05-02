#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/bunnings-ssa"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
VENV_DIR="$APP_DIR/.venv"

cd "$APP_DIR"
git pull origin main

source "$VENV_DIR/bin/activate"
pip install -r "$BACKEND_DIR/requirements.txt"
python "$BACKEND_DIR/manage.py" migrate --settings=backend.settings.production
python "$BACKEND_DIR/manage.py" collectstatic --noinput --settings=backend.settings.production

cd "$FRONTEND_DIR"
npm ci
npm run build

sudo systemctl restart bunnings-ssa
sudo systemctl reload nginx

echo "Deployment completed successfully."
