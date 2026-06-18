'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import ListPageFilters from '@/components/ListPageFilters';
import MobileUserRecordCard from '@/components/MobileUserRecordCard';
import { MobileRecordMenuItem } from '@/components/MobileRecordCard';
import AuthImage from '@/components/AuthImage';
import { getFullName, getInitials } from '@/utils/nameHelpers';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role?.toUpperCase() !== 'ADMIN') {
        toast.error('Access denied');
        router.push('/');
        return;
      }
      setAuthChecked(true);
    } else {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [roleFilter, verifiedFilter, activeFilter, searchQuery, activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (roleFilter) params.role = roleFilter;
      if (verifiedFilter) params.isVerified = verifiedFilter;
      if (activeFilter) params.isActive = activeFilter;
      if (searchQuery) params.search = searchQuery;

      let response;
      if (activeTab === 'pending') {
        response = await adminAPI.getPendingApprovals();
      } else {
        response = await adminAPI.getUsers(params);
      }

      setUsers(response.data.data.users || []);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminAPI.approveUser(userId);
      toast.success('User approved');
      fetchUsers();
    } catch {
      toast.error('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminAPI.rejectUser(userId);
      toast.success('User rejected');
      fetchUsers();
    } catch {
      toast.error('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminAPI.toggleUserStatus(userId);
      toast.success('User status updated');
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      setActionLoading(userId);
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const getUserMenuItems = (user: any): MobileRecordMenuItem[] => {
    const userId = user._id;
    const isLoading = actionLoading === userId;
    const items: MobileRecordMenuItem[] = [];

    if (!user.isVerified && user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      items.push(
        { label: 'Approve', variant: 'success', disabled: isLoading, onClick: () => handleApprove(userId) },
        { label: 'Reject', variant: 'danger', disabled: isLoading, onClick: () => handleReject(userId) },
      );
    }
    if (user.isVerified) {
      items.push(
        {
          label: user.isActive ? 'Deactivate' : 'Activate',
          variant: user.isActive ? 'warning' : 'success',
          disabled: isLoading,
          onClick: () => handleToggleStatus(userId),
        },
        { label: 'Delete', variant: 'danger', disabled: isLoading, onClick: () => handleDelete(userId) },
      );
    }
    return items;
  };

  const displayName = (user: any) => getFullName(user) || user.name || user.email;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">User Management</h1>
          <p className="mt-1 text-gray-600">Manage users, approvals, and permissions</p>
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 sm:gap-4 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:px-6 sm:py-3 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:px-6 sm:py-3 ${
                activeTab === 'pending'
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending Approvals
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:rounded-2xl md:shadow-lg">
          {activeTab === 'all' && (
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-6">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search users..."
                desktopColumns={4}
                pillFilters={[
                  {
                    value: roleFilter,
                    onChange: setRoleFilter,
                    emptyValue: '',
                    options: [
                      { value: '', label: 'All Roles', mobileLabel: 'All' },
                      { value: 'STUDENT', label: 'Student' },
                      { value: 'COUNSELOR', label: 'Counselor' },
                      { value: 'ALUMNI', label: 'Alumni' },
                      { value: 'SERVICE_PROVIDER', label: 'Service Provider', mobileLabel: 'Provider' },
                      { value: 'ADMIN', label: 'Admin' },
                    ],
                  },
                  {
                    value: verifiedFilter,
                    onChange: setVerifiedFilter,
                    emptyValue: '',
                    options: [
                      { value: '', label: 'All Verified', mobileLabel: 'Verified' },
                      { value: 'true', label: 'Verified' },
                      { value: 'false', label: 'Unverified' },
                    ],
                  },
                  {
                    value: activeFilter,
                    onChange: setActiveFilter,
                    emptyValue: '',
                    options: [
                      { value: '', label: 'All Status', mobileLabel: 'Status' },
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' },
                    ],
                  },
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setRoleFilter('');
                  setVerifiedFilter('');
                  setActiveFilter('');
                }}
              />
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No users found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 md:hidden">
                {users.map((user) => (
                  <MobileUserRecordCard
                    key={user._id}
                    avatar={
                      <AuthImage
                        path={user.profilePicture}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        fallback={
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <span className="font-semibold text-blue-600">{getInitials(user)}</span>
                          </div>
                        }
                      />
                    }
                    title={displayName(user)}
                    subtitle={user.email}
                    badges={
                      <>
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">{user.role}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user.isVerified ? 'Verified' : 'Unverified'}</span>
                      </>
                    }
                    joined="—"
                    menuItems={getUserMenuItems(user)}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 font-medium">{displayName(user)}</td>
                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {user.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {!user.isVerified && user.role !== 'STUDENT' && user.role !== 'ADMIN' && (
                              <>
                                <button onClick={() => handleApprove(user._id)} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Approve</button>
                                <button onClick={() => handleReject(user._id)} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Reject</button>
                              </>
                            )}
                            {user.isVerified && (
                              <>
                                <button onClick={() => handleToggleStatus(user._id)} className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => handleDelete(user._id)} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
