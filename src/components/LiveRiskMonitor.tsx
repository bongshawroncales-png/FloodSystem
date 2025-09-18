import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Play, Pause, Clock, AlertTriangle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, OPENWEATHER_API_KEY } from '../firebase';
import { FloodRiskArea } from '../types';
import { analyzeRisk, mapFloodRiskAreaToAnalysisData, mapRiskResultToFloodLevel } from '../utils/riskAnalysis';

interface LiveRiskMonitorProps {
  onRiskAreasUpdate: () => void;
  isDarkTheme: boolean;
}

// Simple weather data fetcher with better error handling
const fetchSimpleWeatherData = async (lat: number, lng: number) => {
  // Check if API key is available
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.length !== 32) {
    console.warn('OpenWeatherMap API key not configured properly');
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Weather API returned ${response.status} for coordinates ${lat}, ${lng}`);
      return null;
    }
    
    const data = await response.json();
    
    return {
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] / 3 || 0,
      windSpeed: (data.wind?.speed || 0) * 3.6, // Convert m/s to km/h
      temperature: data.main?.temp || 0,
      forecastRainfall: Math.random() * 50 // Placeholder for now
    };
  } catch (error) {
    console.warn('Weather fetch failed:', error);
    return null;
  }
};

export const LiveRiskMonitor: React.FC<LiveRiskMonitorProps> = ({ 
  onRiskAreasUpdate, 
  isDarkTheme 
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check API key availability on mount
  useEffect(() => {
    const keyAvailable = OPENWEATHER_API_KEY && OPENWEATHER_API_KEY.length === 32;
    setHasApiKey(keyAvailable);
    
    if (!keyAvailable) {
      console.warn('Live monitoring disabled: OpenWeatherMap API key not configured');
    }
  }, []);

  // Update risk levels for areas based on current conditions
  const updateRiskLevels = useCallback(async () => {
    if (!hasApiKey) {
      console.log('Skipping risk update - no API key');
      return;
    }

    try {
      console.log('Starting risk level update...');
      
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
            console.warn('Failed to parse coordinates for area:', doc.id);
            return;
          }
        }
        
        if (geometry?.coordinates && geometry.coordinates.length > 0) {
          areas.push({
            id: doc.id,
            ...data,
            geometry
          } as FloodRiskArea);
        }
      });

      console.log(`Processing ${areas.length} areas for risk updates`);

      // Process a few areas at a time to avoid API rate limits
      const batchSize = 3;
      let updatedCount = 0;

      for (let i = 0; i < areas.length; i += batchSize) {
        const batch = areas.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (area) => {
          try {
            // Get coordinates for weather data
            let coordinates;
            if (area.geometry.type === 'Point') {
              coordinates = area.geometry.coordinates as number[];
            } else if (area.geometry.type === 'Polygon') {
              // Use first coordinate of polygon
              const polygonCoords = area.geometry.coordinates as number[][][];
              coordinates = polygonCoords[0][0];
            } else {
              return;
            }

            // Fetch current weather
            const weatherData = await fetchSimpleWeatherData(coordinates[1], coordinates[0]);
            
            if (weatherData) {
              // Update area's weather data
              const updatedArea = {
                ...area,
                weather: {
                  ...area.weather,
                  rainfall: weatherData.rainfall,
                  windSpeed: weatherData.windSpeed,
                  temperature: weatherData.temperature,
                  forecastRainfall: weatherData.forecastRainfall
                }
              };

              // Re-calculate risk level
              const { userData, weatherData: analysisWeatherData } = mapFloodRiskAreaToAnalysisData(updatedArea);
              const riskResult = analyzeRisk(userData, analysisWeatherData);
              const newRiskLevel = mapRiskResultToFloodLevel(riskResult);

              // Update if risk level changed
              if (newRiskLevel !== area.riskLevel) {
                console.log(`Risk level changed for ${area.basicInfo.name}: ${area.riskLevel} → ${newRiskLevel}`);
                
                await updateDoc(doc(db, 'floodRiskAreas', area.id!), {
                  riskLevel: newRiskLevel,
                  weather: updatedArea.weather,
                  lastRiskUpdate: new Date().toISOString()
                });
                
                updatedCount++;
              }
            }
          } catch (error) {
            console.warn(`Failed to update risk for area ${area.basicInfo.name}:`, error);
          }
        }));

        // Small delay between batches
        if (i + batchSize < areas.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Risk update complete. Updated ${updatedCount} areas.`);
      
      if (updatedCount > 0) {
        onRiskAreasUpdate();
      }
      
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Error updating risk levels:', error);
    }
  }, [hasApiKey, onRiskAreasUpdate]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (!hasApiKey) {
      alert('Cannot start monitoring: OpenWeatherMap API key not configured. Please add VITE_OPENWEATHER_API_KEY to your .env file.');
      return;
    }
    
    setIsMonitoring(prev => !prev);
  }, [hasApiKey]);

  // Set up monitoring interval
  useEffect(() => {
    if (!isMonitoring || !hasApiKey) return;

    console.log('Starting live risk monitoring...');
    
    // Initial update
    updateRiskLevels();
    
    // Set up interval (every 5 minutes for testing, can be adjusted)
    const interval = setInterval(() => {
      console.log('Running scheduled risk update...');
      updateRiskLevels();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      console.log('Stopping live risk monitoring...');
      clearInterval(interval);
    };
  }, [isMonitoring, hasApiKey, updateRiskLevels]);

  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50'
    : 'bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-white';
  const buttonClasses = isDarkTheme
    ? 'bg-gray-800/80 hover:bg-gray-700/80'
    : 'bg-white/10 hover:bg-white/20';

  return (
    <div className={`${panelClasses} w-72 p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-green-600/20' : 'bg-green-500/20'}`}>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <span className={`${textClasses} font-semibold text-sm`}>Live Risk Monitor</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            !hasApiKey ? 'bg-red-400' : 
            isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`} />
          <button
            onClick={toggleMonitoring}
            className={`p-1.5 ${buttonClasses} rounded-lg transition-all duration-200 hover:scale-105`}
            disabled={!hasApiKey}
          >
            {isMonitoring ? (
              <Pause className={`w-3 h-3 ${textClasses}`} />
            ) : (
              <Play className={`w-3 h-3 ${textClasses}`} />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className={`${textClasses} opacity-75`}>
          Status: {!hasApiKey ? 'API Key Missing' : isMonitoring ? 'Active' : 'Inactive'}
        </div>
        
        {!hasApiKey && (
          <div className="text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Configure VITE_OPENWEATHER_API_KEY in .env
          </div>
        )}
        
        {lastUpdate && (
          <div className={`${textClasses} opacity-75 flex items-center gap-1`}>
            <Clock className="w-3 h-3" />
            Last: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
        
        {updateCount > 0 && (
          <div className={`${textClasses} opacity-75`}>
            Updates: {updateCount}
          </div>
        )}
        
        {isMonitoring && hasApiKey && (
          <div className={`${textClasses} opacity-75`}>
            Next check in ~5 minutes
          </div>
        )}
      </div>
    </div>
  );
};