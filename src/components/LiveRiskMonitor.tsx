import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, OPENWEATHER_API_KEY } from '../firebase';
import { FloodRiskArea, FloodLevel } from '../types';
import { analyzeRisk, mapFloodRiskAreaToAnalysisData, mapRiskResultToFloodLevel } from '../utils/riskAnalysis';

interface LiveRiskMonitorProps {
  onRiskUpdate: (areaId: string, newRiskLevel: FloodLevel) => void;
}

// Fetch current weather data for coordinates
const fetchCurrentWeather = async (lat: number, lng: number) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not found. Please check your .env file.');
    }
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] / 3 || 0,
      windSpeed: (data.wind?.speed || 0) * 3.6, // Convert m/s to km/h
      temperature: data.main?.temp || 0,
      stormAlerts: data.weather?.[0]?.main === 'Thunderstorm' ? 'Thunderstorm Warning' : ''
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
};

// Fetch forecast data
const fetchForecastWeather = async (lat: number, lng: number) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not found. Please check your .env file.');
    }
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Calculate 48h rainfall forecast
    const next48h = data.list.slice(0, 16); // 16 * 3h = 48h
    const forecastRainfall = next48h.reduce((total: number, item: any) => {
      return total + (item.rain?.['3h'] || 0);
    }, 0);
    
    return { forecastRainfall };
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return { forecastRainfall: 0 };
  }
};

export const LiveRiskMonitor: React.FC<LiveRiskMonitorProps> = ({ onRiskUpdate }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  const updateAreaRisk = useCallback(async (area: FloodRiskArea) => {
    try {
      // Get coordinates for weather data
      let coordinates: [number, number];
      if (area.geometry.type === 'Point') {
        coordinates = area.geometry.coordinates as [number, number];
      } else {
        // For polygons, use the first coordinate
        coordinates = (area.geometry.coordinates as number[][][])[0][0] as [number, number];
      }

      const [lng, lat] = coordinates;

      // Fetch current weather and forecast
      const [currentWeather, forecastWeather] = await Promise.all([
        fetchCurrentWeather(lat, lng),
        fetchForecastWeather(lat, lng)
      ]);

      if (!currentWeather || !forecastWeather) return;

      // Update the area's weather data
      const updatedArea = {
        ...area,
        weather: {
          ...area.weather,
          rainfall: currentWeather.rainfall,
          forecastRainfall: forecastWeather.forecastRainfall,
          windSpeed: currentWeather.windSpeed,
          temperature: currentWeather.temperature,
          stormAlerts: currentWeather.stormAlerts
        }
      };

      // Run risk analysis with updated weather
      const { userData, weatherData } = mapFloodRiskAreaToAnalysisData(updatedArea);
      const riskResult = analyzeRisk(userData, weatherData);
      const newRiskLevel = mapRiskResultToFloodLevel(riskResult);

      // Update in database if risk level changed
      if (newRiskLevel !== area.riskLevel && area.id) {
        await updateDoc(doc(db, 'floodRiskAreas', area.id), {
          riskLevel: newRiskLevel,
          weather: updatedArea.weather,
          lastRiskUpdate: new Date().toISOString()
        });

        console.log(`Risk level updated for ${area.basicInfo.name}: ${area.riskLevel} → ${newRiskLevel}`);
        onRiskUpdate(area.id, newRiskLevel);
      }

    } catch (error) {
      console.error('Error updating area risk:', error);
    }
  }, [onRiskUpdate]);

  const monitorAllAreas = useCallback(async () => {
    try {
      // Check API key before starting monitoring
      if (!OPENWEATHER_API_KEY) {
        console.error('Cannot start monitoring: OpenWeatherMap API key is not configured.');
        return;
      }
      
      console.log('Running live risk monitoring...');
      
      // Get all flood risk areas
      const querySnapshot = await getDocs(collection(db, 'floodRiskAreas'));
      const areas: FloodRiskArea[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let geometry = data.geometry;
        
        // Parse polygon coordinates if needed
        if (data.geometry?.type === 'Polygon' && typeof data.geometry.coordinates === 'string') {
          try {
            geometry = {
              ...data.geometry,
              coordinates: JSON.parse(data.geometry.coordinates)
            };
          } catch (e) {
            console.error('Error parsing coordinates:', e);
            return;
          }
        }
        
        if (geometry?.coordinates) {
          areas.push({
            id: doc.id,
            ...data,
            geometry
          } as FloodRiskArea);
        }
      });

      // Update risk for each area
      for (const area of areas) {
        await updateAreaRisk(area);
        // Add small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error in live monitoring:', error);
    }
  }, [updateAreaRisk]);

  const startMonitoring = useCallback(() => {
    if (monitoringInterval) return;

    console.log('Starting live risk monitoring...');
    setIsMonitoring(true);
    
    // Run immediately
    monitorAllAreas();
    
    // Then run every 10 minutes
    const interval = setInterval(monitorAllAreas, 10 * 60 * 1000);
    setMonitoringInterval(interval);
  }, [monitorAllAreas, monitoringInterval]);

  const stopMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);
    console.log('Stopped live risk monitoring');
  }, [monitoringInterval]);

  // Auto-start monitoring when component mounts
  useEffect(() => {
    startMonitoring();
    
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, []);

  return (
    <div className="fixed top-20 left-4 z-10 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium text-gray-800">
          Live Risk Monitor
        </span>
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <div>Status: {isMonitoring ? 'Active' : 'Inactive'}</div>
        {lastUpdate && (
          <div>Last Update: {lastUpdate.toLocaleTimeString()}</div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Updates every 10 minutes
        </div>
      </div>
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={startMonitoring}
          disabled={isMonitoring}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button
          onClick={stopMonitoring}
          disabled={!isMonitoring}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>
    </div>
  );
};