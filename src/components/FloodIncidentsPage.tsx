import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, Calendar, User, AlertTriangle, Eye, Edit, History, Filter, ChevronDown } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FloodIncident } from '../types';
import { useAuth } from '../hooks/useAuth';

interface FloodIncidentsPageProps {
  onBack: () => void;
}

export const FloodIncidentsPage: React.FC<FloodIncidentsPageProps> = ({ onBack }) => {
  const { user, userRole } = useAuth();
  const [incidents, setIncidents] = useState<FloodIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<FloodIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<FloodIncident | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Confirmed' | 'Resolved'>('All');
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Low' | 'Medium' | 'High' | 'Critical'>('All');

  // Load incidents
  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const incidentsQuery = query(collection(db, 'floodIncidents'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(incidentsQuery);
        const incidentsData: FloodIncident[] = [];
        querySnapshot.forEach((doc) => {
          incidentsData.push({ id: doc.id, ...doc.data() } as FloodIncident);
        });
        setIncidents(incidentsData);
        setFilteredIncidents(incidentsData);
      } catch (error) {
        console.error('Error loading incidents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, []);

  // Filter incidents based on search and filters
  useEffect(() => {
    let filtered = incidents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(incident => incident.status === filterStatus);
    }

    // Severity filter
    if (filterSeverity !== 'All') {
      filtered = filtered.filter(incident => incident.severity === filterSeverity);
    }

    setFilteredIncidents(filtered);
  }, [incidents, searchTerm, filterStatus, filterSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Resolved': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditIncident = async (updatedIncident: Partial<FloodIncident>) => {
    if (!selectedIncident || !user) return;

    try {
      const editHistory = selectedIncident.editHistory || [];
      const newEdit = {
        editedAt: new Date().toISOString(),
        editedBy: {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName!
        },
        changes: Object.keys(updatedIncident).join(', ')
      };

      await updateDoc(doc(db, 'floodIncidents', selectedIncident.id!), {
        ...updatedIncident,
        editHistory: [...editHistory, newEdit]
      });

      // Update local state
      const updatedIncidents = incidents.map(incident =>
        incident.id === selectedIncident.id
          ? { ...incident, ...updatedIncident, editHistory: [...editHistory, newEdit] }
          : incident
      );
      setIncidents(updatedIncidents);
      setSelectedIncident({ ...selectedIncident, ...updatedIncident, editHistory: [...editHistory, newEdit] });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Failed to update incident');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flood incidents...</p>
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
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Flood Incidents</h1>
                  <p className="text-sm text-gray-600">Recorded flood incidents and reports</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">Total Incidents: {incidents.length}</p>
              <p className="text-xs text-gray-600">
                Pending: {incidents.filter(i => i.status === 'Pending').length} | 
                Confirmed: {incidents.filter(i => i.status === 'Confirmed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search incidents by title, location, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Resolved">Resolved</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Severity Filter */}
            <div className="relative">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Severity</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No incidents found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'All' || filterSeverity !== 'All'
                  ? 'Try adjusting your search or filters'
                  : 'No flood incidents have been reported yet'}
              </p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div key={incident.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{incident.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{incident.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {incident.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {incident.reportedBy.displayName}
                      </div>
                      {incident.affectedPopulation && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {incident.affectedPopulation} affected
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {(userRole === 'admin' || userRole === 'authorized') && (
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setIsEditing(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Incident"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Incident Detail/Edit Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {isEditing ? 'Edit Incident' : 'Incident Details'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedIncident.title}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedIncident.editHistory && selectedIncident.editHistory.length > 0 && (
                  <button
                    onClick={() => setShowEditHistory(!showEditHistory)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit History"
                  >
                    <History className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedIncident(null);
                    setIsEditing(false);
                    setShowEditHistory(false);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {isEditing ? (
                <IncidentEditForm
                  incident={selectedIncident}
                  onSave={handleEditIncident}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <IncidentDetailsView
                  incident={selectedIncident}
                  showEditHistory={showEditHistory}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Incident Details View Component
const IncidentDetailsView: React.FC<{ incident: FloodIncident; showEditHistory: boolean }> = ({
  incident,
  showEditHistory
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Resolved': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${getSeverityColor(incident.severity)}`}>
            {incident.severity}
          </span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${getStatusColor(incident.status)}`}>
            {incident.status}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{incident.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <p className="text-gray-600">{incident.location}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Affected Population</label>
          <p className="text-gray-600">{incident.affectedPopulation || 'Not specified'}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
        <p className="text-gray-600">{incident.reportedBy.displayName} ({incident.reportedBy.email})</p>
        <p className="text-sm text-gray-500">on {new Date(incident.createdAt).toLocaleString()}</p>
      </div>

      {incident.confirmedBy && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmed By</label>
          <p className="text-gray-600">{incident.confirmedBy.displayName} ({incident.confirmedBy.email})</p>
          <p className="text-sm text-gray-500">on {new Date(incident.confirmedAt!).toLocaleString()}</p>
        </div>
      )}

      {/* Edit History */}
      {showEditHistory && incident.editHistory && incident.editHistory.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Edit History</label>
          <div className="space-y-2">
            {incident.editHistory.map((edit, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{edit.editedBy.displayName}</span>
                  <span className="text-xs text-gray-500">{new Date(edit.editedAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">Modified: {edit.changes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Incident Edit Form Component
const IncidentEditForm: React.FC<{
  incident: FloodIncident;
  onSave: (updates: Partial<FloodIncident>) => void;
  onCancel: () => void;
}> = ({ incident, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    affectedPopulation: incident.affectedPopulation || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Affected Population</label>
        <input
          type="number"
          value={formData.affectedPopulation}
          onChange={(e) => setFormData(prev => ({ ...prev, affectedPopulation: Number(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="0"
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};