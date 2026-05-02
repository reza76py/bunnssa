#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/bunnings-ssa"
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE="docker compose -f ${COMPOSE_FILE}"

cd "$APP_DIR"
git fetch origin main
git pull --ff-only origin main

# Build updated images
$COMPOSE build --pull

# Start DB first and wait for health
$COMPOSE up -d db

# Rolling backend refresh with two replicas to reduce downtime
$COMPOSE up -d --no-deps --scale backend=2 backend

# Run DB migrations and collect static from fresh backend image
$COMPOSE exec -T backend python manage.py migrate --settings=backend.settings.production
$COMPOSE exec -T backend python manage.py collectstatic --noinput --settings=backend.settings.production

# Refresh frontend container
$COMPOSE up -d --no-deps frontend

# Clean stale containers and show status
$COMPOSE up -d --remove-orphans
$COMPOSE ps


echo "Deployment completed successfully."
