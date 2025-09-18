import React, { useState } from 'react';
import { X, MapPin, Calendar, Droplets, FileText, AlertTriangle, Eye, Zap, Car, Users } from 'lucide-react';
import { FloodReport, FloodLevel, WaterDepth, WaterFlowSpeed, WaterAppearance, AccessLevel } from '../types';

interface FloodReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<FloodReport, 'id' | 'createdAt'>) => void;
  geometry: any;
  location: string;
}

const WATER_DEPTHS: WaterDepth[] = ['0-6 inches', '6-18 inches', '1.5-3 feet', '3+ feet'];
const WATER_FLOW_SPEEDS: WaterFlowSpeed[] = ['Still/Standing', 'Slow-moving', 'Moderate flow', 'Fast/Rushing'];
const WATER_APPEARANCES: WaterAppearance[] = ['Clear', 'Murky/Brown', 'Muddy', 'Contains debris'];
const ACCESS_LEVELS: AccessLevel[] = [
  'Passable by regular vehicles',
  'Passable by high-clearance vehicles only', 
  'Impassable by land vehicles',
  'Completely impassable'
];

const INFRASTRUCTURE_OPTIONS = [
  'Roads blocked or impassable',
  'Buildings affected (flooding, damage)',
  'Bridges impassable',
  'Power outages in area',
  'Other utilities affected (water, gas, internet)'
];

const calculateRiskLevel = (
  waterDepth: WaterDepth,
  waterFlowSpeed: WaterFlowSpeed,
  accessLevel: AccessLevel,
  casualtiesReported: boolean
): FloodLevel => {
  let score = 0;

  // Water depth scoring
  switch (waterDepth) {
    case '0-6 inches': score += 1; break;
    case '6-18 inches': score += 2; break;
    case '1.5-3 feet': score += 3; break;
    case '3+ feet': score += 4; break;
  }

  // Water flow speed scoring
  switch (waterFlowSpeed) {
    case 'Still/Standing': score += 1; break;
    case 'Slow-moving': score += 2; break;
    case 'Moderate flow': score += 3; break;
    case 'Fast/Rushing': score += 4; break;
  }

  // Access level scoring
  switch (accessLevel) {
    case 'Passable by regular vehicles': score += 1; break;
    case 'Passable by high-clearance vehicles only': score += 2; break;
    case 'Impassable by land vehicles': score += 3; break;
    case 'Completely impassable': score += 4; break;
  }

  // Casualties add significant risk
  if (casualtiesReported) score += 3;

  // Convert score to risk level
  if (score <= 4) return 'Very Low';
  if (score <= 7) return 'Low';
  if (score <= 10) return 'Moderate';
  if (score <= 13) return 'High';
  return 'Severe';
};

export const FloodReportModal: React.FC<FloodReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  geometry,
  location
}) => {
  const [formData, setFormData] = useState({
    location,
    dateTime: new Date().toISOString().slice(0, 16),
    waterDepth: '0-6 inches' as WaterDepth,
    waterFlowSpeed: 'Still/Standing' as WaterFlowSpeed,
    waterAppearance: [] as WaterAppearance[],
    affectedInfrastructure: [] as string[],
    accessLevel: 'Passable by regular vehicles' as AccessLevel,
    casualtiesReported: false,
    notes: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const riskLevel = calculateRiskLevel(
    formData.waterDepth,
    formData.waterFlowSpeed,
    formData.accessLevel,
    formData.casualtiesReported
  );

  const handleWaterAppearanceChange = (appearance: WaterAppearance, checked: boolean) => {
    if (checked) {
      handleInputChange('waterAppearance', [...formData.waterAppearance, appearance]);
    } else {
      handleInputChange('waterAppearance', formData.waterAppearance.filter(a => a !== appearance));
    }
  };

  const handleInfrastructureChange = (infrastructure: string, checked: boolean) => {
    if (checked) {
      handleInputChange('affectedInfrastructure', [...formData.affectedInfrastructure, infrastructure]);
    } else {
      handleInputChange('affectedInfrastructure', formData.affectedInfrastructure.filter(i => i !== infrastructure));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      riskLevel,
      geometry
    });
    onClose();
  };

  if (!isOpen) return null;

  const getRiskColor = (level: FloodLevel) => {
    switch (level) {
      case 'Very Low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      case 'Moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Severe': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Flood Event Report
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Provide detailed information about the flood event to help assess risk levels and inform emergency response efforts.
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => handleInputChange('dateTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Water Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              1. Water Conditions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Estimated Water Depth *
                </label>
                <select
                  value={formData.waterDepth}
                  onChange={(e) => handleInputChange('waterDepth', e.target.value as WaterDepth)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {WATER_DEPTHS.map(depth => (
                    <option key={depth} value={depth}>{depth}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Water Flow Speed *
                </label>
                <select
                  value={formData.waterFlowSpeed}
                  onChange={(e) => handleInputChange('waterFlowSpeed', e.target.value as WaterFlowSpeed)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {WATER_FLOW_SPEEDS.map(speed => (
                    <option key={speed} value={speed}>{speed}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Water Appearance (check all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WATER_APPEARANCES.map(appearance => (
                  <label key={appearance} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.waterAppearance.includes(appearance)}
                      onChange={(e) => handleWaterAppearanceChange(appearance, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{appearance}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              2. Impact Assessment
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Affected Infrastructure (check all that apply)
              </label>
              <div className="space-y-2">
                {INFRASTRUCTURE_OPTIONS.map(infrastructure => (
                  <label key={infrastructure} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.affectedInfrastructure.includes(infrastructure)}
                      onChange={(e) => handleInfrastructureChange(infrastructure, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{infrastructure}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Current Access Level *
              </label>
              <select
                value={formData.accessLevel}
                onChange={(e) => handleInputChange('accessLevel', e.target.value as AccessLevel)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {ACCESS_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.casualtiesReported}
                  onChange={(e) => handleInputChange('casualtiesReported', e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Casualties or injuries reported
                </span>
              </label>
              {formData.casualtiesReported && (
                <p className="text-xs text-red-600 mt-1 ml-6">
                  Please provide details in the description below
                </p>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              3. Additional Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description/Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Provide any additional context, observations, or important details about this flood event. Include information about duration, cause (if known), evacuation status, or other relevant circumstances."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.notes.length}/500 characters
              </p>
            </div>
          </div>

          {/* Risk Level Display */}
          <div className={`px-4 py-3 rounded-lg border ${getRiskColor(riskLevel)}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Calculated Risk Level: {riskLevel}</span>
            </div>
            <p className="text-sm opacity-90">
              Based on water conditions, access level, and safety concerns
            </p>
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
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};