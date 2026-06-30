'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE, SERVICE_TYPE } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
} from '@/components/studentDetailResponsive';
import { StudentMobileList } from '@/components/StudentMobileRecordCard';
import ListPageFilters from '@/components/ListPageFilters';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  adminId?: {
    _id: string;
    companyName?: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name: string;
      email: string;
    };
  };
  counselorId?: {
    _id: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name: string;
      email: string;
    };
  };
  registrationCount: number;
  serviceNames?: string[];
  createdAt: string;
}

export default function EduplanCoachStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD:
      case 'Study Abroad':
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
      case 'Ivy League Preparation':
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-blue-100 text-blue-800';
      case SERVICE_TYPE.COACHING_CLASSES:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.EDUPLAN_COACH) {
        toast.error('Access denied.');
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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/super-admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data.data.students);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Access denied. You need to be assigned as an active Eduplan Coach.');
      } else {
        toast.error('Failed to fetch students');
      }
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (student.user.isActive === false) return false;
    const query = searchQuery.toLowerCase();
    const studentName = getFullName(student.user).toLowerCase();
    return (
      studentName.includes(query) ||
      student.user.email.toLowerCase().includes(query) ||
      student.mobileNumber?.includes(query)
    );
  });

  const handleViewStudent = (studentId: string) => {
    router.push(`/eduplan-coach/students/${studentId}`);
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

  return (
    <>
      <EduplanCoachLayout user={user}>
        <div className={roleListPagePadding}>
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className={roleListTitleClass}>All Students</h1>
            <p className={roleListSubtitleClass}>
              View and manage student data and their service registrations
            </p>
          </div>

          {/* Students List */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4 md:p-6">
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
                  getServiceColor={getServiceColor}
                  getMenuItems={(student) => [
                    {
                      label: 'View Details',
                      onClick: () => handleViewStudent(student._id),
                    },
                  ]}
                />
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Admin
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Registrations
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
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
                                    <span className="text-blue-600 font-semibold text-sm">
                                      {getInitials(student.user)}
                                    </span>
                                  </div>
                                }
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getFullName(student.user) || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Joined {new Date(student.createdAt).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.user.email}
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
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                student.user.isActive
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
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
              </>
            ) : (
              <div className="px-4 py-10 text-center sm:px-6 sm:py-12">
                <div className="text-gray-400">
                  <svg
                    className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <p className="mb-1 text-base font-medium text-gray-900 sm:text-lg">
                    No students found
                  </p>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Students will appear here once they register'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {students.length > 0 && (
            <div className="mt-4 text-xs text-gray-600 sm:mt-6 sm:text-sm">
              Showing {filteredStudents.length} of {students.length} total students
            </div>
          )}
        </div>
      </EduplanCoachLayout>
    </>
  );
}
