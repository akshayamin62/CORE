'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI, authAPI } from '@/lib/api';
import { User } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

interface UserStats {
  total: number;
  verified: number;
  active: number;
  pendingApproval: number;
  byRole: Record<string, number>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role === 'ADMIN';
    if (isAdmin) {
      if (activeTab === 'all') {
        fetchUsers();
      } else {
        fetchPendingApprovals();
      }
      fetchStats();
    }
  }, [currentUser, roleFilter, verifiedFilter, activeFilter, searchDebounce, activeTab]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      const user = response.data.data.user;
      
      // Check for admin role (case-insensitive)
      const isAdmin = user.role?.toLowerCase() === 'admin' || user.role === 'ADMIN';
      
      if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
      
      setCurrentUser(user);
    } catch (error: any) {
      toast.error('Authentication failed');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (roleFilter) params.role = roleFilter;
      if (verifiedFilter) params.isVerified = verifiedFilter === 'true';
      if (activeFilter) params.isActive = activeFilter === 'true';
      if (searchDebounce && searchDebounce.trim()) params.search = searchDebounce.trim();
      
      const response = await adminAPI.getUsers(params);
      console.log('Users fetched:', response.data.data.users);
      setUsers(response.data.data.users || []);
    } catch (error: any) {
      console.error('Fetch users error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingApprovals();
      console.log('Pending approvals fetched:', response.data.data.users);
      setUsers(response.data.data.users || []);
    } catch (error: any) {
      console.error('Fetch pending approvals error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch pending approvals');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      console.log('Stats fetched:', response.data.data);
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to fetch statistics');
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('Are you sure you want to approve this user?')) return;
    
    try {
      setActionLoading(userId);
      await adminAPI.approveUser(userId);
      toast.success('User approved successfully');
      if (activeTab === 'all') {
        await fetchUsers();
      } else {
        await fetchPendingApprovals();
      }
      await fetchStats();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to approve user';
      toast.error(message);
      console.error('Approve error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      setActionLoading(userId);
      await adminAPI.rejectUser(userId, reason || undefined);
      toast.success('User rejected and removed');
      if (activeTab === 'all') {
        await fetchUsers();
      } else {
        await fetchPendingApprovals();
      }
      await fetchStats();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to reject user';
      toast.error(message);
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminAPI.toggleUserStatus(userId);
      toast.success('User status updated');
      await fetchUsers();
      await fetchStats();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update user status';
      toast.error(message);
      console.error('Toggle status error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to DELETE this user? This action cannot be undone.')) return;
    
    try {
      setActionLoading(userId);
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      await fetchUsers();
      await fetchStats();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to delete user';
      toast.error(message);
      console.error('Delete error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const roleLower = role?.toLowerCase() || '';
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-800',
      counselor: 'bg-green-100 text-green-800',
      alumni: 'bg-purple-100 text-purple-800',
      service_provider: 'bg-orange-100 text-orange-800',
      'service provider': 'bg-orange-100 text-orange-800',
      admin: 'bg-red-100 text-red-800',
    };
    return colors[roleLower] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role === 'ADMIN';
  if (!currentUser || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Admin</span> Dashboard
          </h1>
          <p className="text-gray-600">Manage users and approvals</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 text-sm font-medium">Total Users</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 text-sm font-medium">Active Users</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 text-sm font-medium">Verified</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.verified}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 text-sm font-medium">Pending Approval</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingApproval}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pending'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approvals {stats && stats.pendingApproval > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    {stats.pendingApproval}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters - Only show for 'all' tab */}
          {activeTab === 'all' && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="counselor">Counselor</option>
                  <option value="alumni">Alumni</option>
                  <option value="service_provider">Service Provider</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Verified</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>

                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-2 text-gray-900 font-medium">No users found</p>
                {activeTab === 'pending' && (
                  <p className="mt-1 text-sm text-gray-700">No users are currently pending approval</p>
                )}
                {activeTab === 'all' && (
                  <p className="mt-1 text-sm text-gray-700">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">User</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Role</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Joined</th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id || user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-700">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {user.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-400"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-400"></span>
                              Inactive
                            </span>
                          )}
                          {user.isVerified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Unverified
                            </span>
                          )}
                          {!user.isVerified && 
                           (user.role?.toLowerCase() !== 'admin' && user.role !== 'ADMIN') &&
                           (user.role?.toLowerCase() !== 'student' && user.role !== 'STUDENT') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Pending Approval
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                          {/* Show Approve/Reject for unverified users (non-students, non-admins) */}
                          {!user.isVerified && 
                           (user.role?.toLowerCase() !== 'admin' && user.role !== 'ADMIN') &&
                           (user.role?.toLowerCase() !== 'student' && user.role !== 'STUDENT') && (
                            <>
                              <button
                                onClick={() => handleApprove(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs font-medium shadow-sm"
                              >
                                {actionLoading === (user._id || user.id) ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs font-medium shadow-sm"
                              >
                                {actionLoading === (user._id || user.id) ? '...' : 'Reject'}
                              </button>
                            </>
                          )}
                          
                          {/* Show Deactivate/Delete for verified users (after approval, except admins and students) */}
                          {user.isVerified && 
                           (user.role?.toLowerCase() !== 'admin' && user.role !== 'ADMIN') &&
                           (user.role?.toLowerCase() !== 'student' && user.role !== 'STUDENT') && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs font-medium shadow-sm ${
                                  user.isActive
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {actionLoading === (user._id || user.id) ? '...' : (user.isActive ? 'Deactivate' : 'Activate')}
                              </button>
                              <button
                                onClick={() => handleDelete(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs font-medium shadow-sm"
                              >
                                {actionLoading === (user._id || user.id) ? '...' : 'Delete'}
                              </button>
                            </>
                          )}
                          
                          {/* Show Deactivate/Delete for students (they're auto-verified, but can be managed) */}
                          {(user.role?.toLowerCase() === 'student' || user.role === 'STUDENT') && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs font-medium shadow-sm ${
                                  user.isActive
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {actionLoading === (user._id || user.id) ? '...' : (user.isActive ? 'Deactivate' : 'Activate')}
                              </button>
                              <button
                                onClick={() => handleDelete(user._id || user.id!)}
                                disabled={actionLoading === (user._id || user.id)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs font-medium shadow-sm"
                              >
                                {actionLoading === (user._id || user.id) ? '...' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

