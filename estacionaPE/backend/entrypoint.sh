#!/bin/sh
set -e

# Esperar a que MySQL esté listo
echo "Waiting for MySQL to be ready..."
RETRY=0
MAX_RETRY=30

while ! mysqladmin ping -h "$DB_HOST" -P "$DB_PORT" --silent; do
  RETRY=$((RETRY+1))
  if [ "$RETRY" -ge "$MAX_RETRY" ]; then
    echo "MySQL did not become available in time."
    exit 1
  fi
  echo "Waiting for MySQL... attempt $RETRY/$MAX_RETRY"
  sleep 2
done

echo "MySQL is up — running DB migrations/initialization."

# Opción A: usar flask-migrate (recomendado si usas migrations)
if command -v flask >/dev/null 2>&1; then
  # export FLASK_APP if needed (ajusta si tu entrypoint distinto)
  export FLASK_APP=app.py
  # Intentar migraciones; si no hay alembic, ignorar y fallback a create_all
  if flask db upgrade >/dev/null 2>&1; then
    echo "Applied Flask-Migrate migrations."
  else
    echo "No migrations applied (flask db upgrade failed). Falling back to create_all."
    python - <<PY
from app import create_app
from db import db
app = create_app()
with app.app_context():
    db.create_all()
PY
  fi
else
  # Fallback directo: create_all()
  python - <<PY
from app import create_app
from db import db
app = create_app()
with app.app_context():
    db.create_all()
PY
fi

echo "DB ready. Starting Gunicorn..."
# Ejecutar gunicorn reemplazando el proceso (para forward de señales)
exec gunicorn --workers 4 --bind 0.0.0.0:5000 wsgi:app
