'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import MobileRecordCard from '@/components/MobileRecordCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface IvyStudent {
  _id: string;
  userId: string;
  studentDocId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentMobile: string;
  testStatus: string;
  totalScore: number | null;
  maxScore: number;
  completedSections: number;
  createdAt: string;
  profilePicture?: string;
}

export default function IvyStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<IvyStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
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
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/super-admin/ivy-league/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (s: IvyStudent) =>
    [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');

  const getTestStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-800' },
      'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    };
    const s = map[status] || map['not-started'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.className}`}>
        {s.label}
      </span>
    );
  };

  const filteredStudents = students.filter((s) => {
    if (statusFilter && statusFilter !== s.testStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getFullName(s).toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.schoolName.toLowerCase().includes(q)
    );
  });

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/super-admin/roles/ivy-expert')}
                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Ivy Students</h1>
            </div>
            <p className="mt-1 pl-9 text-gray-600 sm:pl-0">Students assigned to an Ivy League expert</p>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-600 sm:text-sm">Total Students</p>
                  <p className="text-xl font-bold text-gray-900 sm:text-3xl">{students.length}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 sm:h-12 sm:w-12">
                  <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-600 sm:text-sm">Test Completed</p>
                  <p className="text-xl font-bold text-gray-900 sm:text-3xl">{students.filter(s => s.testStatus === 'completed').length}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 sm:h-12 sm:w-12">
                  <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:col-span-1 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-600 sm:text-sm">Test Pending</p>
                  <p className="text-xl font-bold text-gray-900 sm:text-3xl">{students.filter(s => s.testStatus !== 'completed').length}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 sm:h-12 sm:w-12">
                  <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-6">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email, or school..."
                pillFilters={[
                  {
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { value: '', label: 'All Test Status', mobileLabel: 'All' },
                      { value: 'not-started', label: 'Not Started', mobileLabel: 'Not Started' },
                      { value: 'in-progress', label: 'In Progress', mobileLabel: 'In Progress' },
                      { value: 'completed', label: 'Completed', mobileLabel: 'Done' },
                    ],
                  },
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                }}
              />
            </div>

            {/* Table */}
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-2 font-medium text-gray-900">No students found</p>
                </div>
              ) : (
                <>
                <div className="divide-y divide-gray-200 md:hidden">
                  {filteredStudents.map((s) => (
                    <MobileRecordCard
                      key={s._id}
                      avatar={
                        <AuthImage path={s.profilePicture} alt={`${s.firstName} ${s.lastName}`} className="h-10 w-10 shrink-0 rounded-full object-cover" fallback={<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100"><span className="text-sm font-semibold text-green-600">{s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}</span></div>} />
                      }
                      title={getFullName(s)}
                      subtitle={s.email}
                      badges={getTestStatusBadge(s.testStatus)}
                      fields={[
                        { label: 'School', value: s.curriculum ? `${s.schoolName} · ${s.curriculum}` : s.schoolName, colSpan: 2, multiline: true },
                        { label: 'Grade', value: s.currentGrade },
                        {
                          label: 'Score',
                          value: s.testStatus === 'completed' && s.totalScore !== null ? `${s.totalScore} / ${s.maxScore}` : '—',
                          colSpan: 2,
                        },
                        {
                          label: 'Joined',
                          value: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—',
                        },
                      ]}
                      menuItems={[
                        {
                          label: 'View Details',
                          onClick: () => router.push(`/super-admin/roles/student/${s.studentDocId || s.userId}`),
                        },
                      ]}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Test Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={s.profilePicture}
                              alt={`${s.firstName} ${s.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                              fallback={
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-green-600 font-semibold text-sm">
                                    {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                                  </span>
                                </div>
                              }
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{getFullName(s)}</div>
                              <div className="text-sm text-gray-500">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{s.schoolName}</div>
                          <div className="text-sm text-gray-500">{s.curriculum}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.currentGrade}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(s.testStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {s.testStatus === 'completed' && s.totalScore !== null
                            ? `${s.totalScore} / ${s.maxScore}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <button
                            onClick={() => router.push(`/super-admin/roles/student/${s.studentDocId || s.userId}`)}
                            className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
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

            {/* Pagination footer */}
            {filteredStudents.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                <p className="text-sm text-gray-600">
                  Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}
