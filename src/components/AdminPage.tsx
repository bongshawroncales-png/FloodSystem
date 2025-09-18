import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Shield, Settings, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, MapPin, Calendar, User, Mail, Phone, MapIcon } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, FloodIncident, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'incidents' | 'settings'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incidents, setIncidents] = useState<FloodIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin panel.</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Load users and incidents
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData: UserProfile[] = [];
        usersSnapshot.forEach((doc) => {
          usersData.push({ ...doc.data(), uid: doc.id } as UserProfile);
        });
        setUsers(usersData);

        // Load flood incidents
        const incidentsQuery = query(collection(db, 'floodIncidents'), orderBy('createdAt', 'desc'));
        const incidentsSnapshot = await getDocs(incidentsQuery);
        const incidentsData: FloodIncident[] = [];
        incidentsSnapshot.forEach((doc) => {
          incidentsData.push({ id: doc.id, ...doc.data() } as FloodIncident);
        });
        setIncidents(incidentsData);
      } catch (error) {
        console.error('Error loading admin data:', error);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role');
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !isActive });
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, isActive: !isActive } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status');
    }
  };

  const confirmIncident = async (incidentId: string) => {
    try {
      await updateDoc(doc(db, 'floodIncidents', incidentId), {
        status: 'Confirmed',
        confirmedBy: {
          uid: user!.uid,
          email: user!.email,
          displayName: user!.displayName
        },
        confirmedAt: new Date().toISOString()
      });
      setIncidents(prev => prev.map(incident => 
        incident.id === incidentId 
          ? { 
              ...incident, 
              status: 'Confirmed' as const,
              confirmedBy: {
                uid: user!.uid,
                email: user!.email!,
                displayName: user!.displayName!
              },
              confirmedAt: new Date().toISOString()
            } 
          : incident
      ));
    } catch (error) {
      console.error('Error confirming incident:', error);
      setError('Failed to confirm incident');
    }
  };

  const deleteIncident = async (incidentId: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    
    try {
      await deleteDoc(doc(db, 'floodIncidents', incidentId));
      setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
    } catch (error) {
      console.error('Error deleting incident:', error);
      setError('Failed to delete incident');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'authorized': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                  <p className="text-sm text-gray-600">Oras Flood Risk System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.displayName}</p>
                <p className="text-xs text-gray-600">Administrator</p>
              </div>
              {user?.photoURL && (
                <img src={user.photoURL} alt="Admin" className="w-8 h-8 rounded-full" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              User Management ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'incidents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Flood Incidents ({incidents.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">User Accounts</h2>
                    <p className="text-sm text-gray-600">Manage user roles and permissions</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((userProfile) => (
                          <tr key={userProfile.uid}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`}
                                  </div>
                                  <div className="text-sm text-gray-500">{userProfile.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                {userProfile.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {userProfile.phone}
                                  </div>
                                )}
                                {userProfile.address && (
                                  <div className="flex items-center gap-1">
                                    <MapIcon className="w-3 h-3" />
                                    {userProfile.address}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={userProfile.role}
                                onChange={(e) => updateUserRole(userProfile.uid, e.target.value as UserRole)}
                                className={`px-2 py-1 rounded text-xs font-medium border ${getRoleColor(userProfile.role)}`}
                                disabled={userProfile.uid === user?.uid} // Can't change own role
                              >
                                <option value="user">User</option>
                                <option value="authorized">Authorized</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleUserStatus(userProfile.uid, userProfile.isActive)}
                                className={`px-2 py-1 rounded text-xs font-medium border ${
                                  userProfile.isActive 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                                disabled={userProfile.uid === user?.uid} // Can't deactivate own account
                              >
                                {userProfile.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(userProfile.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button className="text-blue-600 hover:text-blue-900">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-green-600 hover:text-green-900">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Incidents Tab */}
            {activeTab === 'incidents' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Flood Incidents</h2>
                    <p className="text-sm text-gray-600">Review and manage reported flood incidents</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {incidents.length === 0 ? (
                      <div className="px-6 py-12 text-center text-gray-500">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No flood incidents reported yet</p>
                      </div>
                    ) : (
                      incidents.map((incident) => (
                        <div key={incident.id} className="px-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-medium text-gray-900">{incident.title}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                                  {incident.severity}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(incident.status)}`}>
                                  {incident.status}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-3">{incident.description}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {incident.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(incident.createdAt).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  Reported by: {incident.reportedBy.displayName}
                                </div>
                                {incident.affectedPopulation && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    Affected: {incident.affectedPopulation} people
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {incident.status === 'Pending' && (
                                <button
                                  onClick={() => confirmIncident(incident.id!)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Confirm Incident"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteIncident(incident.id!)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Incident"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">System Settings</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">Role Permissions</h3>
                      <div className="space-y-2 text-sm text-blue-800">
                        <div><strong>Admin:</strong> Full system access, user management, incident confirmation</div>
                        <div><strong>Authorized:</strong> Can draw markers, add areas, delete areas, confirm incidents</div>
                        <div><strong>User:</strong> View-only access, can run live risk monitor, view incidents</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">{users.length}</div>
                        <div className="text-sm text-gray-600">Total Users</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {users.filter(u => u.role === 'authorized').length}
                        </div>
                        <div className="text-sm text-gray-600">Authorized Users</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {incidents.filter(i => i.status === 'Pending').length}
                        </div>
                        <div className="text-sm text-gray-600">Pending Incidents</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};