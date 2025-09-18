import React, { useState } from 'react';
import { X, Menu, User, MapPin, Calendar, AlertTriangle, Eye, Trash2, LogIn, LogOut, Shield, FileText, Settings, BarChart3, Users, Home, Search, Filter } from 'lucide-react';
import { FloodRiskArea } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ConfirmationModal } from './ConfirmationModal';

interface SidebarProps {
  floodRiskAreas: FloodRiskArea[];
  onAreaSelect: (area: FloodRiskArea) => void;
  onAreaDelete: (areaId: string) => void;
  isDarkTheme: boolean;
  onShowAuth: () => void;
  onShowAdmin: () => void;
  onShowIncidents: () => void;
  onShowAnalytics: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  floodRiskAreas,
  onAreaSelect,
  onAreaDelete,
  isDarkTheme,
  onShowAuth,
  onShowAdmin,
  onShowIncidents
  onShowAnalytics
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    areaId: string;
    areaName: string;
  }>({
    isOpen: false,
    areaId: '',
    areaName: ''
  });
  const { user, userRole, loading, signInWithGoogle, logout } = useAuth();

  const handleDeleteClick = (areaId: string, areaName: string) => {
    // Check permissions before showing delete confirmation
    if (userRole !== 'admin' && userRole !== 'authorized') {
      return; // Don't show delete option for regular users
    }
    
    setDeleteConfirmation({
      isOpen: true,
      areaId,
      areaName
    });
  };

  const handleDeleteConfirm = () => {
    onAreaDelete(deleteConfirmation.areaId);
    setDeleteConfirmation({
      isOpen: false,
      areaId: '',
      areaName: ''
    });
  };

  // Filter areas based on search query
  const filteredAreas = floodRiskAreas.filter(area =>
    area.basicInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.basicInfo.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.riskLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );
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

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      action: () => setActiveSection('dashboard')
    },
    {
      id: 'incidents',
      label: 'Flood Records',
      icon: FileText,
      badge: floodRiskAreas.filter(area => area.riskLevel === 'High' || area.riskLevel === 'Severe').length,
      action: () => {
        onShowIncidents();
        setIsOpen(false);
      }
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      action: () => {
        onShowAnalytics();
        setIsOpen(false);
      }
    }
  ];

  const adminItems = [
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      action: () => {
        onShowAdmin();
        setIsOpen(false);
      }
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      action: () => setActiveSection('settings')
    }
  ];

  return (
    <>
      {/* Burger Menu Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 transition-all duration-200 hover:scale-105 hover:shadow-xl"
        >
          <Menu className="w-5 h-5 text-gray-700" />
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
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900 font-bold text-lg tracking-tight">
                  Kalaw Flood Monitoring
                </h1>
                <p className="text-gray-500 text-xs">
                  Kalaw, Oras, Eastern Samar
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Main Menu Items */}
            <div className="space-y-1 mb-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Marked Areas Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Marked Areas
                </h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {filteredAreas.length}
                </span>
              </div>

              {/* Search Bar for Areas */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search marked areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {floodRiskAreas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No marked areas yet</p>
                </div>
              ) : filteredAreas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No areas match your search</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-600 text-xs mt-1 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAreas.map((area) => (
                    <div
                      key={area.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            onAreaSelect(area);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-gray-900 font-medium text-sm truncate">
                              {area.basicInfo.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(area.riskLevel)}`}>
                              {area.riskLevel}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-xs capitalize mb-2">
                            {area.basicInfo.type.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(area.createdAt)}</span>
                            </div>
                            {area.exposure.population > 0 && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{area.exposure.population.toLocaleString()}</span>
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
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                          </button>
                          {(userRole === 'admin' || userRole === 'authorized') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(area.id!, area.basicInfo.name);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded transition-colors"
                              title="Delete Area"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Section */}
            {(userRole === 'admin' || userRole === 'authorized') && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                <div className="space-y-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Account Section */}
        <div className="border-t border-gray-100 p-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {user.email}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {userRole === 'admin' ? 'Administrator' : userRole === 'authorized' ? 'Authorized User' : 'User'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Guest User</p>
                  <p className="text-gray-500 text-xs">Kalaw, Oras, Eastern Samar</p>
                </div>
              </div>
              <button
                onClick={onShowAuth}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-gray-100 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span className="text-red-600 text-xs font-medium">High Risk</span>
              </div>
              <p className="text-red-900 font-bold text-lg">
                {floodRiskAreas.filter(area => area.riskLevel === 'High' || area.riskLevel === 'Severe').length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span className="text-blue-600 text-xs font-medium">Total Areas</span>
              </div>
              <p className="text-blue-900 font-bold text-lg">
                {floodRiskAreas.length}
              </p>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, areaId: '', areaName: '' })}
          onConfirm={handleDeleteConfirm}
          title="Delete Flood Risk Area"
          message={`Are you sure you want to delete "${deleteConfirmation.areaName}"? This action cannot be undone and will permanently remove all associated data.`}
          type="delete"
          confirmText="Delete Area"
          cancelText="Keep Area"
        />
      </div>
    </>
  );
};