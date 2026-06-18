'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import StaffMobileList from '@/components/StaffMobileList';
import ListPageFilters from '@/components/ListPageFilters';
import { ALL_ACTIVE_INACTIVE_FILTER_OPTIONS } from '@/components/listFilterOptions';
import PageStatCard from '@/components/PageStatCard';
import { ListPageStatGrid } from '@/components/SuperAdminRoleDetailFrame';

interface CounselorData {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    isActive: boolean;
  };
  email: string;
  mobileNumber?: string;
  createdAt: string;
}

export default function SuperAdminAdminCounselorsPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [counselors, setCounselors] = useState<CounselorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) fetchCounselors();
  }, [currentUser]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setCurrentUser(userData);
    } catch (error) {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getAdminCounselors(adminId);
      setCounselors(response.data.data.counselors);
    } catch (error: any) {
      toast.error('Failed to fetch counselors');
      console.error('Fetch counselors error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCounselors = counselors.filter((counselor) => {
    const matchesSearch =
      getFullName(counselor.userId)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (counselor.mobileNumber && counselor.mobileNumber.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && counselor.userId?.isActive) ||
      (statusFilter === 'inactive' && !counselor.userId?.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push(`/super-admin/roles/admin/${adminId}`)}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin&apos;s Counselors</h2>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">View counselors under this admin (read-only)</p>
          </div>

          {/* Stats */}
          <ListPageStatGrid columns={3}>
            <PageStatCard title="Total Counselors" value={counselors.length} color="blue" />
            <PageStatCard title="Active" value={counselors.filter((c) => c.userId?.isActive).length} color="green" />
            <PageStatCard title="Inactive" value={counselors.filter((c) => !c.userId?.isActive).length} color="gray" />
          </ListPageStatGrid>

          {/* Counselors list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : filteredCounselors.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
                <ListPageFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Search by name, email, or phone..."
                  pillFilters={[
                    {
                      value: statusFilter,
                      onChange: (value) => setStatusFilter(value as 'all' | 'active' | 'inactive'),
                      options: ALL_ACTIVE_INACTIVE_FILTER_OPTIONS,
                      emptyValue: 'all',
                    },
                  ]}
                  onClear={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                />
              </div>
              <div className="p-8 text-center sm:p-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 text-lg">No counselors found</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
                <ListPageFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Search by name, email, or phone..."
                  pillFilters={[
                    {
                      value: statusFilter,
                      onChange: (value) => setStatusFilter(value as 'all' | 'active' | 'inactive'),
                      options: ALL_ACTIVE_INACTIVE_FILTER_OPTIONS,
                      emptyValue: 'all',
                    },
                  ]}
                  onClear={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                />
              </div>
              <StaffMobileList
                staff={filteredCounselors}
                getMenuItems={(counselor) => [
                  {
                    label: 'View',
                    onClick: () => router.push(`/super-admin/roles/counselor/${counselor._id}`),
                  },
                ]}
              />
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCounselors.map((counselor) => (
                      <tr key={counselor._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={counselor.userId?.profilePicture}
                              alt={getFullName(counselor.userId)}
                              className="w-8 h-8 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {getInitials(counselor.userId)}
                                  </span>
                                </div>
                              }
                            />
                            <span className="text-sm font-medium text-gray-900">{getFullName(counselor.userId) || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{counselor.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{counselor.mobileNumber || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            counselor.userId?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {counselor.userId?.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(counselor.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/super-admin/roles/counselor/${counselor._id}`)}
                            className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                          >
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
