import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Play, Pause, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, OPENWEATHER_API_KEY } from '../firebase';
import { FloodRiskArea } from '../types';
import { analyzeRisk, mapFloodRiskAreaToAnalysisData, mapRiskResultToFloodLevel } from '../utils/riskAnalysis';

interface LiveRiskMonitorProps {
  onRiskAreasUpdate: () => void;
  isDarkTheme: boolean;
  userRole: string;
}

// Mock weather simulation data
const MOCK_WEATHER_SCENARIOS = [
  {
    name: 'Heavy Rain Storm', 
    rainfall: 65,
    windSpeed: 45,
    temperature: 26,
    forecastRainfall: 120
  },
  {
    name: 'Severe Typhoon',
    rainfall: 85,
    windSpeed: 85,
    temperature: 24,
    forecastRainfall: 200
  },
  {
    name: 'Super Typhoon',
    rainfall: 120,
    windSpeed: 150,
    temperature: 22,
    forecastRainfall: 350
  },
  {
    name: 'Moderate Rain',
    rainfall: 25,
    windSpeed: 20,
    temperature: 28,
    forecastRainfall: 45
  },
  {
    name: 'Clear Weather',
    rainfall: 0,
    windSpeed: 8,
    temperature: 30,
    forecastRainfall: 5
  }
];

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
  isDarkTheme,
  userRole
}) => {
  const [isMonitoring, setIsMonitoring] = useState(true); // Auto-start monitoring
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    if (!hasApiKey && !isDemoMode) {
      console.log('Skipping risk update - no API key');
      return;
    }

    try {
      console.log(`Starting risk level update... (${isDemoMode ? 'DEMO MODE' : 'LIVE MODE'})`);
      
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

            // Fetch current weather (real or mock)
            let weatherData;
            if (isDemoMode) {
              // Use mock weather data
              const scenario = MOCK_WEATHER_SCENARIOS[currentScenario];
              weatherData = {
                rainfall: scenario.rainfall,
                windSpeed: scenario.windSpeed,
                temperature: scenario.temperature,
                forecastRainfall: scenario.forecastRainfall
              };
              console.log(`Using mock weather scenario: ${scenario.name}`, weatherData);
            } else {
              // Use real weather data
              weatherData = await fetchSimpleWeatherData(coordinates[1], coordinates[0]);
            }
            
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
        if (i + batchSize < areas.length && !isDemoMode) {
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
  }, [hasApiKey, isDemoMode, currentScenario, onRiskAreasUpdate]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    // All users can run live risk monitor
    if (!hasApiKey && !isDemoMode) {
      alert('Cannot start monitoring: OpenWeatherMap API key not configured. Please add VITE_OPENWEATHER_API_KEY to your .env file.');
      return;
    }
    
    setIsMonitoring(prev => !prev);
  }, [hasApiKey, isDemoMode]);

  // Toggle demo mode
  const toggleDemoMode = useCallback(() => {
    if (isMonitoring) {
      setIsMonitoring(false);
    }
    setIsDemoMode(prev => !prev);
    setCurrentScenario(0);
  }, [isMonitoring]);

  // Cycle through demo scenarios
  const nextScenario = useCallback(() => {
    setCurrentScenario(prev => (prev + 1) % MOCK_WEATHER_SCENARIOS.length);
  }, []);

  // Set up monitoring interval
  useEffect(() => {
    if (!isMonitoring || (!hasApiKey && !isDemoMode)) return;

    console.log(`Starting ${isDemoMode ? 'DEMO' : 'LIVE'} risk monitoring...`);
    
    // Initial update
    updateRiskLevels();
    
    // Set up interval (shorter for demo mode)
    const intervalTime = isDemoMode ? 10 * 1000 : 5 * 60 * 1000; // 10 seconds for demo, 5 minutes for live
    const interval = setInterval(() => {
      console.log(`Running scheduled ${isDemoMode ? 'DEMO' : 'LIVE'} risk update...`);
      updateRiskLevels();
    }, intervalTime);

    return () => {
      console.log(`Stopping ${isDemoMode ? 'DEMO' : 'LIVE'} risk monitoring...`);
      clearInterval(interval);
    };
  }, [isMonitoring, hasApiKey, isDemoMode, updateRiskLevels]);

  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50'
    : 'bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-white';
  const buttonClasses = isDarkTheme
    ? 'bg-gray-800/80 hover:bg-gray-700/80'
    : 'bg-white/10 hover:bg-white/20';

  return (
    <div className={`${panelClasses} w-80 p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-green-600/20' : 'bg-green-500/20'}`}>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <span className={`${textClasses} font-semibold text-sm`}>Live Risk Monitor</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            !hasApiKey && !isDemoMode ? 'bg-red-400' : 
            isDemoMode ? 'bg-yellow-400 animate-pulse' :
            isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`} />
          <button
            onClick={toggleMonitoring}
            className={`p-1.5 ${buttonClasses} rounded-lg transition-all duration-200 hover:scale-105`}
            disabled={!hasApiKey && !isDemoMode}
          >
            {isMonitoring ? (
              <Pause className={`w-3 h-3 ${textClasses}`} />
            ) : (
              <Play className={`w-3 h-3 ${textClasses}`} />
            )}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 ${buttonClasses} rounded-lg transition-all duration-200 hover:scale-105`}
          >
            {isCollapsed ? (
              <ChevronDown className={`w-3 h-3 ${textClasses}`} />
            ) : (
              <ChevronUp className={`w-3 h-3 ${textClasses}`} />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-2 text-xs mt-3">
        <div className={`${textClasses} opacity-75`}>
          Status: {!hasApiKey && !isDemoMode ? 'API Key Missing' : 
                   isDemoMode ? `Demo Mode (${MOCK_WEATHER_SCENARIOS[currentScenario].name})` :
                   isMonitoring ? 'Live Active' : 'Inactive'}
        </div>
        
        {!hasApiKey && !isDemoMode && (
          <div className="text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Configure VITE_OPENWEATHER_API_KEY in .env
          </div>
        )}
        
        {isDemoMode && (
          <div className="text-yellow-400 text-xs">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Using simulated weather data
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
        
        {isMonitoring && (hasApiKey || isDemoMode) && (
          <div className={`${textClasses} opacity-75`}>
            Next check in ~{isDemoMode ? '10 seconds' : '5 minutes'}
          </div>
        )}
        </div>
      )}

      {/* Demo Controls */}
      {!isCollapsed && (
        <div className={`mt-3 pt-3 border-t ${isDarkTheme ? 'border-gray-600/50' : 'border-white/20'} space-y-2`}>
        <button
          onClick={toggleDemoMode}
          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            isDemoMode 
              ? 'bg-yellow-500/60 hover:bg-yellow-500/80 text-white' 
              : `${buttonClasses} ${textClasses} hover:bg-yellow-500/30`
          }`}
        >
          {isDemoMode ? 'Exit Demo Mode' : 'Start Demo Mode'}
        </button>
        
        {isDemoMode && (
          <div className="space-y-2">
            <button
              onClick={nextScenario}
              className={`w-full px-3 py-1.5 ${buttonClasses} rounded-lg ${textClasses} text-xs transition-all duration-200 hover:scale-105`}
            >
              Next Scenario ({currentScenario + 1}/{MOCK_WEATHER_SCENARIOS.length})
            </button>
            <div className={`${textClasses} text-xs opacity-75 text-center`}>
              Current: {MOCK_WEATHER_SCENARIOS[currentScenario].name}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
};