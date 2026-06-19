'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, advisorAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisorLayout from '@/components/AdvisorLayout';
import AuthImage from '@/components/AuthImage';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import toast, { Toaster } from 'react-hot-toast';
import { StudentMobileList } from '@/components/StudentMobileRecordCard';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import { ListPageStatGrid } from '@/components/SuperAdminRoleDetailFrame';

interface Student {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    isActive?: boolean;
  };
  adminId?: string;
  createdAt: string;
}

export default function AdvisorStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADVISOR) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchStudents();
    } catch {
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await advisorAPI.getStudents();
      setStudents(response.data.data?.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = getFullName(s.userId).toLowerCase();
    return (
      name.includes(query) ||
      s.userId?.email?.toLowerCase().includes(query)
    );
  });

  const activeCount = students.filter((s) => s.userId?.isActive !== false).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdvisorLayout user={user}>
        <div className="p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
          <div className="mb-5 md:mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Students</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">Manage your converted students</p>
          </div>

          <ListPageStatGrid>
            <PageStatCard title="Total Students" value={students.length} color="blue" />
            <PageStatCard title="Active Students" value={activeCount} color="green" />
          </ListPageStatGrid>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name or email..."
                onClear={() => setSearchQuery('')}
              />
            </div>

            {filteredStudents.length > 0 ? (
              <>
              <StudentMobileList
                students={filteredStudents}
                getMenuItems={(student) => [
                  {
                    label: 'View Details',
                    onClick: () => router.push(`/advisor/students/${student._id}`),
                  },
                ]}
                renderBadges={(student) =>
                  student.adminId ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                      Transferred
                    </span>
                  ) : student.userId?.isActive !== false ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                      Inactive
                    </span>
                  )
                }
              />
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/advisor/students/${student._id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={student.userId?.profilePicture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {getInitials(student.userId)}
                                  </span>
                                </div>
                              }
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {getFullName(student.userId) || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(student.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.userId?.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.adminId ? (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Transferred</span>
                          ) : student.userId?.isActive !== false ? (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Active</span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/advisor/students/${student._id}`); }}
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
            ) : (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-1">No students found</p>
                <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search' : 'Students will appear here after lead conversion.'}</p>
              </div>
            )}
          </div>
        </div>
      </AdvisorLayout>
    </>
  );
}
