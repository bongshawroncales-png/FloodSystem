import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, Calendar, User, AlertTriangle, Eye, Edit, History, Filter, ChevronDown, Trash2, Download, Users, Home, Cloud, Shield } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FloodIncident } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ConfirmationModal } from './ConfirmationModal';

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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    incidentId: string;
    incidentTitle: string;
  }>({
    isOpen: false,
    incidentId: '',
    incidentTitle: ''
  });

  // Delete incident
  const handleDeleteClick = (incidentId: string, incidentTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      incidentId,
      incidentTitle
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'floodIncidents', deleteConfirmation.incidentId));
      setIncidents(prev => prev.filter(incident => incident.id !== deleteConfirmation.incidentId));
      
      // Close modal if the deleted incident was selected
      if (selectedIncident?.id === deleteConfirmation.incidentId) {
        setSelectedIncident(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Failed to delete incident. Please try again.');
    }
    
    setDeleteConfirmation({
      isOpen: false,
      incidentId: '',
      incidentTitle: ''
    });
  };

  // Generate and download PDF report
  const generatePDFReport = (incident: FloodIncident) => {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Flood Incident Report - ${incident.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { margin-left: 10px; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-confirmed { background-color: #d1fae5; color: #065f46; }
          .status-resolved { background-color: #dbeafe; color: #1e40af; }
          .severity-low { background-color: #d1fae5; color: #065f46; }
          .severity-medium { background-color: #fef3c7; color: #92400e; }
          .severity-high { background-color: #fed7aa; color: #9a3412; }
          .severity-critical { background-color: #fecaca; color: #991b1b; }
          .list-item { margin: 5px 0; padding-left: 15px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FLOOD INCIDENT REPORT</h1>
          <p><strong>Kalaw Flood Monitoring System</strong></p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>📍 Core Incident Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Incident ID:</span>
              <span class="info-value">${incident.incidentId || incident.id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Title:</span>
              <span class="info-value">${incident.title}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Severity:</span>
              <span class="info-value status-badge severity-${incident.severity.toLowerCase()}">${incident.severity}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value status-badge status-${incident.status.toLowerCase()}">${incident.status}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Location:</span>
              <span class="info-value">${incident.location}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Barangay:</span>
              <span class="info-value">${incident.barangay || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Municipality:</span>
              <span class="info-value">${incident.municipality || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Province:</span>
              <span class="info-value">${incident.province || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">GPS Coordinates:</span>
              <span class="info-value">${incident.gpsCoordinates || 'Not available'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cause/Trigger:</span>
              <span class="info-value">${incident.cause || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Onset Date/Time:</span>
              <span class="info-value">${incident.onsetDateTime ? new Date(incident.onsetDateTime).toLocaleString() : 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">End Date/Time:</span>
              <span class="info-value">${incident.endDateTime ? new Date(incident.endDateTime).toLocaleString() : 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Flood Depth:</span>
              <span class="info-value">${incident.floodDepth ? incident.floodDepth + 'm' : 'Not measured'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Duration:</span>
              <span class="info-value">${incident.duration || 'Not specified'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Area Extent:</span>
              <span class="info-value">${incident.areaExtent || 'Not specified'}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">Description:</span>
            <div style="margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
              ${incident.description}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>👥 Human Impact</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Total Population Affected:</span>
              <span class="info-value">${incident.affectedPopulation || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Evacuated/Displaced People:</span>
              <span class="info-value">${incident.evacuatedPeople || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Casualties - Dead:</span>
              <span class="info-value">${incident.casualties?.dead || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Casualties - Missing:</span>
              <span class="info-value">${incident.casualties?.missing || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Casualties - Injured:</span>
              <span class="info-value">${incident.casualties?.injured || 0}</span>
            </div>
          </div>
          ${incident.vulnerableGroupsAffected && incident.vulnerableGroupsAffected.length > 0 ? `
            <div class="info-item">
              <span class="info-label">Vulnerable Groups Affected:</span>
              <div style="margin-top: 5px;">
                ${incident.vulnerableGroupsAffected.map(group => `<div class="list-item">• ${group}</div>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>🏠 Property & Infrastructure Impact</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Houses Damaged:</span>
              <span class="info-value">${incident.housesDamaged || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Houses Destroyed:</span>
              <span class="info-value">${incident.housesDestroyed || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Economic Damages:</span>
              <span class="info-value">${incident.economicDamages ? '₱' + incident.economicDamages.toLocaleString() : 'Not assessed'}</span>
            </div>
          </div>
          ${incident.infrastructureAffected && incident.infrastructureAffected.length > 0 ? `
            <div class="info-item">
              <span class="info-label">Infrastructure Affected:</span>
              <div style="margin-top: 5px;">
                ${incident.infrastructureAffected.map(infra => `<div class="list-item">• ${infra}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${incident.agricultureLosses ? `
            <div class="info-item">
              <span class="info-label">Agriculture & Livelihood Losses:</span>
              <div style="margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
                ${incident.agricultureLosses}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>🌧️ Environmental & Weather Context</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Rainfall Data:</span>
              <span class="info-value">${incident.rainfallData || 'Not available'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">River Level:</span>
              <span class="info-value">${incident.riverLevel || 'Not monitored'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Weather Event:</span>
              <span class="info-value">${incident.weatherEvent || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🚨 Response & Actions</h2>
          ${incident.respondingAgencies && incident.respondingAgencies.length > 0 ? `
            <div class="info-item">
              <span class="info-label">Responding Agencies:</span>
              <div style="margin-top: 5px;">
                ${incident.respondingAgencies.map(agency => `<div class="list-item">• ${agency}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${incident.evacuationCenters ? `
            <div class="info-item">
              <span class="info-label">Evacuation Centers Used:</span>
              <div style="margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
                ${incident.evacuationCenters}
              </div>
            </div>
          ` : ''}
          ${incident.reliefProvided ? `
            <div class="info-item">
              <span class="info-label">Relief Provided:</span>
              <div style="margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
                ${incident.reliefProvided}
              </div>
            </div>
          ` : ''}
          ${incident.challengesEncountered ? `
            <div class="info-item">
              <span class="info-label">Challenges Encountered:</span>
              <div style="margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
                ${incident.challengesEncountered}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>📋 Report Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Reported By:</span>
              <span class="info-value">${incident.reportedBy.displayName} (${incident.reportedBy.email})</span>
            </div>
            <div class="info-item">
              <span class="info-label">Report Date:</span>
              <span class="info-value">${new Date(incident.createdAt).toLocaleString()}</span>
            </div>
            ${incident.confirmedBy ? `
              <div class="info-item">
                <span class="info-label">Confirmed By:</span>
                <span class="info-value">${incident.confirmedBy.displayName} (${incident.confirmedBy.email})</span>
              </div>
              <div class="info-item">
                <span class="info-label">Confirmation Date:</span>
                <span class="info-value">${new Date(incident.confirmedAt!).toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>This report was generated by the Oras Eastern Samar Flood Risk System</p>
          <p>For official use and disaster response coordination</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Flood_Incident_Report_${incident.incidentId || incident.id}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
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
        changes: `Updated: ${Object.keys(updatedIncident).filter(key => key !== 'editHistory').join(', ')}`
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
      
      // Show success message
      alert('Incident updated successfully!');
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
                    <button
                      onClick={() => generatePDFReport(incident)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Download PDF Report"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {(userRole === 'admin' || userRole === 'authorized') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedIncident(incident);
                            setIsEditing(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Incident"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(incident.id!, incident.title)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Incident"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, incidentId: '', incidentTitle: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Flood Incident"
        message={`Are you sure you want to delete the incident "${deleteConfirmation.incidentTitle}"? This action cannot be undone and will permanently remove all incident data including reports and documentation.`}
        type="delete"
        confirmText="Delete Incident"
        cancelText="Keep Incident"
      />
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
    <div className="space-y-6 max-h-96 overflow-y-auto modal-scrollbar">
      {/* Core Incident Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">📍 Core Incident Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident ID</label>
            <p className="text-gray-600">{incident.incidentId || incident.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <p className="text-gray-600">{incident.title}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
            <p className="text-gray-600">{incident.barangay || 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
            <p className="text-gray-600">{incident.municipality || 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <p className="text-gray-600">{incident.province || 'Not specified'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Onset Date/Time</label>
            <p className="text-gray-600">{incident.onsetDateTime ? new Date(incident.onsetDateTime).toLocaleString() : 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
            <p className="text-gray-600">{incident.endDateTime ? new Date(incident.endDateTime).toLocaleString() : 'Not specified'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cause/Trigger</label>
            <p className="text-gray-600">{incident.cause || 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flood Depth</label>
            <p className="text-gray-600">{incident.floodDepth ? `${incident.floodDepth}m` : 'Not measured'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <p className="text-gray-600">{incident.duration || 'Not specified'}</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area Extent</label>
          <p className="text-gray-600">{incident.areaExtent || 'Not specified'}</p>
        </div>
      </div>
      
      {/* Human Impact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">👥 Human Impact</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Population Affected</label>
            <p className="text-gray-600">{incident.affectedPopulation || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evacuated People</label>
            <p className="text-gray-600">{incident.evacuatedPeople || 0}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dead</label>
            <p className="text-gray-600">{incident.casualties?.dead || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Missing</label>
            <p className="text-gray-600">{incident.casualties?.missing || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Injured</label>
            <p className="text-gray-600">{incident.casualties?.injured || 0}</p>
          </div>
        </div>
        
        {incident.vulnerableGroupsAffected && incident.vulnerableGroupsAffected.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vulnerable Groups Affected</label>
            <div className="flex flex-wrap gap-1">
              {incident.vulnerableGroupsAffected.map((group, index) => (
                <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  {group}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Property & Infrastructure Impact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">🏠 Property & Infrastructure Impact</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Houses Damaged</label>
            <p className="text-gray-600">{incident.housesDamaged || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Houses Destroyed</label>
            <p className="text-gray-600">{incident.housesDestroyed || 0}</p>
          </div>
        </div>
        
        {incident.infrastructureAffected && incident.infrastructureAffected.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Infrastructure Affected</label>
            <div className="flex flex-wrap gap-1">
              {incident.infrastructureAffected.map((infra, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                  {infra}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {incident.agricultureLosses && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agriculture & Livelihood Losses</label>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{incident.agricultureLosses}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Economic Damages</label>
          <p className="text-gray-600">{incident.economicDamages ? `₱${incident.economicDamages.toLocaleString()}` : 'Not assessed'}</p>
        </div>
      </div>
      
      {/* Environmental & Weather Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">🌧️ Environmental & Weather Context</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rainfall Data</label>
            <p className="text-gray-600">{incident.rainfallData || 'Not available'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">River Level</label>
            <p className="text-gray-600">{incident.riverLevel || 'Not monitored'}</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weather Event</label>
          <p className="text-gray-600">{incident.weatherEvent || 'Not specified'}</p>
        </div>
      </div>
      
      {/* Response & Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">🚨 Response & Actions</h3>
        
        {incident.respondingAgencies && incident.respondingAgencies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responding Agencies</label>
            <div className="flex flex-wrap gap-1">
              {incident.respondingAgencies.map((agency, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {agency}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {incident.evacuationCenters && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evacuation Centers</label>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{incident.evacuationCenters}</p>
          </div>
        )}
        
        {incident.reliefProvided && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relief Provided</label>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{incident.reliefProvided}</p>
          </div>
        )}
        
        {incident.challengesEncountered && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Challenges Encountered</label>
            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{incident.challengesEncountered}</p>
          </div>
        )}
      </div>
      
      {/* Status and Basic Information */}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">GPS Coordinates</label>
        <p className="text-gray-600">{incident.gpsCoordinates || 'Not available'}</p>
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
  const [activeSection, setActiveSection] = useState(0);
  const [formData, setFormData] = useState({
    // Core Details
    title: incident.title,
    description: incident.description,
    location: incident.location,
    barangay: incident.barangay || '',
    municipality: incident.municipality || '',
    province: incident.province || '',
    onsetDateTime: incident.onsetDateTime || '',
    endDateTime: incident.endDateTime || '',
    cause: incident.cause || 'Heavy rainfall',
    severity: incident.severity,
    floodDepth: incident.floodDepth || 0,
    duration: incident.duration || '',
    areaExtent: incident.areaExtent || '',
    
    // Human Impact
    casualties: {
      dead: incident.casualties?.dead || 0,
      missing: incident.casualties?.missing || 0,
      injured: incident.casualties?.injured || 0
    },
    evacuatedPeople: incident.evacuatedPeople || 0,
    vulnerableGroupsAffected: incident.vulnerableGroupsAffected || [],
    
    // Property Impact
    housesDamaged: incident.housesDamaged || 0,
    housesDestroyed: incident.housesDestroyed || 0,
    infrastructureAffected: incident.infrastructureAffected || [],
    agricultureLosses: incident.agricultureLosses || '',
    economicDamages: incident.economicDamages || 0,
    
    // Environmental Context
    rainfallData: incident.rainfallData || '',
    riverLevel: incident.riverLevel || '',
    weatherEvent: incident.weatherEvent || '',
    
    // Response
    respondingAgencies: incident.respondingAgencies || [],
    evacuationCenters: incident.evacuationCenters || '',
    reliefProvided: incident.reliefProvided || '',
    challengesEncountered: incident.challengesEncountered || '',
    
    // Status
    status: incident.status,
    affectedPopulation: incident.affectedPopulation || 0
  });

  const sections = [
    { title: 'Core Details', icon: AlertTriangle },
    { title: 'Human Impact', icon: Users },
    { title: 'Property & Infrastructure', icon: Home },
    { title: 'Environmental Context', icon: Cloud },
    { title: 'Response & Actions', icon: Shield }
  ];

  const FLOOD_CAUSES = [
    'Heavy rainfall',
    'Dam release',
    'Storm surge',
    'Typhoon',
    'Super Typhoon',
    'Monsoon',
    'River overflow',
    'Flash flood',
    'Coastal flooding',
    'Other'
  ];

  const VULNERABLE_GROUPS = [
    'Children (0-12 years)',
    'Elderly (60+ years)',
    'Persons with Disabilities (PWDs)',
    'Pregnant women',
    'Infants and toddlers',
    'Chronically ill persons',
    'Indigenous peoples'
  ];

  const INFRASTRUCTURE_TYPES = [
    'Roads',
    'Bridges',
    'Schools',
    'Hospitals',
    'Health centers',
    'Power supply',
    'Water supply',
    'Communication towers',
    'Government buildings',
    'Markets',
    'Churches',
    'Ports/Airports'
  ];

  const RESPONDING_AGENCIES = [
    'Local Government Unit (LGU)',
    'NDRRMC',
    'Philippine Red Cross',
    'DSWD',
    'DOH',
    'PNP',
    'AFP',
    'BFP',
    'Coast Guard',
    'DPWH',
    'NGOs',
    'Volunteers'
  ];

  const handleArrayFieldChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 -mx-6 px-6 py-3">
        <div className="flex overflow-x-auto">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSection(index)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSection === index
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="max-h-96 overflow-y-auto modal-scrollbar">
        {/* Section 0: Core Details */}
        {activeSection === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barangay
                </label>
                <input
                  type="text"
                  value={formData.barangay}
                  onChange={(e) => setFormData(prev => ({ ...prev, barangay: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Municipality
                </label>
                <input
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => setFormData(prev => ({ ...prev, municipality: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Onset Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.onsetDateTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, onsetDateTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cause/Trigger *
                </label>
                <select
                  value={formData.cause}
                  onChange={(e) => setFormData(prev => ({ ...prev, cause: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {FLOOD_CAUSES.map(cause => (
                    <option key={cause} value={cause}>{cause}</option>
                  ))}
                </select>
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flood Depth (meters)
                </label>
                <input
                  type="number"
                  value={formData.floodDepth}
                  onChange={(e) => setFormData(prev => ({ ...prev, floodDepth: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 6 hours, 2 days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area Extent
                </label>
                <input
                  type="text"
                  value={formData.areaExtent}
                  onChange={(e) => setFormData(prev => ({ ...prev, areaExtent: e.target.value }))}
                  placeholder="e.g., 5 hectares, 2 barangays"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                placeholder="Detailed description of the flood incident..."
                required
              />
            </div>
          </div>
        )}

        {/* Section 1: Human Impact */}
        {activeSection === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Population Affected
                </label>
                <input
                  type="number"
                  value={formData.affectedPopulation}
                  onChange={(e) => setFormData(prev => ({ ...prev, affectedPopulation: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evacuated/Displaced People
                </label>
                <input
                  type="number"
                  value={formData.evacuatedPeople}
                  onChange={(e) => setFormData(prev => ({ ...prev, evacuatedPeople: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Casualties
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dead</label>
                  <input
                    type="number"
                    value={formData.casualties.dead}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      casualties: { ...prev.casualties, dead: Number(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Missing</label>
                  <input
                    type="number"
                    value={formData.casualties.missing}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      casualties: { ...prev.casualties, missing: Number(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Injured</label>
                  <input
                    type="number"
                    value={formData.casualties.injured}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      casualties: { ...prev.casualties, injured: Number(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vulnerable Groups Affected
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VULNERABLE_GROUPS.map(group => (
                  <label key={group} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.vulnerableGroupsAffected.includes(group)}
                      onChange={(e) => handleArrayFieldChange('vulnerableGroupsAffected', group, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{group}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Property & Infrastructure */}
        {activeSection === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Houses Damaged
                </label>
                <input
                  type="number"
                  value={formData.housesDamaged}
                  onChange={(e) => setFormData(prev => ({ ...prev, housesDamaged: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Houses Destroyed
                </label>
                <input
                  type="number"
                  value={formData.housesDestroyed}
                  onChange={(e) => setFormData(prev => ({ ...prev, housesDestroyed: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Infrastructure Affected
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {INFRASTRUCTURE_TYPES.map(infra => (
                  <label key={infra} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.infrastructureAffected.includes(infra)}
                      onChange={(e) => handleArrayFieldChange('infrastructureAffected', infra, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{infra}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agriculture & Livelihood Losses
              </label>
              <textarea
                value={formData.agricultureLosses}
                onChange={(e) => setFormData(prev => ({ ...prev, agricultureLosses: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Describe crops, livestock, fisheries, and other livelihood losses..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Economic Damages (₱)
              </label>
              <input
                type="number"
                value={formData.economicDamages}
                onChange={(e) => setFormData(prev => ({ ...prev, economicDamages: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="1000"
              />
            </div>
          </div>
        )}

        {/* Section 3: Environmental Context */}
        {activeSection === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rainfall Data
              </label>
              <input
                type="text"
                value={formData.rainfallData}
                onChange={(e) => setFormData(prev => ({ ...prev, rainfallData: e.target.value }))}
                placeholder="e.g., 150mm in 24h, 300mm cumulative"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                River/Stream Level at Peak
              </label>
              <input
                type="text"
                value={formData.riverLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, riverLevel: e.target.value }))}
                placeholder="e.g., 5.2m above normal, critical level"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weather Event Context
              </label>
              <input
                type="text"
                value={formData.weatherEvent}
                onChange={(e) => setFormData(prev => ({ ...prev, weatherEvent: e.target.value }))}
                placeholder="e.g., Typhoon 'Egay', ITCZ, Low Pressure Area"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Section 4: Response & Actions */}
        {activeSection === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responding Agencies/Organizations
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {RESPONDING_AGENCIES.map(agency => (
                  <label key={agency} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.respondingAgencies.includes(agency)}
                      onChange={(e) => handleArrayFieldChange('respondingAgencies', agency, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{agency}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evacuation Centers Used
              </label>
              <textarea
                value={formData.evacuationCenters}
                onChange={(e) => setFormData(prev => ({ ...prev, evacuationCenters: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="List evacuation centers, schools, or facilities used..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relief Provided
              </label>
              <textarea
                value={formData.reliefProvided}
                onChange={(e) => setFormData(prev => ({ ...prev, reliefProvided: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Food packs, medical aid, rescue operations, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Challenges Encountered
              </label>
              <textarea
                value={formData.challengesEncountered}
                onChange={(e) => setFormData(prev => ({ ...prev, challengesEncountered: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Road blockages, communication failures, resource limitations, etc..."
              />
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
        )}
      </div>

      {/* Navigation and Submit */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
          disabled={activeSection === 0}
          className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <div className={`px-3 py-1 rounded-lg border ${getSeverityColor(formData.severity)}`}>
          <span className="text-sm font-medium">Severity: {formData.severity}</span>
        </div>
        
        {activeSection < sections.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveSection(Math.min(sections.length - 1, activeSection + 1))}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};