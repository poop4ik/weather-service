# Використовуємо офіційний Python runtime як базовий образ
FROM python:3.11-slim

# Встановлюємо робочу директорію в контейнері
WORKDIR /app

# Копіюємо файл залежностей
COPY requirements.txt .

# Встановлюємо залежності
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо весь код додатку
COPY . .

# Відкриваємо порт (Cloud Run використовує PORT з оточення)
EXPOSE 8080

# Команда для запуску додатку
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
