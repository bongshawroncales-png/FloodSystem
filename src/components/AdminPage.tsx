import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Shield, Settings, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, MapPin, Calendar, User, Mail, Phone, MapIcon, X, EyeOff, Lock } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../firebase';
import { UserProfile, FloodIncident, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ConfirmationModal } from './ConfirmationModal';
import { ErrorNotification } from './ErrorNotification';

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'incidents' | 'settings'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incidents, setIncidents] = useState<FloodIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewUserModal, setViewUserModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
  }>({
    isOpen: false,
    user: null
  });
  const [editUserModal, setEditUserModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
  }>({
    isOpen: false,
    user: null
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    incidentId: string;
    incidentTitle: string;
  }>({
    isOpen: false,
    incidentId: '',
    incidentTitle: ''
  });
  const [deleteUserConfirmation, setDeleteUserConfirmation] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: '',
    userName: ''
  });
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    password: string;
    loading: boolean;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    password: '',
    loading: false
  });
  const [showPassword, setShowPassword] = useState(false);

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
        setError('Failed to load admin data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Check if user is admin - moved after all hooks
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

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));
      setSuccess(`User role updated to ${newRole} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !isActive });
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, isActive: !isActive } : user
      ));
      setSuccess(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Failed to update user status. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
        setViewUserModal({ isOpen: true, user: userData });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to load user details. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditUser = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
        setEditUserModal({ isOpen: true, user: userData });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to load user details for editing. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdateUser = async (updatedUser: UserProfile) => {
    try {
      const { uid, ...updateData } = updatedUser;
      await updateDoc(doc(db, 'users', uid), updateData);
      setUsers(prev => prev.map(user => 
        user.uid === uid ? updatedUser : user
      ));
      setEditUserModal({ isOpen: false, user: null });
      setSuccess('User information updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user information. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      userId,
      userName,
      password: '',
      loading: false
    });
  };

  const confirmDeleteUserWithPassword = async () => {
    if (!passwordConfirmation.password.trim()) {
      setError('Password is required to confirm deletion');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setPasswordConfirmation(prev => ({ ...prev, loading: true }));
    
    try {
      // Re-authenticate admin user before allowing deletion
      const credential = EmailAuthProvider.credential(user!.email!, passwordConfirmation.password);
      await reauthenticateWithCredential(user!, credential);
      
      // If re-authentication succeeds, proceed with deletion
      await deleteDoc(doc(db, 'users', passwordConfirmation.userId));
      setUsers(prev => prev.filter(user => user.uid !== passwordConfirmation.userId));
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      
      let errorMessage = 'Failed to delete user. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (error.message.includes('auth/too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (error.message.includes('auth/requires-recent-login')) {
          errorMessage = 'Please sign out and sign in again before deleting users.';
        }
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setPasswordConfirmation(prev => ({ ...prev, loading: false }));
    }
    
    setPasswordConfirmation({
      isOpen: false,
      userId: '',
      userName: '',
      password: '',
      loading: false
    });
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
      setError('Failed to confirm incident. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    try {
      await deleteDoc(doc(db, 'floodIncidents', incidentId));
      setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
    } catch (error) {
      console.error('Error deleting incident:', error);
      setError('Failed to delete incident. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteClick = (incidentId: string, incidentTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      incidentId,
      incidentTitle
    });
  };

  const handleDeleteConfirm = async () => {
    await deleteIncident(deleteConfirmation.incidentId);
    setDeleteConfirmation({
      isOpen: false,
      incidentId: '',
      incidentTitle: ''
    });
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
                  <p className="text-sm text-gray-600">Kalaw Flood Monitoring System</p>
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
        <ErrorNotification 
          error={error} 
          success={success}
          onClearError={() => setError(null)}
          onClearSuccess={() => setSuccess(null)}
        />

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
                                <button 
                                  onClick={() => handleViewUser(userProfile.uid)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditUser(userProfile.uid)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {userProfile.uid !== user?.uid && (
                                  <button 
                                    onClick={() => handleDeleteUser(userProfile.uid, userProfile.displayName || userProfile.email)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
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
                                onClick={() => handleDeleteClick(incident.id!, incident.title)}
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

      {/* View User Modal */}
      {viewUserModal.isOpen && viewUserModal.user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
              <button
                onClick={() => setViewUserModal({ isOpen: false, user: null })}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{viewUserModal.user.displayName || `${viewUserModal.user.firstName} ${viewUserModal.user.lastName}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{viewUserModal.user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{viewUserModal.user.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="text-gray-900">{viewUserModal.user.address || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <p className="text-gray-900">{viewUserModal.user.dateOfBirth || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Occupation</label>
                <p className="text-gray-900">{viewUserModal.user.occupation || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="text-gray-900 capitalize">{viewUserModal.user.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`${viewUserModal.user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {viewUserModal.user.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joined</label>
                <p className="text-gray-900">{new Date(viewUserModal.user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserModal.isOpen && editUserModal.user && (
        <EditUserModal
          user={editUserModal.user}
          onClose={() => setEditUserModal({ isOpen: false, user: null })}
          onSave={handleUpdateUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, incidentId: '', incidentTitle: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Flood Incident"
        message={`Are you sure you want to delete the incident "${deleteConfirmation.incidentTitle}"? This action cannot be undone and will permanently remove all incident data.`}
        type="delete"
        confirmText="Delete Incident"
        cancelText="Keep Incident"
      />

      {/* Delete User Confirmation Modal */}
      {passwordConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Confirm User Deletion</h2>
              </div>
              <button
                onClick={() => setPasswordConfirmation({ isOpen: false, userId: '', userName: '', password: '', loading: false })}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={passwordConfirmation.loading}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Warning: Permanent Action</span>
                </div>
                <p className="text-red-700 text-sm">
                  You are about to permanently delete the user account "{passwordConfirmation.userName}". 
                  This action cannot be undone and will remove all user data and access.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your admin password to confirm deletion
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirmation.password}
                    onChange={(e) => setPasswordConfirmation(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                    disabled={passwordConfirmation.loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !passwordConfirmation.loading) {
                        confirmDeleteUserWithPassword();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={passwordConfirmation.loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPasswordConfirmation({ isOpen: false, userId: '', userName: '', password: '', loading: false })}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  disabled={passwordConfirmation.loading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUserWithPassword}
                  disabled={passwordConfirmation.loading || !passwordConfirmation.password.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordConfirmation.loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete User Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit User Modal Component
interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (user: UserProfile) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<UserProfile>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user data from Firebase when modal opens
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
          setFormData(userData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user.uid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    onSave(formData);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Loading user data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Enter first name"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Enter last name"
                disabled={!isEditing}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Enter email address"
              disabled={!isEditing}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Enter phone number"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Enter address"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Select date of birth"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
            <input
              type="text"
              value={formData.occupation || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Enter occupation"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              disabled={!isEditing}
            >
              <option value="user">User</option>
              <option value="authorized">Authorized</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={!isEditing}
            />
            <label className="ml-2 text-sm text-gray-700">Active Account</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
};