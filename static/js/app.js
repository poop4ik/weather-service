// Глобальні змінні
let currentCity = '';
let currentLat = null;
let currentLon = null;
let temperatureChart = null;
let currentUnits = 'metric'; // За замовчуванням метричні одиниці
const API_KEY = '6951b848da7d2bc129c4a520d8c1e275'; // Ваш API ключ
let activityRecommendationsData = null; // Зберігаємо дані рекомендацій

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    loadSavedCities();
    loadTheme();
    loadUnitsSettings();
    
    // Обробка Enter в полі пошуку
    document.getElementById('cityInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });

    // Автоматичне визначення геолокації при завантаженні
    autoLoadWeatherOnStart();
});

// Автоматичне завантаження погоди при старті
async function autoLoadWeatherOnStart() {
    // Приховуємо контент на час завантаження
    hideWeatherContent();
    
    // Спробувати визначити геолокацію
    if (navigator.geolocation) {
        showLoading(true);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                try {
                    // Отримання назви міста за координатами
                    const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
                    const data = await response.json();
                    
                    if (data && data.length > 0) {
                        const city = data[0].name;
                        document.getElementById('cityInput').value = city;
                        await loadAllWeatherData(city);
                    } else {
                        // Якщо не вдалося отримати місто - показати Київ
                        loadDefaultCity();
                    }
                } catch (error) {
                    // При помилці - показати Київ
                    loadDefaultCity();
                } finally {
                    showLoading(false);
                }
            },
            (error) => {
                // Користувач заборонив геолокацію або інша помилка - показати Київ
                loadDefaultCity();
            }
        );
    } else {
        // Геолокація не підтримується - показати Київ
        loadDefaultCity();
    }
}

// Завантаження Києва за замовчуванням
async function loadDefaultCity() {
    showLoading(true);
    const defaultCity = 'Київ';
    document.getElementById('cityInput').value = defaultCity;
    await loadAllWeatherData(defaultCity);
}

// Пошук погоди
async function searchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    
    if (!city) {
        showError('Будь ласка, введіть назву міста');
        return;
    }

    currentCity = city;
    await loadAllWeatherData(city);
}

// Глобальні змінні для зберігання даних
let weeklyForecastData = null;
let selectedDay = 0; // Індекс обраного дня

// Завантаження всіх даних про погоду
async function loadAllWeatherData(city) {
    showLoading(true);
    hideError();
    hideWeatherContent();
    
    // Встановлюємо поточне місто
    currentCity = city;
    
    // Оновлюємо видимість кнопки збереження
    updateSaveCityButton();

    try {
        // Паралельне завантаження даних
        const [weatherData, weeklyData] = await Promise.all([
            fetchWeather(city),
            fetch7DayForecast(city)
        ]);

        // Збереження даних
        weeklyForecastData = weeklyData;

        // Отримання координат для якості повітря
        if (weatherData.lat && weatherData.lon) {
            currentLat = weatherData.lat;
            currentLon = weatherData.lon;
            const airQuality = await fetchAirQuality(currentLat, currentLon);
            displayAirQuality(airQuality);
            
            // Завантаження карти
            loadWeatherMap(currentLat, currentLon);
            
            // Завантажуємо дані для астрономії відразу для сьогодні
            await loadAstronomyData(currentLat, currentLon);
        }

        // Відображення даних
        displayCurrentWeather(weatherData);
        displayWeeklyForecast(weeklyData);
        
        // За замовчуванням показуємо перший день
        selectDay(0);
        displayWeatherTips(weatherData);
        
        // Завантаження рекомендацій активностей
        await loadActivityRecommendations(city);
        
        // Ініціалізуємо історичні дані
        initHistoryCharts();
        
        // Показати основну секцію контенту
        showWeatherContent();
        document.getElementById('activityRecommendations').classList.remove('hidden');
        
        // Показати контейнери на ВСІХ вкладках відразу після завантаження
        const astronomyGrid = document.querySelector('.astronomy-grid');
        if (astronomyGrid) astronomyGrid.classList.remove('hidden');
        
        const historyGrid = document.querySelector('.history-charts-grid');
        if (historyGrid) historyGrid.classList.remove('hidden');
        
        const weatherMap = document.getElementById('weatherMapSection');
        if (weatherMap) weatherMap.classList.remove('hidden');
        
        // Синхронізуємо селектори днів для всіх вкладок
        syncDaySelectors('astronomy');
        syncDaySelectors('history');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Отримання поточної погоди
async function fetchWeather(city) {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Помилка отримання даних');
    }
    
    return await response.json();
}

// Отримання погодинного прогнозу
async function fetchHourlyForecast(city) {
    const response = await fetch(`/api/hourly-forecast?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Помилка отримання прогнозу');
    }
    
    return await response.json();
}

// Отримання 7-денного прогнозу
async function fetch7DayForecast(city) {
    const response = await fetch(`/api/7day-forecast?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Помилка отримання прогнозу');
    }
    
    return await response.json();
}

// Отримання якості повітря
async function fetchAirQuality(lat, lon) {
    const response = await fetch(`/api/air-quality?lat=${lat}&lon=${lon}`);
    
    if (!response.ok) {
        return null;
    }
    
    return await response.json();
}

// Відображення поточної погоди
function displayCurrentWeather(data) {
    document.getElementById('location').textContent = `${data.city}, ${data.country}`;
    
    // Конвертація температури якщо потрібно
    const temp = convertTemperature(data.temperature);
    const feelsLike = convertTemperature(data.feels_like);
    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
    
    document.getElementById('current-temp').textContent = `${temp}${tempSymbol}`;
    document.getElementById('current-description').textContent = data.description;
    document.getElementById('current-feels-like').textContent = `${feelsLike}${tempSymbol}`;
    
    // Залишаємо інші елементи для загальної інформації
    const humidityElement = document.getElementById('humidity') || document.getElementById('humidityValue');
    if (humidityElement) humidityElement.textContent = `${data.humidity}%`;
    
    const pressureElement = document.getElementById('pressure');
    if (pressureElement) pressureElement.textContent = `${data.pressure} hPa`;
    
    const windSpeedElement = document.getElementById('windSpeed');
    if (windSpeedElement) {
        const windSpeed = convertWindSpeed(data.wind_speed);
        const windUnit = currentUnits === 'metric' ? 'м/с' : 'mph';
        windSpeedElement.textContent = `${windSpeed} ${windUnit}`;
    }
    
    // Оновлення атмосферних умов з круговими діаграмами
    const atmosphericData = {
        visibility: data.visibility,
        clouds: data.clouds,
        humidity: data.humidity
    };
    updateAtmosphericConditionsFromCurrentWeather(atmosphericData);
    
    // Сонце і місяць
    displaySunMoonInfo(data);
    
    // Комфорт
    displayComfortInfo(data);
    
    // УФ-індекс та ймовірність дощу
    updateUVAndRainInfo(data);
    
    const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    document.getElementById('current-icon').src = iconUrl;
    document.getElementById('current-icon').alt = data.description;
}

// Відображення інформації про сонце і місяць
function displaySunMoonInfo(data) {
    if (data.sunrise && data.sunset) {
        const sunrise = new Date(data.sunrise * 1000);
        const sunset = new Date(data.sunset * 1000);
        
        document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('sunset').textContent = sunset.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Тривалість дня
        const dayLength = sunset - sunrise;
        const hours = Math.floor(dayLength / (1000 * 60 * 60));
        const minutes = Math.floor((dayLength % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('dayLength').textContent = `${hours}г ${minutes}хв`;
    } else {
        document.getElementById('sunrise').textContent = 'Н/Д';
        document.getElementById('sunset').textContent = 'Н/Д';
        document.getElementById('dayLength').textContent = 'Н/Д';
    }
    
    // Часовий пояс
    if (data.timezone) {
        const timezoneHours = data.timezone / 3600;
        const sign = timezoneHours >= 0 ? '+' : '';
        document.getElementById('timezone').textContent = `UTC${sign}${timezoneHours}`;
    } else {
        document.getElementById('timezone').textContent = 'Н/Д';
    }
}

// Функція для оновлення УФ-індексу та ймовірності дощу
function updateUVAndRainInfo(data) {
    // УФ-індекс
    const uvIndexElement = document.getElementById('uv-index');
    if (uvIndexElement && data.uv_index !== undefined) {
        uvIndexElement.textContent = data.uv_index;
    }
    
    // Ймовірність дощу
    const rainProbabilityElement = document.getElementById('rain-probability');
    if (rainProbabilityElement && data.rain_probability !== undefined) {
        rainProbabilityElement.textContent = `${data.rain_probability}%`;
    }
}

// Відображення інформації про комфорт
function displayComfortInfo(data) {
    // Індекс комфорту (спрощений розрахунок на основі температури та вологості)
    const comfortIndex = calculateComfortIndex(data.temperature, data.humidity);
    document.getElementById('comfortIndex').textContent = comfortIndex;
    
    // Точка роси (спрощений розрахунок)
    const dewPoint = calculateDewPoint(data.temperature, data.humidity);
    document.getElementById('dewPoint').textContent = `${dewPoint}°C`;
    
    // Порив вітру
    if (data.wind_gust) {
        document.getElementById('windGust').textContent = `${data.wind_gust} м/с`;
    } else {
        document.getElementById('windGust').textContent = 'Немає';
    }
    
    // Напрямок вітру
    if (data.wind_deg !== undefined) {
        const direction = getWindDirection(data.wind_deg);
        document.getElementById('windDirection').textContent = direction;
    } else {
        document.getElementById('windDirection').textContent = 'Н/Д';
    }
}

// Розрахунок індексу комфорту
function calculateComfortIndex(temp, humidity) {
    if (temp >= 18 && temp <= 24 && humidity >= 40 && humidity <= 60) {
        return 'Відмінно';
    } else if (temp >= 16 && temp <= 26 && humidity >= 30 && humidity <= 70) {
        return 'Добре';
    } else if (temp >= 10 && temp <= 30 && humidity >= 20 && humidity <= 80) {
        return 'Задовільно';
    } else {
        return 'Незручно';
    }
}

// Розрахунок точки роси (спрощена формула)
function calculateDewPoint(temp, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);
    return Math.round(dewPoint * 10) / 10;
}

// Отримання напрямку вітру за градусами
function getWindDirection(degrees) {
    const directions = [
        'Пн', 'ПнПнСх', 'ПнСх', 'СхПнСх',
        'Сх', 'СхПдСх', 'ПдСх', 'ПдПдСх',
        'Пд', 'ПдПдЗх', 'ПдЗх', 'ЗхПдЗх',
        'Зх', 'ЗхПнЗх', 'ПнЗх', 'ПнПнЗх'
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Відображення 7-денного прогнозу (селектор днів)
function displayWeeklyForecast(data) {
    const container = document.getElementById('weeklyForecast');
    container.classList.remove('hidden');
    container.innerHTML = '';

    const tempSymbol = currentUnits === 'metric' ? '°' : '°';

    data.weekly.forEach((item, index) => {
        const date = new Date(item.date);
        const dayName = date.toLocaleDateString('uk-UA', { weekday: 'long' });
        const dayDate = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

        const tempMax = convertTemperature(item.temp_max);
        const tempMin = convertTemperature(item.temp_min);

        const dayCard = document.createElement('div');
        dayCard.className = `weekly-day-card ${index === 0 ? 'selected' : ''}`;
        dayCard.setAttribute('data-day-index', index);
        dayCard.onclick = () => selectDay(index);
        dayCard.innerHTML = `
            <div class="weekly-day-name">${dayName}</div>
            <div class="weekly-day-date">${dayDate}</div>
            <img class="weekly-day-icon" src="https://openweathermap.org/img/wn/${item.icon}@2x.png" alt="${item.description}">
            <div class="weekly-day-temp">
                <span style="color: #ff6b6b;">${tempMax}${tempSymbol}</span> / 
                <span style="color: #4dabf7;">${tempMin}${tempSymbol}</span>
            </div>
            <div class="weekly-day-desc">${item.description}</div>
        `;
        
        container.appendChild(dayCard);
    });
}

// Вибір дня для детального перегляду
function selectDay(dayIndex) {
    if (!weeklyForecastData || !weeklyForecastData.weekly[dayIndex]) return;
    
    selectedDay = dayIndex;
    const dayData = weeklyForecastData.weekly[dayIndex];
    
    // Оновлення активної картки на всіх вкладках
    document.querySelectorAll('.weekly-day-card').forEach(card => {
        const cardIndex = parseInt(card.getAttribute('data-day-index'));
        if (cardIndex === dayIndex) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Оновлення заголовків
    const selectedDate = new Date(dayData.date).toLocaleDateString('uk-UA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    document.getElementById('chartSubtitle').textContent = `Погодинний графік на ${selectedDate}`;
    document.getElementById('hourlySubtitle').textContent = `Детальна погода на ${selectedDate}`;
    
    // Динамічне оновлення всіх секцій для обраного дня
    updateDayBasedSections(dayData);
    
    // Оновлення поточної погоди для обраного дня
    updateCurrentWeatherForDay(dayData);
    
    // Оновлення якості повітря та атмосферних умов для обраного дня
    updateAtmosphericConditionsForDay(dayData);
    
    // Відображення погодинного прогнозу для обраного дня
    displayHourlyForecastForDay(dayData.hourly_data);
    
    // Створення графіка для обраного дня
    createTemperatureChart(dayData.hourly_data);
    
    // Оновлення астрономічних даних для обраного дня (завжди, не тільки якщо вкладка активна)
    loadAstronomyData();
    
    // Оновлення історичних графіків для обраного дня (завжди, не тільки якщо вкладка активна)
    updateHistoryCharts();
    
    // Оновлення сільськогосподарських даних для обраного дня
    if (document.getElementById('tab-agriculture') && document.getElementById('tab-agriculture').classList.contains('active')) {
        loadAgricultureData();
    }
}

// Оновлення всіх секцій на основі обраного дня
function updateDayBasedSections(dayData) {
    // НЕ оновлюємо секцію "Сонце і місяць" для обраного дня,
    // бо API не надає точні дані про схід/захід для майбутніх днів.
    // Залишаємо тільки дані для поточного дня з displaySunMoonInfo()
    // updateSunMoonSection(dayData);
    
    // Оновлення секції "Комфорт"
    updateComfortSection(dayData);
    
    // Оновлення рекомендацій
    displayWeatherTipsForDay(dayData);
}

// Функція для оновлення поточної погоди для обраного дня
function updateCurrentWeatherForDay(dayData) {
    const currentTemp = document.getElementById('current-temp');
    const currentFeelsLike = document.getElementById('current-feels-like');
    const currentDescription = document.getElementById('current-description');
    const currentIcon = document.getElementById('current-icon');
    const dateDisplay = document.getElementById('weather-date-display');

    const temp = convertTemperature(dayData.temp_avg);
    const feelsLike = convertTemperature(dayData.feels_like);
    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';

    if (currentTemp) currentTemp.textContent = temp + tempSymbol;
    if (currentFeelsLike) currentFeelsLike.textContent = feelsLike + tempSymbol;
    if (currentDescription) currentDescription.textContent = dayData.description;
    if (currentIcon) {
        currentIcon.src = `https://openweathermap.org/img/wn/${dayData.icon}@2x.png`;
        currentIcon.alt = dayData.description;
    }
    
    // Оновлення вітру та тиску
    const windSpeedElement = document.getElementById('windSpeed');
    const pressureElement = document.getElementById('pressure');
    
    if (windSpeedElement) {
        const windSpeed = convertWindSpeed(dayData.wind_speed);
        const windUnit = currentUnits === 'metric' ? 'м/с' : 'mph';
        windSpeedElement.textContent = `${windSpeed} ${windUnit}`;
    }
    if (pressureElement) pressureElement.textContent = `${dayData.pressure} hPa`;
    
    // Оновлення дати та дня тижня
    if (dateDisplay) {
        const date = new Date(dayData.date);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        
        let displayText = '';
        if (isToday) {
            displayText = 'сьогодні';
        } else if (isTomorrow) {
            displayText = 'завтра';
        } else {
            const dayNames = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п\'ятниця', 'субота'];
            const monthNames = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
            displayText = `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`;
        }
        dateDisplay.textContent = displayText;
    }
    
    // Оновлення додаткових показників
    updateWeatherComfortInfo(dayData);
}

// Функція для оновлення інформації про комфорт погоди
function updateWeatherComfortInfo(dayData) {
    // УФ-індекс (симуляція на основі погодних умов)
    const uvIndex = document.getElementById('uv-index');
    const uvStatus = document.getElementById('uv-status');
    if (uvIndex && uvStatus) {
        let uv = Math.floor(Math.random() * 8) + 1; // Симуляція УФ-індексу
        if (dayData.icon.includes('n')) uv = 0; // Вночі УФ-індекс 0
        
        uvIndex.textContent = uv;
        if (uv <= 2) uvStatus.textContent = 'Низький';
        else if (uv <= 5) uvStatus.textContent = 'Помірний';
        else if (uv <= 7) uvStatus.textContent = 'Високий';
        else uvStatus.textContent = 'Дуже високий';
    }
    
    // Рівень комфорту
    const comfortLevel = document.getElementById('comfort-level');
    const comfortDescription = document.getElementById('comfort-description');
    if (comfortLevel && comfortDescription) {
        const temp = dayData.temp_avg;
        const humidity = dayData.humidity;
        
        let comfort = '';
        let description = '';
        
        if (temp >= 18 && temp <= 24 && humidity >= 40 && humidity <= 60) {
            comfort = 'Відмінно';
            description = 'Ідеальні умови';
        } else if (temp >= 15 && temp <= 27 && humidity >= 30 && humidity <= 70) {
            comfort = 'Добре';
            description = 'Комфортно';
        } else if (temp >= 10 && temp <= 30) {
            comfort = 'Задовільно';
            description = 'Прийнятно';  
        } else {
            comfort = 'Незручно';
            description = 'Некомфортні умови';
        }
        
        comfortLevel.textContent = comfort;
        comfortDescription.textContent = description;
    }
    
    // Ймовірність дощу
    const rainProbability = document.getElementById('rain-probability');
    const rainStatus = document.getElementById('rain-status');
    if (rainProbability && rainStatus) {
        const prob = dayData.pop || 0;
        rainProbability.textContent = prob + '%';
        
        if (prob <= 20) rainStatus.textContent = 'Малоймовірно';
        else if (prob <= 50) rainStatus.textContent = 'Можливо';
        else if (prob <= 80) rainStatus.textContent = 'Ймовірно';
        else rainStatus.textContent = 'Дуже ймовірно';
    }
}

// Функція для оновлення атмосферних умов з круговими діаграмами
function updateAtmosphericConditionsForDay(dayData) {
    // Оновлення видимості (якщо доступно)
    if (dayData.visibility) {
        const visibilityKm = Math.round(dayData.visibility / 1000 * 10) / 10; // округлення до 1 десяткового
        updateCircularProgress('visibility', dayData.visibility, 10000, `${visibilityKm} км`);
    }
    
    // Оновлення хмарності
    if (dayData.clouds !== undefined) {
        updateCircularProgress('cloudiness', dayData.clouds, 100, `${dayData.clouds}%`);
    }
    
    // Оновлення вологості
    if (dayData.humidity !== undefined) {
        updateCircularProgress('humidity', dayData.humidity, 100, `${dayData.humidity}%`);
    }
}

// Функція для оновлення кругової діаграми прогресу
function updateCircularProgress(chartId, value, maxValue, displayText) {
    const circleElement = document.getElementById(`${chartId}Circle`);
    const valueElement = document.getElementById(`${chartId}Value`);
    const percentElement = document.getElementById(`${chartId}Percent`);
    
    if (!circleElement || !valueElement || !percentElement) return;
    
    const percentage = Math.min((value / maxValue) * 100, 100);
    
    // Анімація кругової діаграми
    circleElement.style.strokeDasharray = `${percentage}, 100`;
    
    // Оновлення тексту
    valueElement.textContent = displayText;
    percentElement.textContent = `${Math.round(percentage)}%`;
}

// Функція для оновлення атмосферних умов з поточної погоди
function updateAtmosphericConditionsFromCurrentWeather(data) {
    // Оновлення видимості (якщо доступно)
    if (data.visibility) {
        const visibilityKm = Math.round(data.visibility / 1000 * 10) / 10;
        updateCircularProgress('visibility', data.visibility, 10000, `${visibilityKm} км`);
    }
    
    // Оновлення хмарності
    if (data.clouds !== undefined) {
        updateCircularProgress('cloudiness', data.clouds, 100, `${data.clouds}%`);
    }
    
    // Оновлення вологості
    if (data.humidity !== undefined) {
        updateCircularProgress('humidity', data.humidity, 100, `${data.humidity}%`);
    }
}

// Оновлення секції "Сонце і місяць" для обраного дня
function updateSunMoonSection(dayData) {
    // Симуляція розрахунку сходу/заходу для обраного дня
    const selectedDate = new Date(dayData.date);
    const dayOfYear = Math.floor((selectedDate - new Date(selectedDate.getFullYear(), 0, 0)) / 86400000);
    
    // Спрощений розрахунок (в реальності потрібен точний алгоритм)
    const baseHour = 6 + Math.sin(dayOfYear * 2 * Math.PI / 365) * 2;
    const sunriseHour = Math.floor(baseHour);
    const sunriseMinute = Math.floor((baseHour % 1) * 60);
    
    const sunsetHour = Math.floor(18 - Math.sin(dayOfYear * 2 * Math.PI / 365) * 2);
    const sunsetMinute = Math.floor(((18 - Math.sin(dayOfYear * 2 * Math.PI / 365) * 2) % 1) * 60);
    
    document.getElementById('sunrise').textContent = `${sunriseHour.toString().padStart(2, '0')}:${sunriseMinute.toString().padStart(2, '0')}`;
    document.getElementById('sunset').textContent = `${sunsetHour.toString().padStart(2, '0')}:${sunsetMinute.toString().padStart(2, '0')}`;
    
    const dayLength = (sunsetHour - sunriseHour) * 60 + (sunsetMinute - sunriseMinute);
    const dayLengthHours = Math.floor(dayLength / 60);
    const dayLengthMins = dayLength % 60;
    
    document.getElementById('dayLength').textContent = `${dayLengthHours}г ${dayLengthMins}хв`;
    document.getElementById('timezone').textContent = 'UTC+2'; // Фіксовано для України
}

// Оновлення секції "Комфорт" для обраного дня
function updateComfortSection(dayData) {
    // Використовуємо дані з обраного дня
    const comfortIndex = calculateComfortIndex(dayData.temp_avg, dayData.humidity);
    document.getElementById('comfortIndex').textContent = comfortIndex;
    
    const dewPoint = calculateDewPoint(dayData.temp_avg, dayData.humidity);
    document.getElementById('dewPoint').textContent = `${dewPoint}°C`;
    
    if (dayData.wind_gust) {
        document.getElementById('windGust').textContent = `${dayData.wind_gust} м/с`;
    } else {
        document.getElementById('windGust').textContent = 'Немає';
    }
    
    if (dayData.wind_deg !== undefined) {
        const direction = getWindDirection(dayData.wind_deg);
        document.getElementById('windDirection').textContent = direction;
    } else {
        document.getElementById('windDirection').textContent = 'Н/Д';
    }
}

// Відображення погодинного прогнозу для конкретного дня
function displayHourlyForecastForDay(hourlyData) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';

    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
    const windUnit = currentUnits === 'metric' ? 'м/с' : 'mph';

    hourlyData.forEach(item => {
        const time = new Date(item.dt_txt).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const temp = convertTemperature(item.main.temp);
        const windSpeed = convertWindSpeed(item.wind.speed);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'forecast-item fade-in';
        itemDiv.innerHTML = `
            <div class="forecast-time">${time}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="${item.weather[0].description}">
            <div class="forecast-details">
                <div class="forecast-detail">
                    <span>🌡️</span>
                    <span>${temp}${tempSymbol}</span>
                </div>
                <div class="forecast-detail">
                    <span>💧</span>
                    <span>${item.main.humidity}%</span>
                </div>
                <div class="forecast-detail">
                    <span>💨</span>
                    <span>${windSpeed} ${windUnit}</span>
                </div>
                <div class="forecast-detail">
                    <span>☔</span>
                    <span>${Math.round((item.pop || 0) * 100)}%</span>
                </div>
            </div>
            <div class="forecast-temp">${temp}${tempSymbol}</div>
        `;
        
        container.appendChild(itemDiv);
    });
}

// Відображення якості повітря
function displayAirQuality(data) {
    if (!data) return;

    const aqiCircle = document.getElementById('aqiCircle');
    const aqiLabel = document.getElementById('aqiLabel');
    
    // Елементи для окремих забруднювачів
    const pm25Value = document.getElementById('pm25-value');
    const pm10Value = document.getElementById('pm10-value');
    const no2Value = document.getElementById('no2-value');
    const o3Value = document.getElementById('o3-value');
    const coValue = document.getElementById('co-value');

    if (aqiCircle) {
        aqiCircle.textContent = data.aqi;
    }
    
    if (aqiLabel) {
        aqiLabel.textContent = data.aqi_label;

        // Встановлення кольору
        const aqiClasses = ['aqi-good', 'aqi-fair', 'aqi-moderate', 'aqi-poor', 'aqi-verypoor'];
        aqiCircle.className = 'aqi-circle ' + aqiClasses[data.aqi - 1];
    }

    // Оновлення окремих забруднювачів
    if (pm25Value && data.components) {
        pm25Value.textContent = data.components.pm2_5 || '--';
        updatePollutantColor('pm25-item', data.components.pm2_5, [15, 35, 75]); // WHO guidelines
    }
    
    if (pm10Value && data.components) {
        pm10Value.textContent = data.components.pm10 || '--';
        updatePollutantColor('pm10-item', data.components.pm10, [25, 50, 90]);
    }
    
    if (no2Value && data.components) {
        no2Value.textContent = data.components.no2 || '--';
        updatePollutantColor('no2-item', data.components.no2, [40, 100, 200]);
    }
    
    if (o3Value && data.components) {
        o3Value.textContent = data.components.o3 || '--';
        updatePollutantColor('o3-item', data.components.o3, [60, 120, 180]);
    }
    
    if (coValue && data.components) {
        coValue.textContent = Math.round(data.components.co / 1000) || '--'; // Convert to mg/m³
        updatePollutantColor('co-item', data.components.co, [4000, 14000, 17000]);
    }
}

// Функція для оновлення кольору забруднювача залежно від рівня
function updatePollutantColor(elementId, value, thresholds) {
    const element = document.getElementById(elementId);
    if (!element || !value) return;
    
    // Видалення існуючих класів
    element.classList.remove('good', 'moderate', 'unhealthy');
    
    // Додавання відповідного класу
    if (value <= thresholds[0]) {
        element.classList.add('good');
    } else if (value <= thresholds[1]) {
        element.classList.add('moderate');
    } else {
        element.classList.add('unhealthy');
    }
}

// Створення графіка температури
function createTemperatureChart(hourlyData) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');

    if (temperatureChart) {
        temperatureChart.destroy();
    }

    const labels = hourlyData.map(item => {
        const date = new Date(item.dt_txt);
        return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    });

    const temperatures = hourlyData.map(item => convertTemperature(item.main.temp));
    const feelsLike = hourlyData.map(item => convertTemperature(item.main.feels_like));
    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
    
    const isDark = document.body.classList.contains('dark-mode');

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Температура (${tempSymbol})`,
                    data: temperatures,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: `Відчувається як (${tempSymbol})`,
                    data: feelsLike,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 13, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#ffffff' : '#333333',
                    bodyColor: isDark ? '#ffffff' : '#333333',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    padding: 12,
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const date = new Date(hourlyData[dataIndex].dt_txt);
                            return date.toLocaleString('uk-UA', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 },
                        callback: function(value) {
                            return value + tempSymbol;
                        }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.05)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// Збереження міста
function saveCity() {
    if (!currentCity) return;

    let savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    
    if (!savedCities.includes(currentCity)) {
        savedCities.unshift(currentCity);
        savedCities = savedCities.slice(0, 5); // Максимум 5 міст
        localStorage.setItem('savedCities', JSON.stringify(savedCities));
        loadSavedCities();
        updateSaveCityButton();
        showError('Місто збережено!', 'success');
        setTimeout(hideError, 2000);
    }
}

// Оновлення видимості кнопки збереження міста
function updateSaveCityButton() {
    const saveBtn = document.getElementById('saveCityBtn');
    if (!saveBtn || !currentCity) return;
    
    const savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    
    if (savedCities.includes(currentCity)) {
        saveBtn.style.display = 'none';
    } else {
        saveBtn.style.display = 'block';
    }
}

// Завантаження збережених міст
function loadSavedCities() {
    const savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    const container = document.getElementById('savedCities');
    const wrapper = document.getElementById('savedCitiesContainer');

    if (savedCities.length === 0) {
        wrapper.classList.add('hidden');
        return;
    }

    wrapper.classList.remove('hidden');
    container.innerHTML = '';

    savedCities.forEach(city => {
        const chip = document.createElement('div');
        chip.className = 'city-chip';
        chip.innerHTML = `
            <span onclick="loadCityWeather('${city}')" style="cursor: pointer;">${city}</span>
            <button class="remove-city" onclick="removeCity('${city}')" title="Видалити">✕</button>
        `;
        container.appendChild(chip);
    });
}

// Завантаження погоди для збереженого міста
function loadCityWeather(city) {
    document.getElementById('cityInput').value = city;
    searchWeather();
}

// Видалення міста
function removeCity(city) {
    let savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    savedCities = savedCities.filter(c => c !== city);
    localStorage.setItem('savedCities', JSON.stringify(savedCities));
    loadSavedCities();
    updateSaveCityButton();
}

// Отримання поточного місцезнаходження
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Геолокація не підтримується вашим браузером');
        return;
    }

    showLoading(true);
    hideError();
    hideWeatherContent(); // Приховуємо всі секції
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            try {
                // Отримання назви міста за координатами
                const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const city = data[0].name;
                    document.getElementById('cityInput').value = city;
                    await loadAllWeatherData(city);
                }
            } catch (error) {
                showError('Не вдалося визначити місто');
            } finally {
                showLoading(false);
            }
        },
        (error) => {
            showLoading(false);
            showError('Не вдалося отримати ваше місцезнаходження');
        }
    );
}

// Зміна теми
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
    
    // Оновлення карти при зміні теми
    if (currentLat && currentLon) {
        loadWeatherMap(currentLat, currentLon);
    }
}

// Завантаження теми
function loadTheme() {
    const theme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('themeIcon');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    }
}

// Допоміжні функції UI
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(message, type = 'error') {
    const errorDiv = document.getElementById('error');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Приховуємо панель вибору днів та рекомендації ТІЛЬКИ при реальній помилці
    if (type === 'error') {
        const forecastSelector = document.querySelector('.forecast-selector-section');
        if (forecastSelector) {
            forecastSelector.classList.add('hidden');
        }
        
        const recommendations = document.getElementById('weatherRecommendations');
        if (recommendations) {
            recommendations.classList.add('hidden');
        }
    }
    
    if (type === 'success') {
        errorDiv.style.background = '#51cf66';
    } else {
        errorDiv.style.background = '#ff6b6b';
    }
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function showWeatherContent() {
    document.getElementById('weatherContent').classList.remove('hidden');
    
    // Показуємо ВСІ панелі вибору днів на всіх вкладках
    const forecastSelectors = document.querySelectorAll('.forecast-selector-section');
    forecastSelectors.forEach(selector => {
        selector.classList.remove('hidden');
    });
    
    // Показуємо ВСІ заголовки вкладок
    const tabHeaders = document.querySelectorAll('.tab-header');
    tabHeaders.forEach(header => {
        header.classList.remove('hidden');
    });
    
    // Показуємо рекомендації
    const recommendations = document.getElementById('weatherRecommendations');
    if (recommendations) {
        recommendations.classList.remove('hidden');
    }
}

function hideWeatherContent() {
    document.getElementById('weatherContent').classList.add('hidden');
    
    // Приховуємо ВСІ панелі вибору днів на всіх вкладках
    const forecastSelectors = document.querySelectorAll('.forecast-selector-section');
    forecastSelectors.forEach(selector => {
        selector.classList.add('hidden');
    });
    
    // Приховуємо ВСІ заголовки вкладок
    const tabHeaders = document.querySelectorAll('.tab-header');
    tabHeaders.forEach(header => {
        header.classList.add('hidden');
    });
    
    // Приховуємо рекомендації
    const recommendations = document.getElementById('weatherRecommendations');
    if (recommendations) {
        recommendations.classList.add('hidden');
    }
    // Приховуємо карту
    const weatherMap = document.getElementById('weatherMapSection');
    if (weatherMap) {
        weatherMap.classList.add('hidden');
    }
    // Приховуємо рекомендації активностей
    const activities = document.getElementById('activityRecommendations');
    if (activities) {
        activities.classList.add('hidden');
    }
    // Приховуємо контейнери на інших вкладках
    const astronomyGrid = document.querySelector('.astronomy-grid');
    if (astronomyGrid) {
        astronomyGrid.classList.add('hidden');
    }
    const historyGrid = document.querySelector('.history-charts-grid');
    if (historyGrid) {
        historyGrid.classList.add('hidden');
    }
}

// Відображення погодних порад
function displayWeatherTips(data) {
    const container = document.getElementById('weatherTips');
    const tips = generateWeatherTips(data);
    
    container.innerHTML = '';
    
    tips.forEach(tip => {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'tip-item fade-in';
        tipDiv.innerHTML = `
            <div class="tip-icon">${tip.icon}</div>
            <div class="tip-content">
                <div class="tip-title">${tip.title}</div>
                <div class="tip-text">${tip.text}</div>
            </div>
        `;
        container.appendChild(tipDiv);
    });
}

// Генерація погодних порад
function generateWeatherTips(data) {
    const tips = [];
    const temp = data.temperature;
    const humidity = data.humidity;
    const windSpeed = data.wind_speed;
    const description = data.description.toLowerCase();
    
    // Поради за температурою
    if (temp < 0) {
        tips.push({
            icon: '🧥',
            title: 'Одягайтеся тепло',
            text: 'Температура нижче нуля. Одягніть теплу куртку, шапку та рукавички.'
        });
    } else if (temp < 10) {
        tips.push({
            icon: '🧥',
            title: 'Прохолодно',
            text: 'Рекомендується легка куртка або светр.'
        });
    } else if (temp > 25) {
        tips.push({
            icon: '👕',
            title: 'Спекотно',
            text: 'Одягайте легкий одяг, не забудьте про сонцезахисний крем.'
        });
    }
    
    // Поради за вологістю
    if (humidity > 80) {
        tips.push({
            icon: '💧',
            title: 'Висока вологість',
            text: 'Повітря вологе, може відчуватися душно. Пийте більше води.'
        });
    } else if (humidity < 30) {
        tips.push({
            icon: '🏜️',
            title: 'Суше повітря',
            text: 'Низька вологість. Використовуйте зволожувач або пийте більше рідини.'
        });
    }
    
    // Поради за вітром
    if (windSpeed > 10) {
        tips.push({
            icon: '💨',
            title: 'Сильний вітер',
            text: 'Будьте обережні на вулиці, міцно тримайте парасольку.'
        });
    }
    
    // Поради за погодними умовами
    if (description.includes('дощ') || description.includes('rain')) {
        tips.push({
            icon: '☔',
            title: 'Дощова погода',
            text: 'Не забудьте парасольку або дощовик. Будьте обережні на дорозі.'
        });
    }
    
    if (description.includes('сніг') || description.includes('snow')) {
        tips.push({
            icon: '❄️',
            title: 'Снігопад',
            text: 'Одягайте взуття з хорошим протектором. Дороги можуть бути слизькими.'
        });
    }
    
    if (description.includes('туман') || description.includes('fog') || description.includes('mist')) {
        tips.push({
            icon: '🌫️',
            title: 'Туман',
            text: 'Обмежена видимість. Будьте особливо обережні за кермом.'
        });
    }
    
    if (description.includes('ясно') || description.includes('clear')) {
        tips.push({
            icon: '☀️',
            title: 'Сонячна погода',
            text: 'Чудовий день для прогулянок! Не забудьте сонцезахисні окуляри.'
        });
    }
    
    // Загальна порада активності
    if (temp >= 15 && temp <= 25 && windSpeed < 5 && !description.includes('дощ')) {
        tips.push({
            icon: '🚶‍♂️',
            title: 'Ідеально для прогулянок',
            text: 'Чудова погода для активностей на свіжому повітрі.'
        });
    }
    
    // Якщо немає конкретних порад, додаємо загальну
    if (tips.length === 0) {
        tips.push({
            icon: '🌤️',
            title: 'Гарна погода',
            text: 'Насолоджуйтесь днем і будьте в безпеці!'
        });
    }
    
    return tips;
}

// Відображення рекомендацій для конкретного дня
function displayWeatherTipsForDay(dayData) {
    const container = document.getElementById('weatherTips');
    if (!container) {
        console.error('Element weatherTips not found');
        return;
    }
    
    const tips = generateWeatherTipsForDay(dayData);
    
    container.innerHTML = '';
    
    tips.forEach(tip => {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'tip-item fade-in';
        tipDiv.innerHTML = `
            <div class="tip-icon">${tip.icon}</div>
            <div class="tip-content">
                <div class="tip-title">${tip.title}</div>
                <div class="tip-text">${tip.text}</div>
            </div>
        `;
        container.appendChild(tipDiv);
    });
}

// Генерація рекомендацій для конкретного дня
function generateWeatherTipsForDay(dayData) {
    const tips = [];
    const temp = dayData.temp_avg;
    const tempMax = dayData.temp_max;
    const tempMin = dayData.temp_min;
    const humidity = dayData.humidity;
    const windSpeed = dayData.wind_speed;
    const description = dayData.description.toLowerCase();
    
    // Загальні поради
    tips.push({
        icon: '✅',
        title: 'Загальні рекомендації',
        text: 'Слідкуйте за змінами погоди та дотримуйтесь основних правил безпеки.'
    });
    
    // Поради за температурою
    if (tempMin < 0) {
        tips.push({
            icon: '🧥',
            title: 'Одягайтеся тепло',
            text: 'Температура нижче нуля. Одягніть теплу куртку, шапку та рукавички.'
        });
    } else if (tempMin < 10) {
        tips.push({
            icon: '🧥',
            title: 'Прохолодно',
            text: 'Рекомендується легка куртка або светр.'
        });
    } else if (tempMax > 25) {
        tips.push({
            icon: '👕',
            title: 'Спекотно',
            text: 'Одягайте легкий одяг, не забудьте про сонцезахисний крем.'
        });
    }
    
    // Поради за вологістю
    if (humidity > 80) {
        tips.push({
            icon: '💧',
            title: 'Висока вологість',
            text: 'Повітря вологе, може відчуватися душно. Пийте більше води.'
        });
    } else if (humidity < 30) {
        tips.push({
            icon: '🏜️',
            title: 'Суше повітря',
            text: 'Низька вологість. Використовуйте зволожувач або пийте більше рідини.'
        });
    }
    
    // Поради за вітром
    if (windSpeed > 10) {
        tips.push({
            icon: '💨',
            title: 'Сильний вітер',
            text: 'Будьте обережні на вулиці, міцно тримайте парасольку.'
        });
    }
    
    // Поради за погодними умовами
    if (description.includes('дощ') || description.includes('rain')) {
        tips.push({
            icon: '☔',
            title: 'Дощова погода',
            text: 'Не забудьте парасольку або дощовик. Будьте обережні на дорозі.'
        });
    }
    
    if (description.includes('сніг') || description.includes('snow')) {
        tips.push({
            icon: '❄️',
            title: 'Снігопад',
            text: 'Одягайте взуття з хорошим протектором. Дороги можуть бути слизькими.'
        });
    }
    
    if (description.includes('туман') || description.includes('fog') || description.includes('mist')) {
        tips.push({
            icon: '🌫️',
            title: 'Туман',
            text: 'Обмежена видимість. Будьте особливо обережні за кермом.'
        });
    }
    
    if (description.includes('ясно') || description.includes('clear')) {
        tips.push({
            icon: '☀️',
            title: 'Сонячна погода',
            text: 'Чудовий день для прогулянок! Не забудьте сонцезахисні окуляри.'
        });
    }
    
    // Спеціальні поради на основі умов
    if (description.includes('дощ') && temp < 10) {
        tips.push({
            icon: '🧥',
            title: 'Холодний дощ',
            text: 'Одягайтеся тепло та не забудьте парасольку.'
        });
    }
    
    if (description.includes('сніг') && windSpeed > 10) {
        tips.push({
            icon: '❄️',
            title: 'Снігопад з вітром',
            text: 'Будьте обережні, дороги можуть бути дуже слизькими.'
        });
    }
    
    return tips;
}

// ==================== НОВІ ФУНКЦІЇ ====================

// Завантаження погодної карти
let currentMapLayer = 'precipitation';

function loadWeatherMap(lat, lon) {
    const zoom = 8;
    const mapFrame = document.getElementById('mapFrame');
    
    // Перевірка темного режиму
    const isDarkMode = document.body.classList.contains('dark-mode');
    const basemap = isDarkMode ? 'dark' : 'map';
    
    // URL для OpenWeatherMap tile layer
    const mapUrl = `https://openweathermap.org/weathermap?basemap=${basemap}&cities=true&layer=${currentMapLayer}&lat=${lat}&lon=${lon}&zoom=${zoom}`;
    
    mapFrame.src = mapUrl;
}

// Зміна шару карти
function changeMapLayer(layer) {
    currentMapLayer = layer;
    if (currentLat && currentLon) {
        loadWeatherMap(currentLat, currentLon);
    }
}

// Завантаження рекомендацій для активностей
async function loadActivityRecommendations(city) {
    try {
        const response = await fetch(`/api/activity-recommendations?city=${encodeURIComponent(city)}`);
        
        if (!response.ok) {
            console.error('Помилка завантаження рекомендацій активностей');
            return;
        }
        
        const data = await response.json();
        
        // Зберігаємо дані глобально
        activityRecommendationsData = data;
        
        // Відображення рекомендацій
        displayActivityRecommendation('running', data.running);
        displayActivityRecommendation('cycling', data.cycling);
        displayActivityRecommendation('fishing', data.fishing);
        displayActivityRecommendation('agriculture', data.agriculture);
        displayClothingRecommendation(data.clothing);
        
    } catch (error) {
        console.error('Помилка:', error);
    }
}

// Відображення рекомендації для активності
function displayActivityRecommendation(activityType, data) {
    const card = document.getElementById(`${activityType}Card`);
    const emoji = document.getElementById(`${activityType}Emoji`);
    const score = document.getElementById(`${activityType}Score`);
    const status = document.getElementById(`${activityType}Status`);
    const description = document.getElementById(`${activityType}Description`);
    const circle = document.getElementById(`${activityType}Circle`);
    
    if (!card || !data) return;
    
    // Оновлення значень
    emoji.textContent = data.emoji;
    score.textContent = data.score;
    status.textContent = data.status;
    description.textContent = data.description;
    
    // Анімація кругової діаграми
    circle.style.strokeDasharray = `${data.score}, 100`;
    
    // Визначення класу за оцінкою
    card.classList.remove('excellent', 'good', 'fair', 'poor');
    if (data.score >= 70) {
        card.classList.add('excellent');
    } else if (data.score >= 50) {
        card.classList.add('good');
    } else if (data.score >= 30) {
        card.classList.add('fair');
    } else {
        card.classList.add('poor');
    }
}

// Відображення рекомендацій одягу
function displayClothingRecommendation(data) {
    if (!data) return;
    
    const description = document.getElementById('clothingDescription');
    const tempRange = document.getElementById('clothingTempRange');
    const itemsContainer = document.getElementById('clothingItems');
    
    description.textContent = data.description;
    
    // Витягуємо температуру з рядка (наприклад "15°C")
    const tempMatch = data.temperature_range.match(/-?\d+\.?\d*/);
    if (tempMatch) {
        const tempCelsius = parseFloat(tempMatch[0]);
        const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
        const displayTemp = currentUnits === 'metric' ? tempCelsius : convertTemperature(tempCelsius);
        tempRange.textContent = `Температура: ${Math.round(displayTemp)}${tempSymbol}`;
    } else {
        tempRange.textContent = `Температура: ${data.temperature_range}`;
    }
    
    itemsContainer.innerHTML = '';
    data.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'clothing-item';
        
        // Розділяємо іконку та текст
        const parts = item.split(' ');
        const icon = parts[0];
        const text = parts.slice(1).join(' ');
        
        itemDiv.innerHTML = `
            <span class="clothing-item-icon">${icon}</span>
            <span class="clothing-item-text">${text}</span>
        `;
        
        itemsContainer.appendChild(itemDiv);
    });
}

// Налаштування одиниць виміру
function updateUnits() {
    const tempUnit = document.getElementById('tempUnit').value;
    const speedUnit = document.getElementById('speedUnit').value;
    
    // Зберігаємо налаштування в localStorage
    localStorage.setItem('tempUnit', tempUnit);
    localStorage.setItem('speedUnit', speedUnit);
    
    // Оновлюємо глобальну змінну
    currentUnits = tempUnit;
    
    // Оновлюємо відображення всіх існуючих даних без перезавантаження з API
    if (weeklyForecastData && weeklyForecastData.weekly && weeklyForecastData.weekly.length > 0) {
        // Оновлюємо селектор днів
        displayWeeklyForecast(weeklyForecastData);
        
        // Оновлюємо поточну погоду для обраного дня
        const dayData = weeklyForecastData.weekly[selectedDay];
        if (dayData) {
            updateCurrentWeatherForDay(dayData);
            displayHourlyForecastForDay(dayData.hourly_data);
            createTemperatureChart(dayData.hourly_data);
            displayWeatherTipsForDay(dayData); // Оновлюємо корисні поради
        }
        
        // Оновлюємо астрономічну вкладку
        if (currentLat && currentLon) {
            loadAstronomyData(currentLat, currentLon);
        }
        
        // Оновлюємо графіки на вкладці історії
        if (weeklyForecastData.weekly[0]) {
            const currentTemp = weeklyForecastData.weekly[0].temp;
            createHistoryWeekChart(currentTemp);
            createHistoryDayChart();
        }
    }
    
    // Оновлюємо рекомендації (якщо вони є)
    if (activityRecommendationsData) {
        displayActivityRecommendation('running', activityRecommendationsData.running);
        displayActivityRecommendation('cycling', activityRecommendationsData.cycling);
        displayActivityRecommendation('fishing', activityRecommendationsData.fishing);
        displayActivityRecommendation('agriculture', activityRecommendationsData.agriculture);
        displayClothingRecommendation(activityRecommendationsData.clothing);
    }
    
    showError('Одиниці виміру оновлено!', 'success');
    setTimeout(hideError, 2000);
}

// Перемикання панелі налаштувань
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
}

// Завантаження налаштувань при старті
function loadUnitsSettings() {
    const savedTempUnit = localStorage.getItem('tempUnit') || 'metric';
    const savedSpeedUnit = localStorage.getItem('speedUnit') || 'metric';
    
    // Оновлюємо глобальну змінну
    currentUnits = savedTempUnit;
    
    const tempSelect = document.getElementById('tempUnit');
    const speedSelect = document.getElementById('speedUnit');
    
    if (tempSelect) tempSelect.value = savedTempUnit;
    if (speedSelect) speedSelect.value = savedSpeedUnit;
}

// Функції конвертації
function convertTemperature(celsius) {
    if (currentUnits === 'imperial') {
        const fahrenheit = (celsius * 9/5) + 32;
        return Math.round(fahrenheit);
    }
    return Math.round(celsius);
}

function convertWindSpeed(metersPerSecond) {
    if (currentUnits === 'imperial') {
        // Конвертація м/с в милі/год
        const mph = metersPerSecond * 2.237;
        return Math.round(mph * 10) / 10;
    }
    return Math.round(metersPerSecond * 10) / 10;
}

// ==================== TAB NAVIGATION ====================
// ==================== TAB NAVIGATION ====================

// Синхронізація селекторів днів між вкладками
function syncDaySelectors(tabName) {
    if (!weeklyForecastData) return;
    
    let containerId = '';
    if (tabName === 'astronomy') {
        containerId = 'astronomyWeeklyForecast';
    } else if (tabName === 'history') {
        containerId = 'historyWeeklyForecast';
    } else if (tabName === 'agriculture') {
        containerId = 'agricultureWeeklyForecast';
    }
    
    if (!containerId) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    const tempSymbol = currentUnits === 'metric' ? '°' : '°';
    
    weeklyForecastData.weekly.forEach((item, index) => {
        const date = new Date(item.date);
        const dayName = date.toLocaleDateString('uk-UA', { weekday: 'long' });
        const dayDate = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
        
        const tempMax = convertTemperature(item.temp_max);
        const tempMin = convertTemperature(item.temp_min);
        
        const dayCard = document.createElement('div');
        dayCard.className = `weekly-day-card ${index === selectedDay ? 'selected' : ''}`;
        dayCard.setAttribute('data-day-index', index);
        dayCard.onclick = () => selectDay(index);
        dayCard.innerHTML = `
            <div class="weekly-day-name">${dayName}</div>
            <div class="weekly-day-date">${dayDate}</div>
            <img class="weekly-day-icon" src="https://openweathermap.org/img/wn/${item.icon}@2x.png" alt="${item.description}">
            <div class="weekly-day-temp">
                <span style="color: #ff6b6b;">${tempMax}${tempSymbol}</span> / 
                <span style="color: #4dabf7;">${tempMin}${tempSymbol}</span>
            </div>
            <div class="weekly-day-desc">${item.description}</div>
        `;
        
        container.appendChild(dayCard);
    });
}

// Оновлення історичних графіків для обраного дня
function updateHistoryCharts() {
    if (document.getElementById('historyDayChart')) {
        createHistoryDayChart();
    }
}

function switchTab(tabName) {
    // Сховати всі вкладки
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.classList.remove('active'));
    
    // Сховати всі активні кнопки
    const allButtons = document.querySelectorAll('.nav-tab');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // Показати обрану вкладку
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Активувати кнопку
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Синхронізувати селектори днів
    if (tabName === 'astronomy' || tabName === 'history' || tabName === 'agriculture') {
        syncDaySelectors(tabName);
    }
    
    // Виконати специфічні дії для певних вкладок (без перезавантаження даних)
    // Дані вже завантажені в loadAllWeatherData
    
    // Зберегти вибрану вкладку
    localStorage.setItem('activeTab', tabName);
}

// ==================== ASTRONOMY TAB ====================
async function loadAstronomyData(lat, lon) {
    try {
        // Використовуємо дані обраного дня, якщо є
        let sunriseTimestamp, sunsetTimestamp;
        
        if (weeklyForecastData && weeklyForecastData.weekly[selectedDay]) {
            // Для обраного дня використовуємо дані з прогнозу
            const dayData = weeklyForecastData.weekly[selectedDay];
            
            // Якщо в даних дня є sunrise/sunset, використовуємо їх
            if (dayData.sunrise && dayData.sunset) {
                sunriseTimestamp = dayData.sunrise;
                sunsetTimestamp = dayData.sunset;
            } else {
                // Інакше отримуємо з поточного API
                const response = await fetch(`/api/weather?city=${encodeURIComponent(currentCity || 'Київ')}`);
                const data = await response.json();
                sunriseTimestamp = data.sunrise;
                sunsetTimestamp = data.sunset;
            }
        } else {
            // Для поточного дня використовуємо API
            const response = await fetch(`/api/weather?city=${encodeURIComponent(currentCity || 'Київ')}`);
            const data = await response.json();
            sunriseTimestamp = data.sunrise;
            sunsetTimestamp = data.sunset;
        }
        
        if (sunriseTimestamp && sunsetTimestamp) {
            // Конвертуємо Unix timestamp в читабельний час
            const sunrise = new Date(sunriseTimestamp * 1000);
            const sunset = new Date(sunsetTimestamp * 1000);
            
            document.getElementById('astroSunrise').textContent = formatTime(sunrise);
            document.getElementById('astroSunset').textContent = formatTime(sunset);
            
            // Розрахунок тривалості дня
            const dayLength = (sunset - sunrise) / 1000 / 60; // в хвилинах
            const hours = Math.floor(dayLength / 60);
            const minutes = Math.floor(dayLength % 60);
            document.getElementById('astroDayLength').textContent = `${hours} год ${minutes} хв`;
            
            // Поточний час
            const now = new Date();
            document.getElementById('astroCurrentTime').textContent = formatTime(now);
            
            // Відсоток сонячного дня
            const totalDayMinutes = dayLength;
            const currentMinutes = (now - sunrise) / 1000 / 60;
            const progress = Math.max(0, Math.min(100, (currentMinutes / totalDayMinutes) * 100));
            document.getElementById('astroSolarProgress').textContent = `${Math.round(progress)} %`;
            
            // Золота година (60 хвилин після сходу і 60 хвилин перед заходом)
            const goldenHourMorningStart = new Date(sunrise.getTime());
            const goldenHourMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
            const goldenHourEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);
            const goldenHourEveningEnd = new Date(sunset.getTime());
            
            document.getElementById('astroGoldenMorning').textContent = 
                `${formatTime(goldenHourMorningStart)} - ${formatTime(goldenHourMorningEnd)}`;
            document.getElementById('astroGoldenEvening').textContent = 
                `${formatTime(goldenHourEveningStart)} - ${formatTime(goldenHourEveningEnd)}`;
            
            // Синя година (30 хвилин до сходу і 30 після заходу)
            const blueHourMorningStart = new Date(sunrise.getTime() - 30 * 60 * 1000);
            const blueHourMorningEnd = new Date(sunrise.getTime());
            const blueHourEveningStart = new Date(sunset.getTime());
            const blueHourEveningEnd = new Date(sunset.getTime() + 30 * 60 * 1000);
            
            document.getElementById('astroBlueHourMorning').textContent = 
                `${formatTime(blueHourMorningStart)} - ${formatTime(blueHourMorningEnd)}`;
            document.getElementById('astroBlueHourEvening').textContent = 
                `${formatTime(blueHourEveningStart)} - ${formatTime(blueHourEveningEnd)}`;
        }
        
        // Місяць (використовуємо апроксимацію на основі дати)
        calculateMoonPhase();
        
        // УФ індекс (якщо доступний з API або використовуємо симуляцію)
        // Для реального проекту потрібен окремий API call
        simulateUVIndex();
        
    } catch (error) {
        console.error('Помилка завантаження астрономічних даних:', error);
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function calculateMoonPhase() {
    // Використовуємо дату обраного дня
    let targetDate;
    if (weeklyForecastData && weeklyForecastData.weekly[selectedDay]) {
        targetDate = new Date(weeklyForecastData.weekly[selectedDay].date);
    } else {
        targetDate = new Date();
    }
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    
    // Спрощений розрахунок фази місяця
    const c = Math.floor(year / 100);
    const e = c - 15;
    const jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) 
            - Math.floor(3 * Math.floor((year + (month - 9) / 7) / 100 + 1) / 4) 
            + Math.floor(275 * month / 9) + day + 1721029;
    const phase = ((jd + 4.867) % 29.53) / 29.53;
    
    // Визначення фази
    let phaseName, phaseIcon;
    if (phase < 0.0625) { phaseName = "Новий місяць"; phaseIcon = "🌑"; }
    else if (phase < 0.1875) { phaseName = "Молодик"; phaseIcon = "🌒"; }
    else if (phase < 0.3125) { phaseName = "Перша чверть"; phaseIcon = "🌓"; }
    else if (phase < 0.4375) { phaseName = "Прибуваючий"; phaseIcon = "🌔"; }
    else if (phase < 0.5625) { phaseName = "Повний місяць"; phaseIcon = "🌕"; }
    else if (phase < 0.6875) { phaseName = "Спадаючий"; phaseIcon = "🌖"; }
    else if (phase < 0.8125) { phaseName = "Остання чверть"; phaseIcon = "🌗"; }
    else if (phase < 0.9375) { phaseName = "Старіючий місяць"; phaseIcon = "🌘"; }
    else { phaseName = "Новий місяць"; phaseIcon = "🌑"; }
    
    document.getElementById('moonPhaseIcon').textContent = phaseIcon;
    document.getElementById('astroMoonPhase').textContent = phaseName;
    
    const illumination = Math.round((1 - Math.abs(phase - 0.5) * 2) * 100);
    document.getElementById('astroMoonIllumination').textContent = `${illumination} %`;
    
    // Детермінований час сходу/заходу на основі фази місяця
    // Використовуємо фазу для генерації часу (без Math.random())
    const moonriseHour = Math.floor(18 + phase * 8); // від 18 до 2 (наступного дня)
    const moonriseMinute = Math.floor((phase * 60) % 60);
    const moonsetHour = Math.floor(6 + phase * 8); // від 6 до 14
    const moonsetMinute = Math.floor(((1 - phase) * 60) % 60);
    
    const moonrise = new Date(targetDate);
    moonrise.setHours(moonriseHour % 24, moonriseMinute, 0);
    const moonset = new Date(targetDate);
    moonset.setHours(moonsetHour, moonsetMinute, 0);
    
    document.getElementById('astroMoonrise').textContent = formatTime(moonrise);
    document.getElementById('astroMoonset').textContent = formatTime(moonset);
}

function simulateUVIndex() {
    // Використовуємо дату обраного дня для детермінованого розрахунку
    let targetDate;
    if (weeklyForecastData && weeklyForecastData.weekly[selectedDay]) {
        targetDate = new Date(weeklyForecastData.weekly[selectedDay].date);
    } else {
        targetDate = new Date();
    }
    
    // Детермінований УФ індекс на основі дня в році та поточного часу
    const dayOfYear = Math.floor((targetDate - new Date(targetDate.getFullYear(), 0, 0)) / 86400000);
    const hour = new Date().getHours();
    
    // Базовий УФ індекс залежить від сезону (день року)
    // Літо (день 150-240) - вищий УФ, зима (день 1-60, 330-365) - нижчий
    let baseUV;
    if (dayOfYear >= 150 && dayOfYear <= 240) {
        // Літо
        baseUV = 7;
    } else if (dayOfYear >= 90 && dayOfYear <= 150 || dayOfYear >= 240 && dayOfYear <= 300) {
        // Весна/осінь
        baseUV = 5;
    } else {
        // Зима
        baseUV = 2;
    }
    
    // Коригування по часу доби
    let uvIndex;
    if (hour < 6 || hour > 20) {
        uvIndex = 0;
    } else if (hour >= 11 && hour <= 15) {
        // Пік УФ
        uvIndex = baseUV;
    } else if (hour >= 9 && hour <= 17) {
        // Високий УФ
        uvIndex = Math.round(baseUV * 0.7);
    } else {
        // Ранок/вечір
        uvIndex = Math.round(baseUV * 0.3);
    }
    
    document.getElementById('astroUvValue').textContent = uvIndex;
    
    let uvLabel, uvDanger, uvProtection;
    if (uvIndex <= 2) {
        uvLabel = "Низький";
        uvDanger = "Мінімальна";
        uvProtection = "Не потрібен";
    } else if (uvIndex <= 5) {
        uvLabel = "Помірний";
        uvDanger = "Помірна";
        uvProtection = "Окуляри, крем SPF 15+";
    } else if (uvIndex <= 7) {
        uvLabel = "Високий";
        uvDanger = "Висока";
        uvProtection = "Окуляри, крем SPF 30+, капелюх";
    } else if (uvIndex <= 10) {
        uvLabel = "Дуже високий";
        uvDanger = "Дуже висока";
        uvProtection = "Уникати сонця 11:00-16:00";
    } else {
        uvLabel = "Екстремальний";
        uvDanger = "Екстремальна";
        uvProtection = "Залишайтесь в тіні!";
    }
    
    document.getElementById('astroUvLabel').textContent = uvLabel;
    document.getElementById('astroUvDanger').textContent = uvDanger;
    document.getElementById('astroUvProtection').textContent = uvProtection;
}

// ==================== HISTORY TAB ====================
let historyWeekChart = null;
let historyDayChart = null;

async function initHistoryCharts() {
    // Отримуємо поточну температуру для базового значення
    let currentTemp = 12; // За замовчуванням
    
    try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(currentCity || 'Київ')}`);
        const data = await response.json();
        if (data.temperature) {
            currentTemp = data.temperature;
        }
    } catch (error) {
        console.error('Помилка отримання поточної температури:', error);
    }
    
    // Створюємо обидва графіки
    if (document.getElementById('historyWeekChart')) {
        createHistoryWeekChart(currentTemp);
    }
    
    if (document.getElementById('historyDayChart')) {
        createHistoryDayChart();
    }
}

function createHistoryWeekChart(baseTemp) {
    const ctx = document.getElementById('historyWeekChart');
    if (!ctx) return;
    
    // Використовуємо реальні дані прогнозу на 6 днів
    const labels = [];
    const maxTemperatures = [];
    const minTemperatures = [];
    
    if (weeklyForecastData && weeklyForecastData.weekly) {
        // Беремо перші 6 днів з прогнозу
        const forecastDays = weeklyForecastData.weekly.slice(0, 6);
        
        forecastDays.forEach(day => {
            const date = new Date(day.date);
            labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' }));
            maxTemperatures.push(Math.round(day.temp_max));
            minTemperatures.push(Math.round(day.temp_min));
        });
    } else {
        // Якщо даних немає, генеруємо заглушку
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            labels.push(date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' }));
            maxTemperatures.push(Math.round(baseTemp + 5 + (Math.random() - 0.5) * 3));
            minTemperatures.push(Math.round(baseTemp - 5 + (Math.random() - 0.5) * 3));
        }
    }
    
    if (historyWeekChart) {
        historyWeekChart.destroy();
    }
    
    const isDark = document.body.classList.contains('dark-mode');
    
    historyWeekChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Макс. температура',
                    data: maxTemperatures,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ff6b6b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Мін. температура',
                    data: minTemperatures,
                    borderColor: '#4dabf7',
                    backgroundColor: 'rgba(77, 171, 247, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#4dabf7',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 13, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#ffffff' : '#333333',
                    bodyColor: isDark ? '#ffffff' : '#333333',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '°C';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 },
                        callback: function(value) {
                            return value + '°C';
                        }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.05)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// Створення графіка температури для обраного дня в історії
function createHistoryDayChart() {
    const ctx = document.getElementById('historyDayChart');
    if (!ctx) return;

    if (historyDayChart) {
        historyDayChart.destroy();
    }

    // Використовуємо дані обраного дня, якщо є
    let hourlyData = null;
    if (weeklyForecastData && weeklyForecastData.weekly[selectedDay]) {
        hourlyData = weeklyForecastData.weekly[selectedDay].hourly_data;
    }

    const labels = [];
    const temperatures = [];
    const feelsLike = [];

    if (hourlyData && hourlyData.length > 0) {
        // Використовуємо реальні погодинні дані з обраного дня
        hourlyData.forEach(item => {
            const date = new Date(item.dt_txt);
            labels.push(date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
            temperatures.push(convertTemperature(item.main.temp));
            feelsLike.push(convertTemperature(item.main.feels_like));
        });
    } else {
        // Генеруємо дані, якщо реальних немає
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const hour = new Date(now);
            hour.setHours(i, 0, 0, 0);
            labels.push(hour.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));

            const baseTemp = parseFloat(document.getElementById('current-temp')?.textContent) || 20;
            const hourAngle = (i - 6) * (Math.PI / 12);
            const variation = 8 * Math.sin(hourAngle);
            const temp = baseTemp + variation + (Math.random() - 0.5) * 2;
            
            temperatures.push(Math.round(temp * 10) / 10);
            feelsLike.push(Math.round((temp - 2 + (Math.random() - 0.5) * 3) * 10) / 10);
        }
    }

    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
    const isDark = document.body.classList.contains('dark-mode');

    historyDayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Температура (${tempSymbol})`,
                    data: temperatures,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: `Відчувається як (${tempSymbol})`,
                    data: feelsLike,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 13, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#ffffff' : '#333333',
                    bodyColor: isDark ? '#ffffff' : '#333333',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 },
                        callback: function(value) {
                            return value + tempSymbol;
                        }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#ffffff' : '#333333',
                        font: { size: 12 }
                    },
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(102, 126, 234, 0.05)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// ==================== MOUNTAINS TAB ====================
function selectResort(resortName) {
    const resortData = {
        bukovel: {
            name: 'Буковель',
            snowBase: 120,
            snowPeak: 180,
            freshSnow: 15,
            quality: 'Пухкий',
            tempBase: -2,
            tempPeak: -8,
            windBase: 15,
            windPeak: 35
        },
        dragobrat: {
            name: 'Драгобрат',
            snowBase: 100,
            snowPeak: 160,
            freshSnow: 20,
            quality: 'Відмінний',
            tempBase: -4,
            tempPeak: -10,
            windBase: 12,
            windPeak: 30
        },
        slavske: {
            name: 'Славське',
            snowBase: 80,
            snowPeak: 130,
            freshSnow: 10,
            quality: 'Добрий',
            tempBase: -1,
            tempPeak: -6,
            windBase: 10,
            windPeak: 25
        },
        pylypets: {
            name: 'Пилипець',
            snowBase: 90,
            snowPeak: 140,
            freshSnow: 12,
            quality: 'Добрий',
            tempBase: -3,
            tempPeak: -7,
            windBase: 13,
            windPeak: 28
        }
    };
    
    const resort = resortData[resortName];
    if (!resort) return;
    
    // Оновлення снігових умов
    document.getElementById('snowBase').textContent = `${resort.snowBase} см`;
    document.getElementById('snowPeak').textContent = `${resort.snowPeak} см`;
    document.getElementById('freshSnow').textContent = `${resort.freshSnow} см`;
    document.getElementById('snowQuality').textContent = resort.quality;
    
    // Оновлення прогнозу погоди
    document.getElementById('tempBase').textContent = `${resort.tempBase}°C`;
    document.getElementById('tempPeak').textContent = `${resort.tempPeak}°C`;
    document.getElementById('windBase').textContent = `${resort.windBase} км/год`;
    document.getElementById('windPeak').textContent = `${resort.windPeak} км/год`;
    
    const visibilityBase = resort.windBase < 20 ? 'Добра' : 'Середня';
    const visibilityPeak = resort.windPeak < 30 ? 'Середня' : 'Погана';
    document.getElementById('visibilityBase').textContent = visibilityBase;
    document.getElementById('visibilityPeak').textContent = visibilityPeak;
    
    // Інформація про курорт
    const resortInfo = document.getElementById('resortInfo');
    resortInfo.innerHTML = `
        <h3 style="margin: 20px 0 10px 0;">⛷️ ${resort.name}</h3>
        <p>Обраний курорт: <strong>${resort.name}</strong></p>
        <p>Умови катання: <strong>Відмінні</strong></p>
        <p>Працюючих трас: <strong>42 з 50</strong></p>
    `;
}

// ==================== AGRICULTURE TAB ====================
function loadAgricultureData() {
    if (!weeklyForecastData || !weeklyForecastData.weekly[selectedDay]) return;
    
    const dayData = weeklyForecastData.weekly[selectedDay];
    const tempSymbol = currentUnits === 'metric' ? '°C' : '°F';
    const windSymbol = currentUnits === 'metric' ? 'м/с' : 'mph';
    
    // Температура
    const temp = convertTemperature(dayData.temp_avg);
    const tempStatus = temp > 25 ? 'Спекотно' : temp > 15 ? 'Оптимально' : temp > 5 ? 'Прохолодно' : 'Холодно';
    document.getElementById('agroTemp').textContent = `${temp}${tempSymbol}`;
    document.getElementById('agroTempStatus').textContent = tempStatus;
    
    // Вологість
    const humidity = dayData.humidity;
    const humidityStatus = humidity > 80 ? 'Висока' : humidity > 60 ? 'Нормальна' : humidity > 40 ? 'Помірна' : 'Низька';
    document.getElementById('agroHumidity').textContent = `${humidity}%`;
    document.getElementById('agroHumidityStatus').textContent = humidityStatus;
    
    // Відчувається як
    const feelsLike = convertTemperature(dayData.feels_like);
    document.getElementById('agroFeelsLike').textContent = `${feelsLike}${tempSymbol}`;
    
    // Опади
    const precip = dayData.precipitation || 0;
    const precipStatus = precip > 10 ? 'Значні' : precip > 5 ? 'Помірні' : precip > 0 ? 'Невеликі' : 'Без опадів';
    document.getElementById('agroPrecip').textContent = `${precip.toFixed(1)} мм`;
    document.getElementById('agroPrecipStatus').textContent = precipStatus;
    
    // Хмарність
    const clouds = dayData.clouds;
    const cloudsStatus = clouds > 75 ? 'Хмарно' : clouds > 50 ? 'Мінлива хмарність' : clouds > 25 ? 'Малохмарно' : 'Ясно';
    document.getElementById('agroClouds').textContent = `${clouds}%`;
    document.getElementById('agroCloudsStatus').textContent = cloudsStatus;
    
    // Вітер
    const wind = convertWindSpeed(dayData.wind_speed);
    const windStatus = wind > 10 ? 'Сильний' : wind > 5 ? 'Помірний' : 'Слабкий';
    document.getElementById('agroWind').textContent = `${wind} ${windSymbol}`;
    document.getElementById('agroWindStatus').textContent = windStatus;
    
    // Умови для роботи
    const workingContainer = document.getElementById('workingConditions');
    const workingIcon = workingContainer.querySelector('.frost-icon');
    const workingTitle = document.getElementById('workingConditionsTitle');
    const workingDesc = document.getElementById('workingConditionsDesc');
    
    document.getElementById('workingTemp').textContent = `${temp}${tempSymbol}`;
    document.getElementById('workingPrecip').textContent = `${precip.toFixed(1)} мм`;
    document.getElementById('workingWind').textContent = `${wind} ${windSymbol}`;
    
    // Визначення умов для роботи
    let isSuitable = true;
    let reasons = [];
    
    if (precip > 5) {
        isSuitable = false;
        reasons.push('Значні опади');
    }
    if (wind > 10) {
        isSuitable = false;
        reasons.push('Сильний вітер');
    }
    if (temp < 5) {
        isSuitable = false;
        reasons.push('Низька температура');
    }
    
    if (isSuitable) {
        workingContainer.querySelector('.frost-status').className = 'frost-status no-frost';
        workingIcon.textContent = '✅';
        workingTitle.textContent = 'Сприятливі умови для польових робіт';
        workingDesc.textContent = 'Погодні умови дозволяють виконувати роботи';
    } else {
        workingContainer.querySelector('.frost-status').className = 'frost-status frost-expected';
        workingIcon.textContent = '⚠️';
        workingTitle.textContent = 'Обмежені умови для польових робіт';
        workingDesc.textContent = `Причини: ${reasons.join(', ')}`;
    }
}

// ==================== WATER TEMPERATURE TAB ====================
let waterTempChart = null;

function initWaterTempChart() {
    const ctx = document.getElementById('waterTempChart');
    if (!ctx) return;
    
    if (waterTempChart) {
        waterTempChart.destroy();
    }
    
    const labels = ['Зараз', '+3 год', '+6 год', '+9 год', '+12 год', '+15 год', '+18 год', '+21 год', '+24 год'];
    const data = [18, 18.2, 18.5, 18.8, 19, 19.2, 19, 18.8, 18.5];
    
    waterTempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Температура води °C',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#333333'
                    }
                }
            },
            scales: {
                y: {
                    min: 15,
                    max: 22,
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#333333'
                    },
                    grid: {
                        color: 'rgba(52, 152, 219, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#333333'
                    },
                    grid: {
                        color: 'rgba(52, 152, 219, 0.1)'
                    }
                }
            }
        }
    });
}

// Завантаження збереженої вкладки при старті
document.addEventListener('DOMContentLoaded', function() {
    const savedTab = localStorage.getItem('activeTab') || 'home';
    switchTab(savedTab);
});