'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import ParentChildMobileCard from '@/components/ParentChildMobileCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListTabStatGridClass,
} from '@/components/studentDetailResponsive';

interface StudentData {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  intake?: string;
  year?: string;
  advisorId?: {
    _id: string;
    companyName?: string;
  };
  adminId?: {
    _id: string;
    companyName?: string;
  };
  registrationCount: number;
  createdAt: string;
}

export default function ParentStudentsPage() {
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
      if (userData.role !== USER_ROLE.PARENT) {
        toast.error('Access denied. Parent only.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchStudents();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await parentAPI.getMyStudents();
      setStudents(response.data.data.students);
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getFullName(student.user).toLowerCase();
    return (
      studentName.includes(query) ||
      student.user.email.toLowerCase().includes(query) ||
      student.mobileNumber?.includes(query)
    );
  });

  const handleViewStudent = (studentId: string) => {
    router.push(`/parent/students/${studentId}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const totalRegistrations = students.reduce((sum, s) => sum + s.registrationCount, 0);

  return (
    <>
      <Toaster position="top-right" />
      <ParentLayout user={user}>
        <div className={roleListPagePadding}>
          <div className="mb-4 sm:mb-6">
            <h1 className={roleListTitleClass}>My Children</h1>
            <p className={roleListSubtitleClass}>View your children&apos;s details and progress</p>
          </div>

          <div className={roleListTabStatGridClass}>
            <PageStatCard compact title="Total Children" mobileTitle="Children" value={students.length} color="blue" />
            <PageStatCard compact title="Total Registrations" mobileTitle="Registrations" value={totalRegistrations} color="green" />
          </div>

          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email, or mobile..."
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="mb-1 text-base font-semibold text-gray-900 sm:text-lg">No children found</p>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search' : 'Your children will appear here once they are registered.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredStudents.map((student) => (
                  <ParentChildMobileCard
                    key={student._id}
                    firstName={student.user.firstName}
                    middleName={student.user.middleName}
                    lastName={student.user.lastName}
                    email={student.user.email}
                    profilePicture={student.user.profilePicture}
                    isActive={student.user.isActive}
                    registrationCount={student.registrationCount}
                    adminCompany={student.adminId?.companyName}
                    advisorCompany={student.advisorId?.companyName}
                    isTransferred={Boolean(student.adminId?.companyName && student.advisorId?.companyName)}
                    joinedDate={new Date(student.createdAt).toLocaleDateString('en-GB')}
                    onView={() => handleViewStudent(student._id)}
                  />
                ))}
              </div>
              <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin/Advisor</th>
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
                                path={student.user.profilePicture}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover mr-3"
                                fallback={
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-blue-600 font-semibold text-sm">{getInitials(student.user)}</span>
                                  </div>
                                }
                              />
                              <div>
                                <div className="font-medium text-gray-900">{getFullName(student.user) || 'N/A'}</div>
                                <div className="text-sm text-gray-500">Joined {new Date(student.createdAt).toLocaleDateString('en-GB')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {student.adminId?.companyName && student.advisorId?.companyName ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-gray-900 text-xs">{student.adminId.companyName}</span>
                                <span className="text-gray-900 text-xs">{student.advisorId.companyName}</span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full w-fit">Transferred</span>
                              </div>
                            ) : student.adminId?.companyName ? (
                              <span className="text-gray-900">{student.adminId.companyName}</span>
                            ) : student.advisorId?.companyName ? (
                              <span className="text-gray-900">{student.advisorId.companyName}</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                              {student.registrationCount} service(s)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${student.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {student.user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleViewStudent(student._id)}
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
              </div>
            </>
          )}
        </div>
      </ParentLayout>
    </>
  );
}
