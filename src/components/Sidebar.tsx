import React, { useState } from 'react';
import { X, Menu, User, MapPin, Calendar, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { FloodRiskArea } from '../types';

interface SidebarProps {
  floodRiskAreas: FloodRiskArea[];
  onAreaSelect: (area: FloodRiskArea) => void;
  onAreaDelete: (areaId: string) => void;
  isDarkTheme: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  floodRiskAreas,
  onAreaSelect,
  onAreaDelete,
  isDarkTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low': return 'text-blue-600 bg-blue-100';
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Moderate': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Severe': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const panelClasses = isDarkTheme 
    ? 'bg-gray-900/95 backdrop-blur-md border-gray-700/50'
    : 'bg-white/95 backdrop-blur-md border-white/30';
  const textClasses = isDarkTheme ? 'text-white' : 'text-gray-800';
  const buttonClasses = isDarkTheme
    ? 'bg-gray-800/80 hover:bg-gray-700/80'
    : 'bg-white/10 hover:bg-white/20';

  return (
    <>
      {/* Burger Menu Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={`p-3 ${panelClasses} rounded-xl shadow-lg border transition-all duration-200 hover:scale-105`}
        >
          <Menu className={`w-5 h-5 ${textClasses}`} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 ${panelClasses} border-r shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDarkTheme ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-blue-600/20' : 'bg-blue-500/20'}`}>
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className={`${textClasses} font-semibold text-lg tracking-tight`}>
                Oras Flood Risk System
              </h1>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1.5 ${buttonClasses} rounded-lg transition-colors`}
            >
              <X className={`w-4 h-4 ${textClasses}`} />
            </button>
          </div>

          {/* User Account Section */}
          <div className={`p-3 rounded-lg ${isDarkTheme ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <User className={`w-4 h-4 ${textClasses}`} />
              </div>
              <div>
                <p className={`${textClasses} font-medium text-sm`}>Guest User</p>
                <p className={`${textClasses} opacity-75 text-xs`}>Oras, Eastern Samar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Marked Areas List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`${textClasses} font-semibold text-sm`}>Marked Areas</h2>
              <span className={`${textClasses} opacity-75 text-xs bg-gray-500/20 px-2 py-1 rounded-full`}>
                {floodRiskAreas.length}
              </span>
            </div>

            {floodRiskAreas.length === 0 ? (
              <div className={`${textClasses} opacity-75 text-center py-8 text-sm`}>
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No marked areas yet
              </div>
            ) : (
              <div className="space-y-2">
                {floodRiskAreas.map((area) => (
                  <div
                    key={area.id}
                    className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                      isDarkTheme 
                        ? 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50' 
                        : 'bg-white/30 border-gray-200/50 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1"
                        onClick={() => {
                          onAreaSelect(area);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`${textClasses} font-medium text-sm truncate`}>
                            {area.basicInfo.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(area.riskLevel)}`}>
                            {area.riskLevel}
                          </span>
                        </div>
                        
                        <p className={`${textClasses} opacity-75 text-xs capitalize mb-2`}>
                          {area.basicInfo.type.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className={`w-3 h-3 ${textClasses} opacity-50`} />
                            <span className={`${textClasses} opacity-75`}>
                              {formatDate(area.createdAt)}
                            </span>
                          </div>
                          {area.exposure.population > 0 && (
                            <div className="flex items-center gap-1">
                              <User className={`w-3 h-3 ${textClasses} opacity-50`} />
                              <span className={`${textClasses} opacity-75`}>
                                {area.exposure.population.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAreaSelect(area);
                            setIsOpen(false);
                          }}
                          className={`p-1.5 ${buttonClasses} rounded transition-colors`}
                          title="View Details"
                        >
                          <Eye className={`w-3 h-3 ${textClasses}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${area.basicInfo.name}"?`)) {
                              onAreaDelete(area.id!);
                            }
                          }}
                          className={`p-1.5 hover:bg-red-500/20 rounded transition-colors`}
                          title="Delete Area"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className={`p-4 border-t ${isDarkTheme ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-2 rounded ${isDarkTheme ? 'bg-red-600/20' : 'bg-red-100/50'}`}>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className={`${textClasses} opacity-75`}>High Risk</span>
              </div>
              <p className={`${textClasses} font-semibold`}>
                {floodRiskAreas.filter(area => area.riskLevel === 'High' || area.riskLevel === 'Severe').length}
              </p>
            </div>
            <div className={`p-2 rounded ${isDarkTheme ? 'bg-blue-600/20' : 'bg-blue-100/50'}`}>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className={`${textClasses} opacity-75`}>Total Areas</span>
              </div>
              <p className={`${textClasses} font-semibold`}>
                {floodRiskAreas.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};