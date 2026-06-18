'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminEduplanCoachAPI } from '@/lib/api';
import { User, USER_ROLE, SERVICE_TYPE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import { StudentMobileList } from '@/components/StudentMobileRecordCard';
import ListPageFilters from '@/components/ListPageFilters';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/components/listFilterOptions';
import PageStatCard from '@/components/PageStatCard';
import { ListPageStatGrid } from '@/components/SuperAdminRoleDetailFrame';

interface StudentData {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  adminId?: {
    _id: string;
    companyName?: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
    };
  };
  registrationCount: number;
  serviceNames?: string[];
  createdAt: string;
}

export default function SuperAdminEduplanCoachStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const coachUserId = params.userId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) fetchStudents();
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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await superAdminEduplanCoachAPI.getCoachStudents(coachUserId);
      setStudents(response.data.data.students || []);
    } catch (error: any) {
      toast.error('Failed to fetch students');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD:
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.COACHING_CLASSES:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      getFullName(student.userId)?.toLowerCase().includes(q) ||
      student.userId?.email?.toLowerCase().includes(q) ||
      (student.mobileNumber && student.mobileNumber.includes(q));

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && student.userId?.isActive) ||
      (statusFilter === 'inactive' && !student.userId?.isActive);

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
            onClick={() => router.push(`/super-admin/roles/eduplan-coach/${coachUserId}`)}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Eduplan Coach Dashboard
          </button>

          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Eduplan Coach&apos;s Students</h2>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">View students assigned to this coach (read-only)</p>
          </div>

          <ListPageStatGrid>
            <PageStatCard title="Total Students" value={students.length} color="blue" />
            <PageStatCard
              title="Active Students"
              value={students.filter((s) => s.userId?.isActive).length}
              color="green"
            />
          </ListPageStatGrid>

          {/* Search and Filter */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email, phone..."
                pillFilters={[
                  {
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: ACTIVE_STATUS_FILTER_OPTIONS,
                  },
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                }}
              />
            </div>

            {/* Students Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No students found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
              <StudentMobileList
                students={filteredStudents}
                getServiceColor={getServiceColor}
                getMenuItems={(student) => [
                  {
                    label: 'View Details',
                    onClick: () => router.push(`/super-admin/roles/student/${student._id}`),
                  },
                ]}
              />
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registrations</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={student.userId?.profilePicture}
                              alt={getFullName(student.userId)}
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-green-600 font-semibold text-sm">
                                    {getInitials(student.userId)}
                                  </span>
                                </div>
                              }
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{getFullName(student.userId) || 'N/A'}</div>
                              <div className="text-xs text-gray-500">
                                Joined {new Date(student.userId?.createdAt || student.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.userId?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.adminId?.companyName || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {student.serviceNames && student.serviceNames.length > 0 ? (
                              student.serviceNames.map((service, idx) => (
                                <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                                  {service}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">No services</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            student.userId?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {student.userId?.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/super-admin/roles/student/${student._id}`)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Results count */}
          {students.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing {filteredStudents.length} of {students.length} total students
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
