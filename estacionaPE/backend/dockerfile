# Usamos una imagen ligera de Python
FROM python:3.11-slim

# Crear usuario no root por seguridad
RUN useradd -m appuser

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt
# NOTA: Al poner Root Directory en Render como 'estacionaPE/backend',
# el archivo está directamente en la raíz del contexto, no en 'backend/'.
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código del backend
COPY . .

# Asignar permisos al usuario seguro
RUN chown -R appuser:appuser /app
USER appuser

# Exponer el puerto (informativo)
EXPOSE 5000

# COMANDO DE INICIO (Vital para Render)
# Usamos Gunicorn y la variable de entorno $PORT que Render asigna automáticamente
CMD gunicorn --bind 0.0.0.0:$PORT app:app