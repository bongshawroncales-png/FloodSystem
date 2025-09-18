import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, AlertTriangle, MapPin, Users, Calendar, Droplets, Wind, Thermometer, Activity, PieChart, LineChart } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FloodRiskArea, FloodIncident } from '../types';

interface AnalyticsPageProps {
  onBack: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const [floodRiskAreas, setFloodRiskAreas] = useState<FloodRiskArea[]>([]);
  const [floodIncidents, setFloodIncidents] = useState<FloodIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'incidents' | 'weather'>('overview');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load flood risk areas
        const areasSnapshot = await getDocs(collection(db, 'floodRiskAreas'));
        const areas: FloodRiskArea[] = [];
        areasSnapshot.forEach((doc) => {
          const data = doc.data();
          let geometry = data.geometry;
          
          if (data.geometry?.type === 'Polygon' && typeof data.geometry.coordinates === 'string') {
            try {
              geometry = {
                ...data.geometry,
                coordinates: JSON.parse(data.geometry.coordinates)
              };
            } catch (e) {
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
        setFloodRiskAreas(areas);

        // Load flood incidents
        const incidentsSnapshot = await getDocs(collection(db, 'floodIncidents'));
        const incidents: FloodIncident[] = [];
        incidentsSnapshot.forEach((doc) => {
          incidents.push({ id: doc.id, ...doc.data() } as FloodIncident);
        });
        setFloodIncidents(incidents);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate analytics data
  const riskLevelCounts = {
    'Very Low': floodRiskAreas.filter(area => area.riskLevel === 'Very Low').length,
    'Low': floodRiskAreas.filter(area => area.riskLevel === 'Low').length,
    'Moderate': floodRiskAreas.filter(area => area.riskLevel === 'Moderate').length,
    'High': floodRiskAreas.filter(area => area.riskLevel === 'High').length,
    'Severe': floodRiskAreas.filter(area => area.riskLevel === 'Severe').length,
  };

  const areaTypeCounts = floodRiskAreas.reduce((acc, area) => {
    acc[area.basicInfo.type] = (acc[area.basicInfo.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPopulationAtRisk = floodRiskAreas.reduce((sum, area) => sum + area.exposure.population, 0);
  const averageElevation = floodRiskAreas.length > 0 
    ? floodRiskAreas.reduce((sum, area) => sum + area.physical.elevation, 0) / floodRiskAreas.length 
    : 0;

  const incidentsBySeverity = {
    'Low': floodIncidents.filter(incident => incident.severity === 'Low').length,
    'Medium': floodIncidents.filter(incident => incident.severity === 'Medium').length,
    'High': floodIncidents.filter(incident => incident.severity === 'High').length,
    'Critical': floodIncidents.filter(incident => incident.severity === 'Critical').length,
  };

  const recentIncidents = floodIncidents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low': return 'bg-blue-500';
      case 'Low': return 'bg-green-500';
      case 'Moderate': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Severe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Analytics Dashboard</h1>
                  <p className="text-sm text-gray-600">Kalaw Flood Monitoring System</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'risk', label: 'Risk Analysis', icon: AlertTriangle },
              { id: 'incidents', label: 'Incident Trends', icon: TrendingUp },
              { id: 'weather', label: 'Weather Patterns', icon: Droplets }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Areas</p>
                    <p className="text-2xl font-bold text-gray-900">{floodRiskAreas.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">High Risk Areas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {riskLevelCounts.High + riskLevelCounts.Severe}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Population at Risk</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPopulationAtRisk.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                    <p className="text-2xl font-bold text-gray-900">{floodIncidents.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Level Distribution */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Risk Level Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(riskLevelCounts).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${getRiskColor(level)}`}></div>
                        <span className="text-sm text-gray-700">{level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getRiskColor(level)}`}
                            style={{ width: `${floodRiskAreas.length > 0 ? (count / floodRiskAreas.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Area Types */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Area Types
                </h3>
                <div className="space-y-3">
                  {Object.entries(areaTypeCounts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${floodRiskAreas.length > 0 ? (count / floodRiskAreas.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Analysis Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Assessment Summary</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800">Severe Risk Areas</h4>
                    <p className="text-2xl font-bold text-red-900">{riskLevelCounts.Severe}</p>
                    <p className="text-sm text-red-600">Immediate attention required</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800">High Risk Areas</h4>
                    <p className="text-2xl font-bold text-orange-900">{riskLevelCounts.High}</p>
                    <p className="text-sm text-orange-600">Enhanced monitoring needed</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800">Moderate Risk Areas</h4>
                    <p className="text-2xl font-bold text-yellow-900">{riskLevelCounts.Moderate}</p>
                    <p className="text-sm text-yellow-600">Regular monitoring</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Geographic Analysis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Average Elevation</span>
                    <span className="font-medium text-gray-900">{averageElevation.toFixed(1)}m</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Areas with Flood History</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.filter(area => area.hydrological.floodHistory.hasFlooded).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Areas Near Water Bodies</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.filter(area => area.hydrological.waterBody !== 'none').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Incident Severity Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(incidentsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${getSeverityColor(severity)}`}></div>
                        <span className="text-sm text-gray-700">{severity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getSeverityColor(severity)}`}
                            style={{ width: `${floodIncidents.length > 0 ? (count / floodIncidents.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Incidents</h3>
                <div className="space-y-3">
                  {recentIncidents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No incidents reported yet</p>
                  ) : (
                    recentIncidents.map((incident) => (
                      <div key={incident.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{incident.title}</h4>
                            <p className="text-xs text-gray-600">{incident.location}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(incident.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                            incident.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                            incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {incident.severity}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weather Patterns Tab */}
        {activeTab === 'weather' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  Rainfall Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Average Rainfall</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? (floodRiskAreas.reduce((sum, area) => sum + area.weather.rainfall, 0) / floodRiskAreas.length).toFixed(1)
                        : 0}mm/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Max Recorded</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? Math.max(...floodRiskAreas.map(area => area.weather.rainfall)).toFixed(1)
                        : 0}mm/hr
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Wind className="w-5 h-5 text-gray-600" />
                  Wind Patterns
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Average Wind Speed</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? (floodRiskAreas.reduce((sum, area) => sum + area.weather.windSpeed, 0) / floodRiskAreas.length).toFixed(1)
                        : 0}km/h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Max Recorded</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? Math.max(...floodRiskAreas.map(area => area.weather.windSpeed)).toFixed(1)
                        : 0}km/h
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-red-600" />
                  Temperature Data
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Average Temperature</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? (floodRiskAreas.reduce((sum, area) => sum + area.weather.temperature, 0) / floodRiskAreas.length).toFixed(1)
                        : 0}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Temperature Range</span>
                    <span className="font-medium text-gray-900">
                      {floodRiskAreas.length > 0 
                        ? `${Math.min(...floodRiskAreas.map(area => area.weather.temperature)).toFixed(1)}°C - ${Math.max(...floodRiskAreas.map(area => area.weather.temperature)).toFixed(1)}°C`
                        : '0°C - 0°C'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Weather Alerts Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800">Active Weather Alerts</h4>
                  <p className="text-sm text-yellow-600 mt-1">
                    {floodRiskAreas.filter(area => area.weather.stormAlerts && area.weather.stormAlerts !== '').length} areas with active alerts
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800">Forecast Monitoring</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Continuous monitoring of {floodRiskAreas.length} marked areas
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};