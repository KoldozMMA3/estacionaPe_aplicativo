FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y default-mysql-client build-essential && rm -rf /var/lib/apt/lists/*

# Copiar TODO el backend al root de la imagen
COPY . .

# Normalizar saltos de línea del entrypoint
RUN sed -i 's/\r$//' entrypoint.sh

# Dar permisos de ejecución
RUN chmod +x entrypoint.sh

# Instalar requerimientos (el requirements.txt ya está en la raíz)
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]


