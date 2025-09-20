import React from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ErrorNotificationProps {
  error: string | null;
  success: string | null;
  onClearError: () => void;
  onClearSuccess: () => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  success,
  onClearError,
  onClearSuccess
}) => {
  if (!error && !success) return null;

  return (
    <div className="mb-6 space-y-2">
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={onClearError}
            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-800 text-sm font-medium">{success}</span>
          </div>
          <button
            onClick={onClearSuccess}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      )}
    </div>
  );
};