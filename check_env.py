import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv('WEATHER_API_KEY')
if not key:
    print('WEATHER_API_KEY is not set. Create a .env file from .env.example and add your key.')
    raise SystemExit(1)
else:
    print('WEATHER_API_KEY is set. Length:', len(key))
