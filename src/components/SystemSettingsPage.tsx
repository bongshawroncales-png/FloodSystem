import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Save, RefreshCw, Bell, Map, Shield, Database, Eye, EyeOff, AlertTriangle, CheckCircle, Globe, Clock, Zap } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

interface SystemSettingsPageProps {
  onBack: () => void;
}

interface SystemSettings {
  // Monitoring Settings
  riskUpdateInterval: number; // minutes
  weatherUpdateInterval: number; // minutes
  alertThreshold: 'High' | 'Severe';
  autoRiskCalculation: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSounds: boolean;
  notificationFrequency: 'immediate' | 'hourly' | 'daily';
  
  // Map Settings
  defaultZoom: number;
  defaultBasemap: 'satellite' | 'streets' | 'terrain' | 'topographic' | 'dark';
  showWeatherPanel: boolean;
  showLiveMonitor: boolean;
  animateHighRisk: boolean;
  
  // Data Settings
  dataRetentionDays: number;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  
  // Security Settings
  sessionTimeout: number; // minutes
  requireTwoFactor: boolean;
  passwordExpiry: number; // days
  
  // System Info
  lastUpdated: string;
  version: string;
}

const defaultSettings: SystemSettings = {
  riskUpdateInterval: 5,
  weatherUpdateInterval: 10,
  alertThreshold: 'High',
  autoRiskCalculation: true,
  emailNotifications: true,
  pushNotifications: true,
  alertSounds: true,
  notificationFrequency: 'immediate',
  defaultZoom: 17,
  defaultBasemap: 'satellite',
  showWeatherPanel: true,
  showLiveMonitor: true,
  animateHighRisk: true,
  dataRetentionDays: 365,
  autoBackup: true,
  backupFrequency: 'weekly',
  sessionTimeout: 60,
  requireTwoFactor: false,
  passwordExpiry: 90,
  lastUpdated: new Date().toISOString(),
  version: '1.0.0'
};

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({ onBack }) => {
  const { user, userRole } = useAuth();

  // All hooks must be called unconditionally at the top level
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'notifications' | 'map' | 'data' | 'security' | 'system'>('monitoring');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settingsDoc = await getDoc(doc(db, 'systemSettings', 'main'));
        if (settingsDoc.exists()) {
          setSettings({ ...defaultSettings, ...settingsDoc.data() });
        }
      } catch (error) {
        console.error('Error loading system settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Check if user is admin - after all hooks are called
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access system settings.</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const updatedSettings = {
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'systemSettings', 'main'), updatedSettings);
      setSettings(updatedSettings);
      setSaveStatus('success');
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving system settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      setSettings(defaultSettings);
    }
  };

  const tabs = [
    { id: 'monitoring', label: 'Monitoring', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'map', label: 'Map Settings', icon: Map },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System Info', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system settings...</p>
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
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">System Settings</h1>
                  <p className="text-sm text-gray-600">Configure system behavior and preferences</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Settings saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Save failed</span>
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 inline mr-2" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Monitoring Settings */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Monitoring Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risk Update Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.riskUpdateInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, riskUpdateInterval: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="60"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to update risk levels automatically</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weather Update Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.weatherUpdateInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, weatherUpdateInterval: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="120"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to fetch weather data</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold
                  </label>
                  <select
                    value={settings.alertThreshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, alertThreshold: e.target.value as 'High' | 'Severe' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High Risk and Above</option>
                    <option value="Severe">Severe Risk Only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Minimum risk level to trigger alerts</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoRiskCalculation}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoRiskCalculation: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Enable automatic risk calculation
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-800">Email Notifications</h3>
                    <p className="text-sm text-gray-600">Receive alerts via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-800">Push Notifications</h3>
                    <p className="text-sm text-gray-600">Browser push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-800">Alert Sounds</h3>
                    <p className="text-sm text-gray-600">Play sound for critical alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.alertSounds}
                    onChange={(e) => setSettings(prev => ({ ...prev, alertSounds: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Frequency
                  </label>
                  <select
                    value={settings.notificationFrequency}
                    onChange={(e) => setSettings(prev => ({ ...prev, notificationFrequency: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly Summary</option>
                    <option value="daily">Daily Summary</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Map Settings */}
          {activeTab === 'map' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Map Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Zoom Level
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    value={settings.defaultZoom}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultZoom: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>10 (Far)</span>
                    <span>Current: {settings.defaultZoom}</span>
                    <span>20 (Close)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Basemap
                  </label>
                  <select
                    value={settings.defaultBasemap}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultBasemap: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="satellite">Satellite</option>
                    <option value="streets">Streets</option>
                    <option value="terrain">Terrain</option>
                    <option value="topographic">Topographic</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showWeatherPanel}
                    onChange={(e) => setSettings(prev => ({ ...prev, showWeatherPanel: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show weather panel by default
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showLiveMonitor}
                    onChange={(e) => setSettings(prev => ({ ...prev, showLiveMonitor: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show live risk monitor by default
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.animateHighRisk}
                    onChange={(e) => setSettings(prev => ({ ...prev, animateHighRisk: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Animate high-risk areas (flashing effect)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Data Management */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Data Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Retention Period (days)
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetentionDays}
                    onChange={(e) => setSettings(prev => ({ ...prev, dataRetentionDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="30"
                    max="3650"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long to keep historical data</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings(prev => ({ ...prev, backupFrequency: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Enable automatic data backup
                </label>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Security Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="15"
                    max="480"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) => setSettings(prev => ({ ...prev, passwordExpiry: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="30"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">Force password change interval</p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.requireTwoFactor}
                  onChange={(e) => setSettings(prev => ({ ...prev, requireTwoFactor: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Require two-factor authentication for admin users
                </label>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">OpenWeatherMap API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={import.meta.env.VITE_OPENWEATHER_API_KEY || 'Not configured'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Configure in environment variables (.env file)
                </p>
              </div>
            </div>
          )}

          {/* System Info */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">System Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Application Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-medium">{settings.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">
                        {new Date(settings.lastUpdated).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Environment:</span>
                      <span className="font-medium">Production</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Database Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Firebase Connected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Authentication Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${import.meta.env.VITE_OPENWEATHER_API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Weather API {import.meta.env.VITE_OPENWEATHER_API_KEY ? 'Connected' : 'Not Configured'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-2">About Kalaw Flood Monitoring System</h3>
                <p className="text-sm text-blue-700">
                  A comprehensive flood risk monitoring and management system for Kalaw, Oras, Eastern Samar. 
                  This system provides real-time flood risk assessment, weather monitoring, incident reporting, 
                  and community alert capabilities to help protect lives and property.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};