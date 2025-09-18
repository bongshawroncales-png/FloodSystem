import React from 'react';
import { X, MapPin, Calendar, Droplets, FileText, AlertTriangle } from 'lucide-react';
import { FloodReport } from '../types';

interface FloodReportPopupProps {
  report: FloodReport;
  onClose: () => void;
  position: { x: number; y: number };
}

export const FloodReportPopup: React.FC<FloodReportPopupProps> = ({
  report,
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
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm w-80"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-600" />
          Flood Report
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
            <p className="text-sm font-medium text-gray-700">Location</p>
            <p className="text-sm text-gray-600">{report.location}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Date & Time</p>
            <p className="text-sm text-gray-600">{formatDate(report.dateTime)}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Droplets className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Water Depth</p>
            <p className="text-sm text-gray-600">{report.waterDepth}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Water Flow</p>
            <p className="text-sm text-gray-600">{report.waterFlowSpeed}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Access Level</p>
            <p className="text-sm text-gray-600">{report.accessLevel}</p>
          </div>
        </div>

        {report.affectedInfrastructure.length > 0 && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Affected Infrastructure</p>
              <ul className="text-sm text-gray-600">
                {report.affectedInfrastructure.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {report.casualtiesReported && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Casualties Reported</p>
              <p className="text-sm text-red-600">Emergency response may be required</p>
            </div>
          </div>
        )}

        <div className={`px-3 py-2 rounded-lg border ${getRiskColor(report.riskLevel)}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Risk Level: {report.riskLevel}</span>
          </div>
        </div>

        {report.notes && (
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Notes</p>
              <p className="text-sm text-gray-600">{report.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};