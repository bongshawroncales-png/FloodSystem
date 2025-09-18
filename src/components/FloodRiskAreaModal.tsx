import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Droplets, FileText, AlertTriangle, Eye, Zap, Car, Users, Mountain, Layers, Home, Factory, Building, TreePine, Waves, Clock, Shield, Wrench, Cloud, Thermometer, Wind } from 'lucide-react';
import { FloodRiskArea, AreaType, SlopeType, SoilType, DrainageQuality, SurfaceCover, WaterBodyType, FloodCause, FloodFrequency, FloodCoverage, BuildingType, GroundCondition, FloodLevel } from '../types';
import { OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL } from '../firebase';

interface FloodRiskAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (area: Omit<FloodRiskArea, 'id' | 'createdAt'>) => void;
  geometry: any;
  location: string;
}

const AREA_TYPES: AreaType[] = ['residential', 'agricultural', 'commercial', 'infrastructure', 'critical facility', 'other'];
const SLOPE_TYPES: SlopeType[] = ['flat', 'gentle', 'steep'];
const SOIL_TYPES: SoilType[] = ['sandy', 'clay', 'loam', 'rocky', 'mixed'];
const DRAINAGE_QUALITIES: DrainageQuality[] = ['none', 'poor', 'moderate', 'good', 'engineered'];
const SURFACE_COVERS: SurfaceCover[] = ['paved/concrete', 'bare soil', 'vegetation', 'mixed'];
const WATER_BODY_TYPES: WaterBodyType[] = ['river', 'creek', 'sea', 'lake', 'canal', 'none'];
const FLOOD_CAUSES: FloodCause[] = ['typhoon', 'monsoon', 'storm surge', 'heavy rain', 'dam release', 'other'];
const FLOOD_FREQUENCIES: FloodFrequency[] = ['rare', 'occasional', 'frequent', 'very frequent'];
const FLOOD_COVERAGES: FloodCoverage[] = ['part polygon', 'full polygon', 'beyond polygon'];
const BUILDING_TYPES: BuildingType[] = ['light', 'concrete', 'mixed'];
const GROUND_CONDITIONS: GroundCondition[] = ['dry', 'moist', 'saturated', 'already flooded'];

const VULNERABLE_GROUPS = ['children', 'elderly', 'PWDs', 'none'];
const CRITICAL_ASSETS = ['roads', 'bridges', 'hospitals', 'schools', 'farmlands', 'substations', 'others'];
const FLOOD_IMPACTS = ['damage', 'crops', 'road blockage', 'casualties', 'power outage', 'water contamination', 'business disruption'];

// Real weather data fetching function using OpenWeatherMap API
const fetchWeatherData = async (coordinates: number[]): Promise<any> => {
  try {
    const [longitude, latitude] = coordinates;
    const url = `${OPENWEATHER_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract rainfall data (mm/hr)
    const rainfall = data.rain?.['1h'] || data.rain?.['3h'] / 3 || 0;
    
    // Generate storm alerts based on weather conditions
    let stormAlerts = '';
    if (data.weather?.[0]?.main === 'Thunderstorm') {
      stormAlerts = 'Thunderstorm Warning';
    } else if (data.weather?.[0]?.main === 'Rain' && data.wind?.speed > 15) {
      stormAlerts = 'Heavy Rain and Wind Advisory';
    } else if (data.wind?.speed > 25) {
      stormAlerts = 'High Wind Warning';
    }
    
    return {
      rainfall: Math.round(rainfall * 10) / 10,
      forecastRainfall: 0, // Would need forecast API for this
      stormAlerts,
      windSpeed: Math.round((data.wind?.speed || 0) * 3.6 * 10) / 10, // Convert m/s to km/h
      temperature: Math.round((data.main?.temp || 0) * 10) / 10
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Return fallback data if API fails
    return {
      rainfall: 0,
      forecastRainfall: 0,
      stormAlerts: 'Weather data unavailable',
      windSpeed: 0,
      temperature: 0
    };
  }
};

// Mock elevation fetching function
const fetchElevation = async (coordinates: number[]): Promise<number> => {
  // In a real implementation, this would call a DEM/GIS API
  return Math.random() * 100;
};

export const FloodRiskAreaModal: React.FC<FloodRiskAreaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  geometry,
  location
}) => {
  const [formData, setFormData] = useState<Omit<FloodRiskArea, 'id' | 'createdAt'>>({
    coordinates: [],
    basicInfo: {
      name: '',
      type: 'residential' as AreaType,
      coordinates: []
    },
    physical: {
      elevation: 0,
      slope: 'flat' as SlopeType,
      soil: 'loam' as SoilType,
      drainage: 'moderate' as DrainageQuality,
      surfaceCover: 'mixed' as SurfaceCover
    },
    hydrological: {
      waterBody: 'none' as WaterBodyType,
      distance: 0,
      floodHistory: {
        hasFlooded: false,
        dates: [],
        cause: 'heavy rain' as FloodCause,
        maxDepth: 0,
        duration: '',
        frequency: 'rare' as FloodFrequency,
        coverage: 'part polygon' as FloodCoverage,
        impacts: [],
        recoveryTime: '',
        defenses: '',
        preparedness: ''
      }
    },
    exposure: {
      population: 0,
      vulnerableGroups: [],
      criticalAssets: [],
      buildingTypes: 'mixed' as BuildingType,
      preparednessMeasures: ''
    },
    ground: {
      condition: 'dry' as GroundCondition,
      blockages: '',
      construction: ''
    },
    weather: {
      rainfall: 0,
      forecastRainfall: 0,
      stormAlerts: '',
      windSpeed: 0,
      temperature: 0
    },
    runPrediction: true,
    riskLevel: 'Low' as FloodLevel,
    geometry: {
      type: geometry?.type || 'Point',
      coordinates: geometry?.coordinates || []
    }
  });

  // Debug: Log the geometry when modal opens
  useEffect(() => {
    if (isOpen && geometry) {
      console.log('Modal opened with geometry:', geometry);
      console.log('Geometry coordinates:', geometry.coordinates);
      
      // Extract coordinates for Firestore (avoid nested arrays)
      let extractedCoordinates;
      if (geometry.type === 'Point') {
        extractedCoordinates = geometry.coordinates;
      } else if (geometry.type === 'Polygon') {
        // For polygons, use the first coordinate pair to avoid nested arrays
        extractedCoordinates = geometry.coordinates[0][0];
      } else {
        extractedCoordinates = [];
      }
      
      // Initialize form data with the provided geometry
      setFormData(prev => ({
        ...prev,
        geometry: {
          type: geometry.type,
          coordinates: geometry.coordinates
        },
        coordinates: extractedCoordinates,
        basicInfo: {
          ...prev.basicInfo,
          coordinates: extractedCoordinates
        }
      }));
    }
  }, [isOpen, geometry]);

  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isLoadingElevation, setIsLoadingElevation] = useState(false);

  // Auto-fetch weather and elevation data when modal opens
  useEffect(() => {
    if (isOpen && geometry?.coordinates) {
      const coordinates = geometry.type === 'Point' 
        ? geometry.coordinates 
        : geometry.coordinates[0][0]; // First point of polygon

      // Fetch weather data
      setIsLoadingWeather(true);
      fetchWeatherData(coordinates).then(weatherData => {
        setFormData(prev => ({
          ...prev,
          weather: weatherData
        }));
        setIsLoadingWeather(false);
      });

      // Fetch elevation data
      setIsLoadingElevation(true);
      fetchElevation(coordinates).then(elevation => {
        setFormData(prev => ({
          ...prev,
          physical: {
            ...prev.physical,
            elevation: Math.round(elevation)
          }
        }));
        setIsLoadingElevation(false);
      });
    }
  }, [isOpen, geometry]);

  const handleArrayFieldChange = (section: string, field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: checked
          ? [...((prev[section as keyof typeof prev] as any)[field] || []), value]
          : ((prev[section as keyof typeof prev] as any)[field] || []).filter((item: string) => item !== value)
      }
    }));
  };

  const handleFloodHistoryDateAdd = () => {
    const dateInput = document.getElementById('floodDate') as HTMLInputElement;
    if (dateInput?.value) {
      setFormData(prev => ({
        ...prev,
        hydrological: {
          ...prev.hydrological,
          floodHistory: {
            ...prev.hydrological.floodHistory,
            dates: [...prev.hydrological.floodHistory.dates, dateInput.value]
          }
        }
      }));
      dateInput.value = '';
    }
  };

  const handleFloodHistoryDateRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hydrological: {
        ...prev.hydrological,
        floodHistory: {
          ...prev.hydrological.floodHistory,
          dates: prev.hydrological.floodHistory.dates.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Mountain className="w-5 h-5 text-blue-600" />
              Flood Risk Area Assessment
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive flood risk evaluation for the selected area
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area/Location Name *
                </label>
                <input
                  type="text"
                  value={formData.basicInfo.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Area *
                </label>
                <select
                  value={formData.basicInfo.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, type: e.target.value as AreaType }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {AREA_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coordinates (auto-filled)
              </label>
              <input
                type="text"
                value={location}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          {/* Physical Characteristics */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Mountain className="w-5 h-5" />
              Physical Characteristics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Elevation (m) {isLoadingElevation && <span className="text-blue-500">Loading...</span>}
                </label>
                <input
                  type="number"
                  value={formData.physical.elevation}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical: { ...prev.physical, elevation: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slope/Gradient
                </label>
                <select
                  value={formData.physical.slope}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical: { ...prev.physical, slope: e.target.value as SlopeType }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SLOPE_TYPES.map(slope => (
                    <option key={slope} value={slope}>{slope}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soil Type
                </label>
                <select
                  value={formData.physical.soil}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical: { ...prev.physical, soil: e.target.value as SoilType }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SOIL_TYPES.map(soil => (
                    <option key={soil} value={soil}>{soil}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drainage System Quality
                </label>
                <select
                  value={formData.physical.drainage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical: { ...prev.physical, drainage: e.target.value as DrainageQuality }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DRAINAGE_QUALITIES.map(drainage => (
                    <option key={drainage} value={drainage}>{drainage}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surface Cover
                </label>
                <select
                  value={formData.physical.surfaceCover}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    physical: { ...prev.physical, surfaceCover: e.target.value as SurfaceCover }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SURFACE_COVERS.map(cover => (
                    <option key={cover} value={cover}>{cover}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hydrological Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Waves className="w-5 h-5" />
              Hydrological Context
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proximity to Water Body
                </label>
                <select
                  value={formData.hydrological.waterBody}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hydrological: { ...prev.hydrological, waterBody: e.target.value as WaterBodyType }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {WATER_BODY_TYPES.map(body => (
                    <option key={body} value={body}>{body}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance to Nearest Water Body (m)
                </label>
                <input
                  type="number"
                  value={formData.hydrological.distance}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hydrological: { ...prev.hydrological, distance: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Historical Flooding */}
            <div>
              <label className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  checked={formData.hydrological.floodHistory.hasFlooded}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    hydrological: {
                      ...prev.hydrological,
                      floodHistory: { ...prev.hydrological.floodHistory, hasFlooded: e.target.checked }
                    }
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Historical Flooding</span>
              </label>

              {formData.hydrological.floodHistory.hasFlooded && (
                <div className="space-y-4 ml-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dates of Past Floods
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="date"
                        id="floodDate"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleFloodHistoryDateAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-1">
                      {formData.hydrological.floodHistory.dates.map((date, index) => (
                        <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                          <span className="text-sm">{date}</span>
                          <button
                            type="button"
                            onClick={() => handleFloodHistoryDateRemove(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Flood Cause
                      </label>
                      <select
                        value={formData.hydrological.floodHistory.cause}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, cause: e.target.value as FloodCause }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FLOOD_CAUSES.map(cause => (
                          <option key={cause} value={cause}>{cause}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Water Depth (m)
                      </label>
                      <input
                        type="number"
                        value={formData.hydrological.floodHistory.maxDepth}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, maxDepth: Number(e.target.value) }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={formData.hydrological.floodHistory.duration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, duration: e.target.value }
                          }
                        }))}
                        placeholder="e.g., 3 hours, 2 days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency
                      </label>
                      <select
                        value={formData.hydrological.floodHistory.frequency}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, frequency: e.target.value as FloodFrequency }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FLOOD_FREQUENCIES.map(freq => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Area Coverage
                      </label>
                      <select
                        value={formData.hydrological.floodHistory.coverage}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, coverage: e.target.value as FloodCoverage }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FLOOD_COVERAGES.map(coverage => (
                          <option key={coverage} value={coverage}>{coverage}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recovery Time
                      </label>
                      <input
                        type="text"
                        value={formData.hydrological.floodHistory.recoveryTime}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, recoveryTime: e.target.value }
                          }
                        }))}
                        placeholder="e.g., 1 week, 1 month"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impacts (check all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {FLOOD_IMPACTS.map(impact => (
                        <label key={impact} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.hydrological.floodHistory.impacts.includes(impact)}
                            onChange={(e) => handleArrayFieldChange('hydrological', 'floodHistory', impact, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{impact}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Flood Defenses
                      </label>
                      <textarea
                        value={formData.hydrological.floodHistory.defenses}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, defenses: e.target.value }
                          }
                        }))}
                        placeholder="e.g., levees, pumping stations, drainage, floodwalls, none"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Community Preparedness
                      </label>
                      <textarea
                        value={formData.hydrological.floodHistory.preparedness}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hydrological: {
                            ...prev.hydrological,
                            floodHistory: { ...prev.hydrological.floodHistory, preparedness: e.target.value }
                          }
                        }))}
                        placeholder="e.g., evacuation center used, early warning system, none"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exposure & Vulnerability */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Exposure & Vulnerability
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Population
                </label>
                <input
                  type="number"
                  value={formData.exposure.population}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    exposure: { ...prev.exposure, population: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Types
                </label>
                <select
                  value={formData.exposure.buildingTypes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    exposure: { ...prev.exposure, buildingTypes: e.target.value as BuildingType }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {BUILDING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vulnerable Groups (check all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {VULNERABLE_GROUPS.map(group => (
                  <label key={group} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.exposure.vulnerableGroups.includes(group)}
                      onChange={(e) => handleArrayFieldChange('exposure', 'vulnerableGroups', group, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{group}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Critical Assets (check all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CRITICAL_ASSETS.map(asset => (
                  <label key={asset} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.exposure.criticalAssets.includes(asset)}
                      onChange={(e) => handleArrayFieldChange('exposure', 'criticalAssets', asset, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{asset}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preparedness Measures
              </label>
              <textarea
                value={formData.exposure.preparednessMeasures}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  exposure: { ...prev.exposure, preparednessMeasures: e.target.value }
                }))}
                placeholder="e.g., evacuation plan, early warning, none"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Ground & Human Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Ground & Human Conditions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Ground Condition
                </label>
                <select
                  value={formData.ground.condition}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    ground: { ...prev.ground, condition: e.target.value as GroundCondition }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {GROUND_CONDITIONS.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blockages/Obstructions nearby
              </label>
              <textarea
                value={formData.ground.blockages}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ground: { ...prev.ground, blockages: e.target.value }
                }))}
                placeholder="Describe any blockages or obstructions that might affect flooding"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ongoing Construction / Land Use Change
              </label>
              <textarea
                value={formData.ground.construction}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ground: { ...prev.ground, construction: e.target.value }
                }))}
                placeholder="Describe any ongoing construction or land use changes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Weather & Climate */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Weather & Climate {isLoadingWeather && <span className="text-blue-500 text-sm">Loading...</span>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Rainfall Intensity (mm/hr)
                </label>
                <input
                  type="number"
                  value={formData.weather.rainfall}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    weather: { ...prev.weather, rainfall: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Forecasted Rainfall (24-48h, mm)
                </label>
                <input
                  type="number"
                  value={formData.weather.forecastRainfall}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    weather: { ...prev.weather, forecastRainfall: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Wind Speed (km/h)
                </label>
                <input
                  type="number"
                  value={formData.weather.windSpeed}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    weather: { ...prev.weather, windSpeed: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.weather.temperature}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    weather: { ...prev.weather, temperature: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Storm/Typhoon Alerts
              </label>
              <input
                type="text"
                value={formData.weather.stormAlerts}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weather: { ...prev.weather, stormAlerts: e.target.value }
                }))}
                placeholder="e.g., Typhoon Warning Signal #2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Risk Prediction */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.runPrediction}
                onChange={(e) => setFormData(prev => ({ ...prev, runPrediction: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Run Flood Risk Prediction for this Area
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Submit Assessment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};