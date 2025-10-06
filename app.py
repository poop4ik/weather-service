from flask import Flask, render_template, request, jsonify
import requests
import os
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
        
        # Форматування відповіді
        weather_data = {
            'city': data['name'],
            'country': data['sys']['country'],
            'temperature': round(data['main']['temp'], 1),
            'feels_like': round(data['main']['feels_like'], 1),
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'wind_speed': data['wind']['speed'],
            'description': data['weather'][0]['description'],
            'icon': data['weather'][0]['icon'],
            'lat': data['coord']['lat'],
            'lon': data['coord']['lon'],
            'timestamp': datetime.now().isoformat()
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
        
        aqi_labels = ['Відмінна', 'Добра', 'Помірна', 'Погана', 'Дуже погана']
        aqi = data['list'][0]['main']['aqi']
        components = data['list'][0]['components']
        
        return jsonify({
            'aqi': aqi,
            'aqi_label': aqi_labels[aqi - 1] if 1 <= aqi <= 5 else 'Невідома',
            'components': {
                'co': round(components.get('co', 0), 2),
                'no2': round(components.get('no2', 0), 2),
                'o3': round(components.get('o3', 0), 2),
                'pm2_5': round(components.get('pm2_5', 0), 2),
                'pm10': round(components.get('pm10', 0), 2)
            }
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

@app.route('/health')
def health():
    """Health check endpoint для Cloud Run"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    # Для Cloud Run потрібно використовувати PORT з оточення
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
