import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X, MapPin, Users, Calendar, Eye } from 'lucide-react';
import { FloodRiskArea } from '../types';

interface AlertNotificationSystemProps {
  floodRiskAreas: FloodRiskArea[];
  onShowIncidentModal: (area: FloodRiskArea) => void;
  onViewArea: (area: FloodRiskArea) => void;
  userRole: string;
  isDarkTheme: boolean;
}

export const AlertNotificationSystem: React.FC<AlertNotificationSystemProps> = ({
  floodRiskAreas,
  onShowIncidentModal,
  onViewArea,
  userRole,
  isDarkTheme
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);

  // Get high and severe risk areas
  const highRiskAreas = floodRiskAreas.filter(area => 
    area.riskLevel === 'High' || area.riskLevel === 'Severe'
  );

  // Check for new high/severe risk areas
  useEffect(() => {
    if (highRiskAreas.length > 0) {
      setHasNewAlerts(true);
      // Auto-expand if there are severe risks
      const severeRisks = highRiskAreas.filter(area => area.riskLevel === 'Severe');
      if (severeRisks.length > 0) {
        setIsExpanded(true);
      }
    }
  }, [highRiskAreas.length]);

  const handleAlertClick = () => {
    setIsExpanded(!isExpanded);
    setHasNewAlerts(false);
  };

  const handleViewDetails = () => {
    setShowModal(true);
    setIsExpanded(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'Severe': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-orange-500';
      case 'Severe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (highRiskAreas.length === 0) return null;

  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/95 backdrop-blur-md border-gray-700/50'
    : 'bg-white/95 backdrop-blur-md border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-gray-800';

  return (
    <>
      {/* Alert Notification */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`${panelClasses} rounded-xl shadow-lg border transition-all duration-300 ${
          isExpanded ? 'w-96' : 'w-80'
        }`}>
          {/* Alert Header */}
          <button
            onClick={handleAlertClick}
            className={`w-full p-4 flex items-center justify-between ${textClasses} hover:opacity-80 transition-opacity`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                highRiskAreas.some(area => area.riskLevel === 'Severe') 
                  ? 'bg-red-500/20' 
                  : 'bg-orange-500/20'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  highRiskAreas.some(area => area.riskLevel === 'Severe') 
                    ? 'text-red-400' 
                    : 'text-orange-400'
                } ${hasNewAlerts ? 'animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">
                  {highRiskAreas.some(area => area.riskLevel === 'Severe') 
                    ? 'Severe Flood Risk Alert' 
                    : 'High Flood Risk Alert'}
                </div>
                <div className="text-xs opacity-75">
                  {highRiskAreas.length} area{highRiskAreas.length > 1 ? 's' : ''} detected
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasNewAlerts && (
                <div className="w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <div className={`px-4 pb-4 border-t ${isDarkTheme ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
              <div className="space-y-2 mt-3">
                {highRiskAreas.slice(0, 3).map((area) => (
                  <div
                    key={area.id}
                    className={`p-3 rounded-lg border ${isDarkTheme ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`${textClasses} font-medium text-sm`}>
                            {area.basicInfo.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(area.riskLevel)}`}>
                            {area.riskLevel}
                          </span>
                        </div>
                        <p className={`${textClasses} text-xs opacity-75 capitalize`}>
                          {area.basicInfo.type} • {area.exposure.population} people
                        </p>
                      </div>
                      <button
                        onClick={() => onViewArea(area)}
                        className={`p-1.5 ${isDarkTheme ? 'hover:bg-gray-700/50' : 'hover:bg-white/50'} rounded transition-colors`}
                        title="View on map"
                      >
                        <Eye className={`w-3 h-3 ${textClasses}`} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {highRiskAreas.length > 3 && (
                  <div className={`${textClasses} text-xs text-center opacity-75 py-1`}>
                    +{highRiskAreas.length - 3} more areas
                  </div>
                )}
                
                <button
                  onClick={handleViewDetails}
                  className={`w-full mt-3 px-4 py-2 ${
                    highRiskAreas.some(area => area.riskLevel === 'Severe') 
                      ? 'bg-red-500/80 hover:bg-red-500' 
                      : 'bg-orange-500/80 hover:bg-orange-500'
                  } text-white rounded-lg text-sm font-medium transition-colors`}
                >
                  View All High Risk Areas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High Risk Areas Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  High Risk Areas Alert
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {highRiskAreas.length} area{highRiskAreas.length > 1 ? 's' : ''} requiring attention
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {highRiskAreas.map((area) => (
                  <div
                    key={area.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-800">
                            {area.basicInfo.name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(area.riskLevel)}`}>
                            {area.riskLevel} Risk
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="capitalize">{area.basicInfo.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{area.exposure.population.toLocaleString()} people</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(area.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Elevation: {area.physical.elevation}m</span>
                          </div>
                        </div>

                        {area.weather.rainfall > 0 && (
                          <div className="text-sm text-gray-600 mb-3">
                            <strong>Current conditions:</strong> {area.weather.rainfall}mm/hr rainfall, 
                            {area.weather.windSpeed}km/h winds
                          </div>
                        )}

                        {area.hydrological.floodHistory.hasFlooded && (
                          <div className="text-sm text-orange-600 mb-3">
                            <strong>Flood history:</strong> Previous flooding recorded 
                            (Max depth: {area.hydrological.floodHistory.maxDepth}m)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => onViewArea(area)}
                        className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        View on Map
                      </button>
                      
                      {(userRole === 'admin' || userRole === 'authorized') && (
                        <button
                          onClick={() => {
                            onShowIncidentModal(area);
                            setShowModal(false);
                          }}
                          className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                            area.riskLevel === 'Severe' 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-orange-600 hover:bg-orange-700'
                          }`}
                        >
                          Report Flood Incident
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <strong>Severe:</strong> {highRiskAreas.filter(a => a.riskLevel === 'Severe').length} • 
                  <strong className="ml-2">High:</strong> {highRiskAreas.filter(a => a.riskLevel === 'High').length}
                </div>
                {userRole === 'user' && (
                  <div className="text-xs text-gray-500">
                    Contact authorized personnel to report incidents
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};