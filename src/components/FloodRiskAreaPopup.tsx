import React from 'react';
import { X, MapPin, Calendar, Droplets, FileText, AlertTriangle, Users, Mountain, Layers, Cloud, Thermometer, Wind, Shield } from 'lucide-react';
import { FloodRiskArea } from '../types';

interface FloodRiskAreaPopupProps {
  area: FloodRiskArea;
  onClose: () => void;
  position: { x: number; y: number };
}

export const FloodRiskAreaPopup: React.FC<FloodRiskAreaPopupProps> = ({
  area,
  onClose,
  position
}) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      case 'Moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Severe': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm w-80 max-h-96 overflow-y-auto"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Mountain className="w-4 h-4 text-blue-600" />
          Flood Risk Area
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Area Name</p>
            <p className="text-sm text-gray-600">{area.basicInfo.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Layers className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Area Type</p>
            <p className="text-sm text-gray-600 capitalize">{area.basicInfo.type}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Mountain className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Elevation</p>
            <p className="text-sm text-gray-600">{area.physical.elevation}m</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Population</p>
            <p className="text-sm text-gray-600">{area.exposure.population.toLocaleString()}</p>
          </div>
        </div>

        {area.hydrological.floodHistory.hasFlooded && (
          <div className="flex items-start gap-2">
            <Droplets className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Flood History</p>
              <p className="text-sm text-gray-600">
                Max depth: {area.hydrological.floodHistory.maxDepth}m
              </p>
              <p className="text-sm text-gray-600">
                Frequency: {area.hydrological.floodHistory.frequency}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Cloud className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Weather Conditions</p>
            <p className="text-sm text-gray-600">
              Rainfall: {area.weather.rainfall}mm/hr
            </p>
            <p className="text-sm text-gray-600">
              Temperature: {area.weather.temperature}°C
            </p>
          </div>
        </div>

        {area.exposure.criticalAssets.length > 0 && (
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Critical Assets</p>
              <ul className="text-sm text-gray-600">
                {area.exposure.criticalAssets.slice(0, 3).map((asset, index) => (
                  <li key={index}>• {asset}</li>
                ))}
                {area.exposure.criticalAssets.length > 3 && (
                  <li className="text-xs text-gray-500">
                    +{area.exposure.criticalAssets.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className={`px-3 py-2 rounded-lg border ${getRiskColor(area.riskLevel)}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Risk Level: {area.riskLevel}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Created</p>
            <p className="text-sm text-gray-600">{formatDate(area.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};