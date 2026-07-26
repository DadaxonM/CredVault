FROM python:3.12-slim

WORKDIR /app

# Tizim sertifikatlari yangilanishi uchun (Telegram API kabi tashqi HTTPS chaqiruvlari uchun muhim)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# SQLite fayli shu yerda saqlanadi — docker-compose'da volume sifatida bog'lanadi
RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
