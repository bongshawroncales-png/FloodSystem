import React from 'react';
import { FloodRiskArea } from '../types';

interface HoverTooltipProps {
  area: FloodRiskArea;
  position: { x: number; y: number };
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({ area, position }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Severe': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 max-w-xs pointer-events-none"
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 250),
        top: Math.max(position.y - 10, 10),
      }}
    >
      <div className="space-y-1">
        <div className="font-semibold text-gray-800 text-sm">
          {area.basicInfo.name}
        </div>
        <div className="text-xs text-gray-600 capitalize">
          {area.basicInfo.type.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getRiskColor(area.riskLevel)}`}>
          {area.riskLevel} Risk
        </div>
      </div>
    </div>
  );
};