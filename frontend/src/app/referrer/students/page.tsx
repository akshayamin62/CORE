'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, referrerAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ReferrerLayout from '@/components/ReferrerLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import { StudentMobileList } from '@/components/StudentMobileRecordCard';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListStatGridClass,
} from '@/components/studentDetailResponsive';

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
  };
  email: string;
  mobileNumber: string;
  conversionDate: string;
  createdAt: string;
}

export default function ReferrerStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.REFERRER) {
        toast.error('Access denied. Referrer only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudents();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await referrerAPI.getStudents();
      setStudents(response.data.data.students);
    } catch (error: any) {
      toast.error('Failed to fetch students');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getFullName(student.userId).toLowerCase();
    return (
      studentName.includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.mobileNumber?.includes(query)
    );
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const activeCount = students.filter((s) => s.userId.isActive).length;

  return (
    <>
      <Toaster position="top-right" />
      <ReferrerLayout user={user}>
        <div className={roleListPagePadding}>
          <div className="mb-4 sm:mb-6">
            <h1 className={roleListTitleClass}>My Referred Students</h1>
            <p className={roleListSubtitleClass}>
              Students converted from your referred leads (Read-only)
            </p>
          </div>

          <div className={roleListStatGridClass}>
            <PageStatCard compact title="Total Students" mobileTitle="Total" value={students.length} color="blue" />
            <PageStatCard compact title="Active Users" mobileTitle="Active" value={activeCount} color="green" />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email, or mobile..."
                onClear={() => setSearchQuery('')}
              />
            </div>

            {filteredStudents.length > 0 ? (
              <>
                <StudentMobileList
                  students={filteredStudents}
                  getMenuItems={(student) => [
                    {
                      label: 'View Detail',
                      onClick: () => router.push(`/referrer/students/${student._id}`),
                    },
                  ]}
                />
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Converted</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <AuthImage
                                path={student.userId.profilePicture}
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
                                <p className="font-medium text-gray-900">{getFullName(student.userId) || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  Joined {new Date(student.createdAt).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{student.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{student.mobileNumber || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              student.userId.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.userId.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                            {student.conversionDate
                              ? new Date(student.conversionDate).toLocaleDateString('en-GB')
                              : new Date(student.createdAt).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => router.push(`/referrer/students/${student._id}`)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              View Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-4 py-10 text-center sm:px-6 sm:py-12">
                <svg className="mx-auto mb-4 h-10 w-10 text-gray-400 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                <p className="text-sm text-gray-500 sm:text-base">
                  {searchQuery ? 'No students match your search' : 'No students yet. Students will appear here once your referred leads are converted.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </ReferrerLayout>
    </>
  );
}
