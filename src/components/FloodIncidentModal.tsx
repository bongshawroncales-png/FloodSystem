import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Calendar, Users, Camera, FileText } from 'lucide-react';
import { FloodRiskArea, FloodIncident } from '../types';

interface FloodIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (incident: Omit<FloodIncident, 'id' | 'createdAt'>) => void;
  area: FloodRiskArea;
  user: any;
}

export const FloodIncidentModal: React.FC<FloodIncidentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  area,
  user
}) => {
  const [formData, setFormData] = useState({
    title: `Flood Incident - ${area.basicInfo.name}`,
    description: '',
    severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    affectedPopulation: area.exposure.population || 0,
    images: [] as string[],
    additionalNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get coordinates from area geometry
    let coordinates: number[];
    if (area.geometry.type === 'Point') {
      coordinates = area.geometry.coordinates as number[];
    } else if (area.geometry.type === 'Polygon') {
      // Use centroid of polygon
      const coords = area.geometry.coordinates as number[][][];
      const firstRing = coords[0];
      const sumLat = firstRing.reduce((sum, coord) => sum + coord[1], 0);
      const sumLng = firstRing.reduce((sum, coord) => sum + coord[0], 0);
      coordinates = [sumLng / firstRing.length, sumLat / firstRing.length];
    } else {
      coordinates = [0, 0];
    }

    const incident: Omit<FloodIncident, 'id' | 'createdAt'> = {
      title: formData.title,
      description: formData.description,
      location: area.basicInfo.name,
      coordinates: coordinates,
      severity: formData.severity,
      status: 'Pending',
      reportedBy: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      affectedPopulation: formData.affectedPopulation,
      relatedAreaId: area.id
    };

    onSubmit(incident);
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Report Flood Incident
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Document flood occurrence for area: {area.basicInfo.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Area Information */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Area Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
              <div><strong>Name:</strong> {area.basicInfo.name}</div>
              <div><strong>Type:</strong> {area.basicInfo.type}</div>
              <div><strong>Risk Level:</strong> {area.riskLevel}</div>
              <div><strong>Population:</strong> {area.exposure.population.toLocaleString()}</div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incident Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incident Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Describe the flood incident, water levels, affected areas, and current situation..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Level *
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="Low">Low - Minor flooding</option>
                  <option value="Medium">Medium - Moderate flooding</option>
                  <option value="High">High - Significant flooding</option>
                  <option value="Critical">Critical - Severe flooding</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affected Population
                </label>
                <input
                  type="number"
                  value={formData.affectedPopulation}
                  onChange={(e) => setFormData(prev => ({ ...prev, affectedPopulation: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Any additional information, rescue operations, damage assessment, etc..."
              />
            </div>
          </div>

          {/* Current Weather Context */}
          {area.weather.rainfall > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-900 mb-2">Current Weather Conditions</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-yellow-800">
                <div><strong>Rainfall:</strong> {area.weather.rainfall}mm/hr</div>
                <div><strong>Wind Speed:</strong> {area.weather.windSpeed}km/h</div>
                <div><strong>Temperature:</strong> {area.weather.temperature}°C</div>
                <div><strong>Forecast:</strong> {area.weather.forecastRainfall}mm expected</div>
              </div>
            </div>
          )}

          {/* Severity Preview */}
          <div className={`p-3 rounded-lg border ${getSeverityColor(formData.severity)}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                This incident will be classified as: {formData.severity} Severity
              </span>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel - No Incident
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Report Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};