# 🌤️ Веб-сервіс прогнозу погоди на Google Cloud Run

Веб-додаток для отримання прогнозу погоди, розроблений для курсової роботи. Використовує Flask, OpenWeatherMap API та розгорнутий на Google Cloud Run.

## 📋 Зміст

- [Функціонал](#функціонал)
- [Технології](#технології)
- [Передумови](#передумови)
- [Локальне налаштування](#локальне-налаштування)
- [Розгортання на Google Cloud Run](#розгортання-на-google-cloud-run)
- [Використання API](#використання-api)

## ✨ Функціонал

### Основні можливості:
- 🌍 **Пошук погоди** за назвою міста з автодоповненням
- 📍 **Геолокація** - автоматичне визначення вашого місця
- 🌡️ **Поточна погода** - температура, відчувається як, вологість, тиск, вітер
- 📊 **Інтерактивні графіки** температури (Chart.js)
- 🕐 **Погодинний прогноз** на 48 годин
- 📅 **Прогноз на 5 днів** з мін/макс температурою
- 💨 **Якість повітря** (AQI) з деталізацією забруднювачів
- ⭐ **Збережені міста** - швидкий доступ до улюблених локацій
- � **Темна/світла тема** з збереженням налаштувань
- 📱 **Адаптивний дизайн** для всіх пристроїв
- 🔄 **REST API endpoints** для інтеграції

## 🛠️ Технології

- **Backend**: Python 3.11, Flask
- **Frontend**: HTML, CSS, JavaScript
- **API**: OpenWeatherMap API
- **Containerization**: Docker
- **Cloud**: Google Cloud Run
- **Web Server**: Gunicorn

## 📦 Передумови

### Для локального запуску:
- Python 3.11+
- Docker (опціонально)
- API ключ від [OpenWeatherMap](https://openweathermap.org/api)

### Для розгортання на Google Cloud:
- Google Cloud account (пробна версія підходить)
- Google Cloud SDK (gcloud CLI)
- Docker Desktop (для Windows)

## 🚀 Локальне налаштування

### 1. Клонування репозиторію

```powershell
cd weather-service
```

### 2. Створення віртуального середовища

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Встановлення залежностей

```powershell
pip install -r requirements.txt
```

### 4. Налаштування API ключа

1. Зареєструйтесь на [OpenWeatherMap](https://openweathermap.org/api) та отримайте безкоштовний API ключ
2. Створіть файл `.env` на основі `.env.example`:

```powershell
Copy-Item .env.example .env
```

3. Відредагуйте `.env` та додайте ваш API ключ:

```
WEATHER_API_KEY=ваш_api_ключ_тут
PORT=8080
```

### 5. Запуск додатку

```powershell
python app.py
```

Відкрийте браузер та перейдіть на `http://localhost:8080`

## ☁️ Розгортання на Google Cloud Run

### Крок 1: Встановлення Google Cloud SDK

1. Завантажте [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Встановіть та ініціалізуйте:

```powershell
gcloud init
```

3. Увійдіть у ваш обліковий запис:

```powershell
gcloud auth login
```

### Крок 2: Налаштування проекту

```powershell
# Створіть новий проект або виберіть існуючий
gcloud projects create weather-service-project --name="Weather Service"

# Встановіть активний проект
gcloud config set project weather-service-project

# Увімкніть необхідні API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Крок 3: Налаштування Docker

Переконайтесь, що Docker Desktop запущений, та налаштуйте автентифікацію:

```powershell
gcloud auth configure-docker
```

### Крок 4: Збірка та завантаження Docker образу

```powershell
# Встановіть змінну PROJECT_ID
$PROJECT_ID = gcloud config get-value project

# Зберіть Docker образ
docker build -t gcr.io/$PROJECT_ID/weather-service:v1 .

# Завантажте образ до Google Container Registry
docker push gcr.io/$PROJECT_ID/weather-service:v1
```

### Крок 5: Розгортання на Cloud Run

```powershell
# Розгорніть сервіс
gcloud run deploy weather-service `
  --image gcr.io/$PROJECT_ID/weather-service:v1 `
  --platform managed `
  --region europe-central2 `
  --allow-unauthenticated `
  --set-env-vars WEATHER_API_KEY=ваш_api_ключ_тут

# Отримайте URL сервісу
gcloud run services describe weather-service --platform managed --region europe-central2 --format="value(status.url)"
```

**Важливо**: Замініть `ваш_api_ключ_тут` на ваш реальний API ключ від OpenWeatherMap.

### Альтернативний метод через Cloud Build

```powershell
# Використання Cloud Build для автоматичної збірки та деплою
gcloud run deploy weather-service `
  --source . `
  --platform managed `
  --region europe-central2 `
  --allow-unauthenticated `
  --set-env-vars WEATHER_API_KEY=ваш_api_ключ_тут
```

### Крок 6: Налаштування змінних оточення (опціонально)

Якщо ви не вказали API ключ під час деплою, можете додати його пізніше:

```powershell
gcloud run services update weather-service `
  --platform managed `
  --region europe-central2 `
  --set-env-vars WEATHER_API_KEY=ваш_api_ключ_тут
```

### Крок 7: Перегляд логів

```powershell
gcloud run logs read weather-service --platform managed --region europe-central2
```

## 🔌 Використання API

### 1. Поточна погода
```
GET /api/weather?city=Київ
```

**Відповідь:**
```json
{
  "city": "Київ",
  "country": "UA",
  "temperature": 18.5,
  "feels_like": 17.2,
  "humidity": 65,
  "pressure": 1013,
  "wind_speed": 3.5,
  "description": "хмарно",
  "icon": "04d",
  "lat": 50.4501,
  "lon": 30.5234
}
```

### 2. Погодинний прогноз (48 годин)
```
GET /api/hourly-forecast?city=Львів
```

**Відповідь:**
```json
{
  "city": "Львів",
  "country": "UA",
  "hourly": [
    {
      "time": "2025-10-06 12:00:00",
      "temperature": 19.3,
      "feels_like": 18.1,
      "description": "ясно",
      "icon": "01d",
      "humidity": 60,
      "pressure": 1015,
      "wind_speed": 2.8,
      "wind_deg": 180,
      "clouds": 10,
      "pop": 5
    }
  ]
}
```

### 3. Денний прогноз (5 днів)
```
GET /api/daily-forecast?city=Одеса
```

**Відповідь:**
```json
{
  "city": "Одеса",
  "country": "UA",
  "daily": [
    {
      "date": "2025-10-06",
      "temp_max": 22.5,
      "temp_min": 15.3,
      "description": "хмарно",
      "icon": "04d",
      "humidity": 65,
      "wind_speed": 4.2,
      "pop": 20
    }
  ]
}
```

### 4. Якість повітря
```
GET /api/air-quality?lat=50.4501&lon=30.5234
```

**Відповідь:**
```json
{
  "aqi": 2,
  "aqi_label": "Добра",
  "components": {
    "co": 230.31,
    "no2": 15.18,
    "o3": 68.66,
    "pm2_5": 5.23,
    "pm10": 7.45
  }
}
```

### 5. Геокодування міста
```
GET /api/geocode?city=Харків
```

**Відповідь:**
```json
{
  "results": [
    {
      "name": "Харків",
      "country": "UA",
      "state": "",
      "lat": 49.9935,
      "lon": 36.2304
    }
  ]
}
```

### 6. Health Check
```
GET /health
```

## 🔧 Налаштування та керування

### Оновлення сервісу

```powershell
# Зберіть новий образ з новою версією
docker build -t gcr.io/$PROJECT_ID/weather-service:v2 .
docker push gcr.io/$PROJECT_ID/weather-service:v2

# Оновіть сервіс
gcloud run deploy weather-service `
  --image gcr.io/$PROJECT_ID/weather-service:v2 `
  --platform managed `
  --region europe-central2
```

### Масштабування

```powershell
# Налаштування мін./макс. кількості інстансів
gcloud run services update weather-service `
  --min-instances=0 `
  --max-instances=10 `
  --platform managed `
  --region europe-central2
```

### Видалення сервісу

```powershell
gcloud run services delete weather-service --platform managed --region europe-central2
```

## 📊 Структура проекту

```
weather-service/
│
├── app.py                    # Основний Flask додаток з API endpoints
├── requirements.txt          # Python залежності
├── Dockerfile               # Docker конфігурація
├── .dockerignore            # Ігноровані файли для Docker
├── .env.example             # Приклад змінних оточення
├── .env                     # Змінні оточення (не в git)
├── .gitignore              # Ігноровані файли для Git
│
├── templates/              # HTML шаблони
│   └── index.html         # Головна SPA сторінка
│
├── static/                # Статичні ресурси
│   ├── css/
│   │   └── style.css     # Стилі з темами та анімаціями
│   └── js/
│       └── app.js        # JavaScript логіка та API інтеграція
│
└── README.md             # Документація
```

## 🎯 Можливості для розвитку

- ✅ Додати кешування запитів
- ✅ Реалізувати збереження обраних міст
- ✅ Додати графіки температур
- ✅ Підтримка геолокації
- ✅ Багатомовність інтерфейсу
- ✅ Темна тема
- ✅ PWA функціонал

## 📝 Ліцензія

Цей проект створено для освітніх цілей (курсова робота).

## 👨‍💻 Автор

Створено для курсової роботи з дисципліни "Грід-системи та технології хмарних обчислень"

## 🆘 Підтримка

При виникненні проблем:

1. Перевірте логи Cloud Run
2. Переконайтесь, що API ключ налаштований правильно
3. Перевірте, чи увімкнені всі необхідні Google Cloud API

## 🔗 Корисні посилання

- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Docker Documentation](https://docs.docker.com/)
