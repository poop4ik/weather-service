from flask import Flask, render_template, request, jsonify
import requests
import os
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json

# Завантаження змінних оточення
load_dotenv()

app = Flask(__name__)

# Отримання API ключа з змінних оточення
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather'
FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast'
ONECALL_API_URL = 'https://api.openweathermap.org/data/2.5/onecall'
AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution'
GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct'

@app.route('/')
def index():
    """Головна сторінка"""
    return render_template('index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather():
    """API endpoint для отримання поточної погоди"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        # Запит до OpenWeatherMap API
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(WEATHER_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Розрахунок УФ-індексу на основі часу дня та хмарності
        current_time = datetime.now().time()
        is_day = current_time.hour >= 6 and current_time.hour <= 18
        cloud_cover = data['clouds']['all']
        
        # Симуляція УФ-індексу (0-11 шкала)
        if is_day:
            base_uv = 6 - (cloud_cover / 20)  # Чим більше хмар, тим менший УФ
            uv_index = max(0, min(11, round(base_uv)))
        else:
            uv_index = 0
        
        # Розрахунок ймовірності дощу на основі хмарності та вологості
        humidity = data['main']['humidity']
        rain_probability = min(100, round((cloud_cover * 0.8 + humidity * 0.2)))
        
        # Форматування відповіді
        weather_data = {
            'city': data['name'],
            'country': data['sys']['country'],
            'temperature': round(data['main']['temp'], 1),
            'feels_like': round(data['main']['feels_like'], 1),
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'wind_speed': data['wind']['speed'],
            'wind_deg': data['wind'].get('deg', 0),
            'wind_gust': data['wind'].get('gust'),
            'visibility': data.get('visibility'),
            'clouds': data['clouds']['all'],
            'description': data['weather'][0]['description'],
            'icon': data['weather'][0]['icon'],
            'lat': data['coord']['lat'],
            'lon': data['coord']['lon'],
            'sunrise': data['sys']['sunrise'],
            'sunset': data['sys']['sunset'],
            'timezone': data.get('timezone', 0),
            'timestamp': datetime.now().isoformat(),
            'uv_index': uv_index,
            'rain_probability': rain_probability
        }
        
        return jsonify(weather_data)
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    """API endpoint для отримання прогнозу погоди на 5 днів"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(FORECAST_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Форматування прогнозу
        forecast_list = []
        for item in data['list'][:8]:  # Перші 8 записів (24 години)
            forecast_list.append({
                'time': item['dt_txt'],
                'temperature': round(item['main']['temp'], 1),
                'description': item['weather'][0]['description'],
                'icon': item['weather'][0]['icon'],
                'humidity': item['main']['humidity'],
                'wind_speed': item['wind']['speed']
            })
        
        forecast_data = {
            'city': data['city']['name'],
            'country': data['city']['country'],
            'forecast': forecast_list
        }
        
        return jsonify(forecast_data)
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/hourly-forecast', methods=['GET'])
def get_hourly_forecast():
    """API endpoint для погодинного прогнозу на 48 годин"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(FORECAST_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Форматування погодинного прогнозу (40 записів = 5 днів по 3 години)
        hourly_list = []
        for item in data['list'][:16]:  # 48 годин (16 записів по 3 години)
            hourly_list.append({
                'time': item['dt_txt'],
                'temperature': round(item['main']['temp'], 1),
                'feels_like': round(item['main']['feels_like'], 1),
                'description': item['weather'][0]['description'],
                'icon': item['weather'][0]['icon'],
                'humidity': item['main']['humidity'],
                'pressure': item['main']['pressure'],
                'wind_speed': round(item['wind']['speed'], 1),
                'wind_deg': item['wind'].get('deg', 0),
                'clouds': item['clouds']['all'],
                'pop': round(item.get('pop', 0) * 100)  # Ймовірність опадів у %
            })
        
        return jsonify({
            'city': data['city']['name'],
            'country': data['city']['country'],
            'hourly': hourly_list
        })
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/daily-forecast', methods=['GET'])
def get_daily_forecast():
    """API endpoint для прогнозу на 5 днів"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(FORECAST_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Групування за днями
        daily_data = {}
        for item in data['list']:
            date = item['dt_txt'].split(' ')[0]
            if date not in daily_data:
                daily_data[date] = {
                    'temps': [],
                    'descriptions': [],
                    'icons': [],
                    'humidity': [],
                    'wind': [],
                    'pop': []
                }
            
            daily_data[date]['temps'].append(item['main']['temp'])
            daily_data[date]['descriptions'].append(item['weather'][0]['description'])
            daily_data[date]['icons'].append(item['weather'][0]['icon'])
            daily_data[date]['humidity'].append(item['main']['humidity'])
            daily_data[date]['wind'].append(item['wind']['speed'])
            daily_data[date]['pop'].append(item.get('pop', 0))
        
        # Форматування денного прогнозу
        daily_list = []
        for date, values in list(daily_data.items())[:5]:
            daily_list.append({
                'date': date,
                'temp_max': round(max(values['temps']), 1),
                'temp_min': round(min(values['temps']), 1),
                'description': max(set(values['descriptions']), key=values['descriptions'].count),
                'icon': max(set(values['icons']), key=values['icons'].count),
                'humidity': round(sum(values['humidity']) / len(values['humidity'])),
                'wind_speed': round(sum(values['wind']) / len(values['wind']), 1),
                'pop': round(max(values['pop']) * 100)
            })
        
        return jsonify({
            'city': data['city']['name'],
            'country': data['city']['country'],
            'daily': daily_list
        })
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/air-quality', methods=['GET'])
def get_air_quality():
    """API endpoint для якості повітря"""
    lat = request.args.get('lat', '')
    lon = request.args.get('lon', '')
    
    if not lat or not lon:
        return jsonify({'error': 'Координати не вказані'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'lat': lat,
            'lon': lon,
            'appid': WEATHER_API_KEY
        }
        
        response = requests.get(AIR_POLLUTION_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('list'):
            return jsonify({'error': 'Дані про якість повітря недоступні'}), 404
        
        pollution_data = data['list'][0]
        
        # Визначення якості повітря
        aqi = pollution_data['main']['aqi']
        aqi_levels = {
            1: 'Добра',
            2: 'Задовільна', 
            3: 'Помірна',
            4: 'Погана',
            5: 'Дуже погана'
        }
        
        return jsonify({
            'aqi': aqi,
            'aqi_description': aqi_levels.get(aqi, 'Невідома'),
            'components': pollution_data['components']
        })
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/7day-forecast', methods=['GET'])
def get_7day_forecast():
    """API endpoint для 7-денного прогнозу"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(FORECAST_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Групування за днями для отримання 7-денного прогнозу
        daily_data = {}
        for item in data['list'][:40]:  # Використовуємо всі доступні дані (5 днів по 8 записів)
            date = item['dt_txt'].split(' ')[0]
            if date not in daily_data:
                daily_data[date] = {
                    'items': [],
                    'temps': [],
                    'descriptions': [],
                    'icons': [],
                    'humidity': [],
                    'wind': [],
                    'pop': []
                }
            
            daily_data[date]['items'].append(item)
            daily_data[date]['temps'].append(item['main']['temp'])
            daily_data[date]['descriptions'].append(item['weather'][0]['description'])
            daily_data[date]['icons'].append(item['weather'][0]['icon'])
            daily_data[date]['humidity'].append(item['main']['humidity'])
            daily_data[date]['wind'].append(item['wind']['speed'])
            daily_data[date]['pop'].append(item.get('pop', 0))
        
        # Форматування 7-денного прогнозу
        weekly_forecast = []
        for date, values in daily_data.items():
            # Середній час дня для іконки (близько полудня)
            midday_item = values['items'][len(values['items'])//2] if values['items'] else values['items'][0]
            morning_item = values['items'][0] if values['items'] else midday_item
            
            # Розрахунок середніх значень
            avg_humidity = round(sum(values['humidity']) / len(values['humidity']))
            avg_wind_speed = round(sum(values['wind']) / len(values['wind']), 1)
            
            # Розрахунок сходу/заходу для дня (приблизно)
            day_timestamp = morning_item['dt']
            
            day_forecast = {
                'date': date,
                'timestamp': day_timestamp,
                'temp_max': round(max(values['temps']), 1),
                'temp_min': round(min(values['temps']), 1),
                'temp_avg': round(sum(values['temps']) / len(values['temps']), 1),
                'description': max(set(values['descriptions']), key=values['descriptions'].count),
                'icon': midday_item['weather'][0]['icon'],
                'humidity': avg_humidity,
                'wind_speed': avg_wind_speed,
                'wind_deg': midday_item['wind'].get('deg', 0),
                'wind_gust': midday_item['wind'].get('gust'),
                'pressure': midday_item['main']['pressure'],
                'visibility': midday_item.get('visibility'),
                'clouds': midday_item['clouds']['all'],
                'pop': round(max(values['pop']) * 100),
                'hourly_data': values['items'],  # Дані для погодинного прогнозу
                # Додаткові розрахункові дані
                'feels_like': round(midday_item['main']['feels_like'], 1)
            }
            weekly_forecast.append(day_forecast)
        
        return jsonify({
            'city': data['city']['name'],
            'country': data['city']['country'],
            'weekly': weekly_forecast
        })
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/geocode', methods=['GET'])
def geocode_city():
    """API endpoint для отримання координат міста"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        params = {
            'q': city,
            'limit': 5,
            'appid': WEATHER_API_KEY
        }
        
        response = requests.get(GEOCODING_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        results = []
        for item in data:
            results.append({
                'name': item['name'],
                'country': item['country'],
                'state': item.get('state', ''),
                'lat': item['lat'],
                'lon': item['lon']
            })
        
        return jsonify({'results': results})
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

@app.route('/api/units-settings', methods=['GET', 'POST'])
def units_settings():
    """API endpoint для налаштування одиниць виміру"""
    if request.method == 'GET':
        # Повертаємо поточні налаштування
        return jsonify({
            'temperature': 'metric',  # metric (°C) або imperial (°F)
            'speed': 'metric'  # metric (м/с, км/год) або imperial (миль/год)
        })
    
    if request.method == 'POST':
        # Зберігаємо налаштування (в реальній системі - в БД або кукі)
        data = request.json
        return jsonify({
            'success': True,
            'settings': data
        })

@app.route('/api/activity-recommendations', methods=['GET'])
def get_activity_recommendations():
    """API endpoint для рекомендацій активностей"""
    city = request.args.get('city', '')
    
    if not city:
        return jsonify({'error': 'Назва міста не вказана'}), 400
    
    if not WEATHER_API_KEY:
        return jsonify({'error': 'API ключ не налаштований'}), 500
    
    try:
        # Отримання поточної погоди
        params = {
            'q': city,
            'appid': WEATHER_API_KEY,
            'units': 'metric',
            'lang': 'ua'
        }
        
        response = requests.get(WEATHER_API_URL, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({'error': 'Місто не знайдено'}), 404
        
        response.raise_for_status()
        data = response.json()
        
        # Параметри погоди
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        wind_speed = data['wind']['speed']
        clouds = data['clouds']['all']
        description = data['weather'][0]['main'].lower()
        
        # Розрахунок індексів для різних активностей
        recommendations = {
            'running': calculate_running_index(temp, humidity, wind_speed, description),
            'cycling': calculate_cycling_index(temp, humidity, wind_speed, description),
            'fishing': calculate_fishing_index(temp, humidity, clouds, wind_speed),
            'agriculture': calculate_agriculture_index(temp, humidity, description),
            'clothing': get_clothing_recommendation(temp, wind_speed, description)
        }
        
        return jsonify(recommendations)
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Помилка з\'єднання: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Внутрішня помилка: {str(e)}'}), 500

def calculate_running_index(temp, humidity, wind_speed, weather):
    """Розрахунок індексу для бігу (0-100)"""
    score = 50
    
    # Температура (оптимально 10-20°C)
    if 10 <= temp <= 20:
        score += 30
    elif 5 <= temp < 10 or 20 < temp <= 25:
        score += 15
    elif temp < 5 or temp > 25:
        score -= 20
    
    # Вологість (оптимально 40-60%)
    if 40 <= humidity <= 60:
        score += 10
    elif humidity > 80:
        score -= 15
    
    # Вітер
    if wind_speed < 3:
        score += 10
    elif wind_speed > 7:
        score -= 15
    
    # Погодні умови
    if weather in ['rain', 'snow', 'thunderstorm']:
        score -= 30
        status = 'Не рекомендовано'
    elif weather == 'clear':
        score += 10
    
    # Визначення статусу
    score = max(0, min(100, score))
    if score >= 70:
        status = 'Відмінно'
        emoji = '🏃‍♂️'
    elif score >= 50:
        status = 'Добре'
        emoji = '👍'
    elif score >= 30:
        status = 'Задовільно'
        emoji = '🤔'
    else:
        status = 'Не рекомендовано'
        emoji = '❌'
    
    return {
        'score': score,
        'status': status,
        'emoji': emoji,
        'description': f'Умови для бігу: {status.lower()}'
    }

def calculate_cycling_index(temp, humidity, wind_speed, weather):
    """Розрахунок індексу для велоспорту (0-100)"""
    score = 50
    
    # Температура (оптимально 15-25°C)
    if 15 <= temp <= 25:
        score += 30
    elif 10 <= temp < 15 or 25 < temp <= 30:
        score += 15
    elif temp < 5 or temp > 30:
        score -= 25
    
    # Вітер (важливіше для велоспорту)
    if wind_speed < 5:
        score += 15
    elif 5 <= wind_speed < 10:
        score += 5
    else:
        score -= 25
    
    # Вологість
    if humidity < 70:
        score += 5
    elif humidity > 85:
        score -= 10
    
    # Погодні умови
    if weather in ['rain', 'snow', 'thunderstorm']:
        score -= 40
    elif weather == 'clear':
        score += 10
    
    score = max(0, min(100, score))
    if score >= 70:
        status = 'Відмінно'
        emoji = '🚴‍♂️'
    elif score >= 50:
        status = 'Добре'
        emoji = '👍'
    elif score >= 30:
        status = 'Задовільно'
        emoji = '🤔'
    else:
        status = 'Не рекомендовано'
        emoji = '❌'
    
    return {
        'score': score,
        'status': status,
        'emoji': emoji,
        'description': f'Умови для велоспорту: {status.lower()}'
    }

def calculate_fishing_index(temp, humidity, clouds, wind_speed):
    """Розрахунок індексу для риболовлі (0-100)"""
    score = 50
    
    # Температура (оптимально 15-25°C)
    if 15 <= temp <= 25:
        score += 20
    elif 10 <= temp < 15 or 25 < temp <= 28:
        score += 10
    elif temp < 5 or temp > 30:
        score -= 15
    
    # Хмарність (риба активніша при похмурій погоді)
    if 40 <= clouds <= 80:
        score += 25
    elif clouds > 80:
        score += 15
    elif clouds < 20:
        score += 5
    
    # Вітер (легкий вітер добре, сильний - погано)
    if 2 <= wind_speed <= 5:
        score += 20
    elif wind_speed < 2:
        score += 10
    elif wind_speed > 8:
        score -= 20
    
    # Вологість (висока краще)
    if humidity > 70:
        score += 10
    
    score = max(0, min(100, score))
    if score >= 70:
        status = 'Відмінно'
        emoji = '🎣'
    elif score >= 50:
        status = 'Добре'
        emoji = '👍'
    elif score >= 30:
        status = 'Задовільно'
        emoji = '🤔'
    else:
        status = 'Погано'
        emoji = '❌'
    
    return {
        'score': score,
        'status': status,
        'emoji': emoji,
        'description': f'Умови для риболовлі: {status.lower()}'
    }

def calculate_agriculture_index(temp, humidity, weather):
    """Розрахунок індексу для сільського господарства (0-100)"""
    score = 50
    
    # Температура (оптимально 18-28°C для більшості культур)
    if 18 <= temp <= 28:
        score += 30
    elif 15 <= temp < 18 or 28 < temp <= 32:
        score += 15
    elif temp < 10 or temp > 35:
        score -= 25
    
    # Вологість (важлива для рослин)
    if 50 <= humidity <= 75:
        score += 25
    elif 40 <= humidity < 50 or 75 < humidity <= 85:
        score += 10
    elif humidity < 30:
        score -= 20
    elif humidity > 90:
        score -= 10
    
    # Погодні умови
    if weather == 'rain':
        score += 15  # Дощ корисний для рослин
    elif weather in ['thunderstorm', 'snow']:
        score -= 30
    elif weather == 'clear':
        score += 10
    
    score = max(0, min(100, score))
    if score >= 70:
        status = 'Відмінно'
        emoji = '🌾'
    elif score >= 50:
        status = 'Добре'
        emoji = '👍'
    elif score >= 30:
        status = 'Задовільно'
        emoji = '🤔'
    else:
        status = 'Погано'
        emoji = '❌'
    
    return {
        'score': score,
        'status': status,
        'emoji': emoji,
        'description': f'Умови для сільського господарства: {status.lower()}'
    }

def get_clothing_recommendation(temp, wind_speed, weather):
    """Рекомендації одягу на основі погоди"""
    items = []
    
    # Базовий одяг за температурою
    if temp < -10:
        items.extend(['🧥 Зимова куртка', '🧤 Рукавички', '🧣 Шарф', '🎿 Термобілизна'])
        description = 'Дуже холодно! Одягайтесь максимально тепло'
    elif -10 <= temp < 0:
        items.extend(['🧥 Зимова куртка', '🧤 Рукавички', '🧣 Шарф'])
        description = 'Мороз. Не забудьте теплий одяг'
    elif 0 <= temp < 10:
        items.extend(['🧥 Куртка', '🧣 Легкий шарф'])
        description = 'Прохолодно. Потрібна куртка'
    elif 10 <= temp < 18:
        items.extend(['👔 Светр', '👕 Довгий рукав'])
        description = 'Помірно. Светр або легка куртка'
    elif 18 <= temp < 25:
        items.extend(['👕 Футболка', '👖 Легкий одяг'])
        description = 'Комфортно. Легкий одяг'
    else:
        items.extend(['👕 Легка футболка', '🩳 Шорти', '😎 Сонцезахисні окуляри'])
        description = 'Спекотно. Мінімум одягу'
    
    # Додаткові рекомендації
    if wind_speed > 7:
        items.append('🧥 Вітрозахисний одяг')
    
    if weather in ['rain', 'drizzle']:
        items.extend(['☂️ Парасолька', '🧥 Дощовик'])
    elif weather == 'snow':
        items.extend(['👢 Зимове взуття', '🧤 Водонепроникні рукавички'])
    elif weather == 'clear' and temp > 20:
        items.append('🧴 Сонцезахисний крем')
    
    return {
        'items': items,
        'description': description,
        'temperature_range': f'{temp}°C'
    }

@app.route('/health')
def health():
    """Health check endpoint для Cloud Run"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    # Для Cloud Run потрібно використовувати PORT з оточення
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
