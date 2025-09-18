import React, { useState, useEffect } from 'react';
import { Cloud, ChevronDown, ChevronUp, Droplets, Wind, Thermometer, Eye, Gauge, Calendar, Sun, CloudRain, CloudSnow, Zap } from 'lucide-react';
import { OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL } from '../firebase';

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    weather: {
      main: string;
      description: string;
      icon: string;
    }[];
    rain?: {
      '1h'?: number;
    };
  };
  daily: {
    dt: number;
    temp: {
      day: number;
      min: number;
      max: number;
    };
    weather: {
      main: string;
      description: string;
      icon: string;
    }[];
    pop: number; // Probability of precipitation
    rain?: {
      '1h'?: number;
    };
  }[];
}

interface WeatherPanelProps {
  coordinates: { lat: number; lng: number };
  isDarkTheme: boolean;
}

const getWeatherIcon = (main: string, description: string) => {
  switch (main.toLowerCase()) {
    case 'thunderstorm':
      return <Zap className="w-5 h-5 text-yellow-400" />;
    case 'drizzle':
    case 'rain':
      return <CloudRain className="w-5 h-5 text-blue-400" />;
    case 'snow':
      return <CloudSnow className="w-5 h-5 text-blue-200" />;
    case 'clear':
      return <Sun className="w-5 h-5 text-yellow-400" />;
    case 'clouds':
      return <Cloud className="w-5 h-5 text-gray-400" />;
    default:
      return <Cloud className="w-5 h-5 text-gray-400" />;
  }
};

const fetchWeatherData = async (lat: number, lng: number): Promise<WeatherData | null> => {
  try {
    // Using One Call API 2.5 (free tier allows 1000 calls/day)
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric&exclude=minutely,hourly,alerts`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ coordinates, isDarkTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeatherData = async () => {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchWeatherData(coordinates.lat, coordinates.lng);
      if (data) {
        setWeatherData(data);
      } else {
        setError('Failed to load weather data');
      }
      
      setIsLoading(false);
    };

    loadWeatherData();
  }, [coordinates]);

  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50'
    : 'bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-white';
  const buttonClasses = isDarkTheme
    ? 'bg-gray-800/80 hover:bg-gray-700/80'
    : 'bg-white/10 hover:bg-white/20';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`${panelClasses} w-80 transition-all duration-300 ${isCollapsed ? 'h-auto' : 'max-h-96 overflow-y-auto'}`}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full p-4 flex items-center justify-between ${buttonClasses} rounded-xl transition-all duration-200`}
      >
        <div className="flex items-center gap-3">
          <Cloud className="w-5 h-5 text-blue-400" />
          <span className={`${textClasses} font-semibold`}>Weather Forecast</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className={`w-4 h-4 ${textClasses}`} />
        ) : (
          <ChevronUp className={`w-4 h-4 ${textClasses}`} />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 pt-0 space-y-4">
          {isLoading && (
            <div className={`${textClasses} text-center py-4`}>
              <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading weather data...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-center py-4 text-sm">
              {error}
            </div>
          )}

          {weatherData && (
            <>
              {/* Current Weather */}
              <div className={`p-3 rounded-lg ${isDarkTheme ? 'bg-gray-800/50' : 'bg-white/10'}`}>
                <h4 className={`${textClasses} font-medium mb-3 flex items-center gap-2`}>
                  <Calendar className="w-4 h-4" />
                  Current Weather
                </h4>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getWeatherIcon(weatherData.current.weather[0].main, weatherData.current.weather[0].description)}
                    <div>
                      <div className={`${textClasses} text-2xl font-bold`}>
                        {Math.round(weatherData.current.temp)}°C
                      </div>
                      <div className={`${textClasses} text-sm opacity-75 capitalize`}>
                        {weatherData.current.weather[0].description}
                      </div>
                    </div>
                  </div>
                  <div className={`${textClasses} text-sm opacity-75`}>
                    Feels like {Math.round(weatherData.current.feels_like)}°C
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className={`${textClasses} opacity-75`}>
                      {weatherData.current.humidity}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-gray-400" />
                    <span className={`${textClasses} opacity-75`}>
                      {Math.round(weatherData.current.wind_speed * 3.6)} km/h
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    <span className={`${textClasses} opacity-75`}>
                      {weatherData.current.pressure} hPa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-400" />
                    <span className={`${textClasses} opacity-75`}>
                      {Math.round(weatherData.current.visibility / 1000)} km
                    </span>
                  </div>
                </div>

                {weatherData.current.rain?.['1h'] && (
                  <div className="mt-3 flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-400" />
                    <span className={`${textClasses} text-sm`}>
                      Rainfall: {weatherData.current.rain['1h']} mm/h
                    </span>
                  </div>
                )}
              </div>

              {/* 5-Day Forecast */}
              <div className={`p-3 rounded-lg ${isDarkTheme ? 'bg-gray-800/50' : 'bg-white/10'}`}>
                <h4 className={`${textClasses} font-medium mb-3 flex items-center gap-2`}>
                  <Calendar className="w-4 h-4" />
                  5-Day Forecast
                </h4>
                
                <div className="space-y-2">
                  {weatherData.daily.slice(1, 6).map((day, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 flex-1">
                        {getWeatherIcon(day.weather[0].main, day.weather[0].description)}
                        <div className="flex-1">
                          <div className={`${textClasses} text-sm font-medium`}>
                            {formatDate(day.dt)}
                          </div>
                          <div className={`${textClasses} text-xs opacity-75 capitalize`}>
                            {day.weather[0].description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {day.pop > 0 && (
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-400" />
                            <span className={`${textClasses} text-xs opacity-75`}>
                              {Math.round(day.pop * 100)}%
                            </span>
                          </div>
                        )}
                        <div className={`${textClasses} text-sm`}>
                          <span className="font-medium">{Math.round(day.temp.max)}°</span>
                          <span className="opacity-75">/{Math.round(day.temp.min)}°</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};