// Глобальні змінні
let currentCity = '';
let currentLat = null;
let currentLon = null;
let temperatureChart = null;
const API_KEY = '6951b848da7d2bc129c4a520d8c1e275'; // Ваш API ключ

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    loadSavedCities();
    loadTheme();
    
    // Обробка Enter в полі пошуку
    document.getElementById('cityInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });
});

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

// Завантаження всіх даних про погоду
async function loadAllWeatherData(city) {
    showLoading(true);
    hideError();
    hideWeatherContent();

    try {
        // Паралельне завантаження даних
        const [weatherData, hourlyData, dailyData] = await Promise.all([
            fetchWeather(city),
            fetchHourlyForecast(city),
            fetchDailyForecast(city)
        ]);

        // Отримання координат для якості повітря
        if (weatherData.lat && weatherData.lon) {
            currentLat = weatherData.lat;
            currentLon = weatherData.lon;
            const airQuality = await fetchAirQuality(currentLat, currentLon);
            displayAirQuality(airQuality);
        }

        // Відображення даних
        displayCurrentWeather(weatherData);
        displayHourlyForecast(hourlyData);
        displayDailyForecast(dailyData);
        createTemperatureChart(hourlyData.hourly);

        showWeatherContent();
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

// Отримання денного прогнозу
async function fetchDailyForecast(city) {
    const response = await fetch(`/api/daily-forecast?city=${encodeURIComponent(city)}`);
    
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
    document.getElementById('temperatureMain').textContent = `${data.temperature}°C`;
    document.getElementById('weatherDesc').textContent = data.description;
    document.getElementById('feelsLike').textContent = `${data.feels_like}°C`;
    document.getElementById('humidity').textContent = `${data.humidity}%`;
    document.getElementById('pressure').textContent = `${data.pressure} hPa`;
    document.getElementById('windSpeed').textContent = `${data.wind_speed} м/с`;
    
    const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@4x.png`;
    document.getElementById('weatherIconLarge').src = iconUrl;
}

// Відображення погодинного прогнозу
function displayHourlyForecast(data) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';

    data.hourly.slice(0, 8).forEach(item => {
        const time = new Date(item.time).toLocaleString('uk-UA', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const itemDiv = document.createElement('div');
        itemDiv.className = 'forecast-item fade-in';
        itemDiv.innerHTML = `
            <div class="forecast-time">${time}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${item.icon}@2x.png" alt="${item.description}">
            <div class="forecast-details">
                <div class="forecast-detail">
                    <span>🌡️</span>
                    <span>${item.temperature}°C</span>
                </div>
                <div class="forecast-detail">
                    <span>💧</span>
                    <span>${item.humidity}%</span>
                </div>
                <div class="forecast-detail">
                    <span>💨</span>
                    <span>${item.wind_speed} м/с</span>
                </div>
                <div class="forecast-detail">
                    <span>☔</span>
                    <span>${item.pop}%</span>
                </div>
            </div>
            <div class="forecast-temp">${item.temperature}°C</div>
        `;
        
        container.appendChild(itemDiv);
    });
}

// Відображення денного прогнозу
function displayDailyForecast(data) {
    const container = document.getElementById('dailyForecast');
    container.innerHTML = '';

    data.daily.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('uk-UA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const itemDiv = document.createElement('div');
        itemDiv.className = 'forecast-item fade-in';
        itemDiv.innerHTML = `
            <div class="forecast-time">${date}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${item.icon}@2x.png" alt="${item.description}">
            <div class="forecast-details">
                <div class="forecast-detail" style="text-transform: capitalize;">
                    ${item.description}
                </div>
                <div class="forecast-detail">
                    <span>💧</span>
                    <span>${item.humidity}%</span>
                </div>
                <div class="forecast-detail">
                    <span>💨</span>
                    <span>${item.wind_speed} м/с</span>
                </div>
                <div class="forecast-detail">
                    <span>☔</span>
                    <span>${item.pop}%</span>
                </div>
            </div>
            <div class="forecast-temp">
                <span style="color: #ff6b6b;">${item.temp_max}°</span> / 
                <span style="color: #4dabf7;">${item.temp_min}°</span>
            </div>
        `;
        
        container.appendChild(itemDiv);
    });
}

// Відображення якості повітря
function displayAirQuality(data) {
    if (!data) return;

    const aqiCircle = document.getElementById('aqiCircle');
    const aqiLabel = document.getElementById('aqiLabel');
    const pollutantsContainer = document.getElementById('pollutants');

    aqiCircle.textContent = data.aqi;
    aqiLabel.textContent = data.aqi_label;

    // Встановлення кольору
    const aqiClasses = ['aqi-good', 'aqi-fair', 'aqi-moderate', 'aqi-poor', 'aqi-verypoor'];
    aqiCircle.className = 'aqi-circle ' + aqiClasses[data.aqi - 1];

    // Відображення забруднювачів
    pollutantsContainer.innerHTML = `
        <div class="pollutant-item">
            <div class="pollutant-value">${data.components.pm2_5}</div>
            <div class="pollutant-label">PM2.5</div>
        </div>
        <div class="pollutant-item">
            <div class="pollutant-value">${data.components.pm10}</div>
            <div class="pollutant-label">PM10</div>
        </div>
        <div class="pollutant-item">
            <div class="pollutant-value">${data.components.no2}</div>
            <div class="pollutant-label">NO₂</div>
        </div>
        <div class="pollutant-item">
            <div class="pollutant-value">${data.components.o3}</div>
            <div class="pollutant-label">O₃</div>
        </div>
        <div class="pollutant-item">
            <div class="pollutant-value">${data.components.co}</div>
            <div class="pollutant-label">CO</div>
        </div>
    `;
}

// Створення графіка температури
function createTemperatureChart(hourlyData) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');

    if (temperatureChart) {
        temperatureChart.destroy();
    }

    const labels = hourlyData.map(item => {
        const date = new Date(item.time);
        return date.toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit' });
    });

    const temperatures = hourlyData.map(item => item.temperature);
    const feelsLike = hourlyData.map(item => item.feels_like);

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Температура',
                    data: temperatures,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Відчувається як',
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
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + '°C';
                        }
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
        showError('Місто збережено!', 'success');
        setTimeout(hideError, 2000);
    }
}

// Завантаження збережених міст
function loadSavedCities() {
    const savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    const container = document.getElementById('savedCities');

    if (savedCities.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = '<div style="margin-bottom: 10px; color: #666; font-weight: 600;">Збережені міста:</div>';

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
}

// Отримання поточного місцезнаходження
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Геолокація не підтримується вашим браузером');
        return;
    }

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
}

function hideWeatherContent() {
    document.getElementById('weatherContent').classList.add('hidden');
}
