'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';
import AuthImage from '@/components/AuthImage';
import PageStatCard from '@/components/PageStatCard';
import ListPageFilters from '@/components/ListPageFilters';
import MobileRecordCard from '@/components/MobileRecordCard';
import {
  roleListTitleClass,
  roleListSubtitleClass,
  roleListBackBtnClass,
  roleListStatGridClass,
} from '@/components/studentDetailResponsive';

const TEST_STATUS_OPTIONS = [
  { value: '', label: 'All Test Status' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

interface IvyStudentItem {
  userId: string;
  studentId: string;
  studentIvyServiceId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
  testStatus?: string;
  totalScore?: number | null;
  maxScore?: number;
  createdAt: string;
}

function getTestStatusBadge(status?: string) {
  const map: Record<string, { label: string; className: string }> = {
    'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-700' },
    'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  };
  const s = map[status || 'not-started'] || map['not-started'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function IvyStudentsContent() {
  const router = useRouter();
  const [myStudents, setMyStudents] = useState<IvyStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-ivy-students`);
        if (res.data.success) setMyStudents(res.data.students);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const getStudentName = (s: IvyStudentItem) =>
    [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');

  const filteredStudents = myStudents.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      getStudentName(s).toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.schoolName || '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || (s.testStatus || 'not-started') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = myStudents.length;
  const completed = myStudents.filter((s) => s.testStatus === 'completed').length;
  const notStarted = myStudents.filter((s) => !s.testStatus || s.testStatus === 'not-started').length;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => router.push('/ivy-league/ivy-expert')}
          className={roleListBackBtnClass}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className={roleListTitleClass}>Ivy Students</h1>
        <p className={roleListSubtitleClass}>Students under your Ivy League guidance</p>
      </div>

      <div className={roleListStatGridClass}>
        <PageStatCard compact title="Total Students" mobileTitle="Total" value={total} color="green" onClick={() => { setSearchQuery(''); setStatusFilter(''); }} active={!statusFilter && !searchQuery} />
        <PageStatCard compact title="Test Completed" mobileTitle="Completed" value={completed} color="blue" onClick={() => { setSearchQuery(''); setStatusFilter('completed'); }} active={statusFilter === 'completed'} />
        <PageStatCard compact title="Not Started" mobileTitle="Not Started" value={notStarted} color="gray" onClick={() => { setSearchQuery(''); setStatusFilter('not-started'); }} active={statusFilter === 'not-started'} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
          <ListPageFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by name, email or school..."
            pillFilters={[{
              value: statusFilter,
              onChange: setStatusFilter,
              emptyValue: '',
              options: TEST_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
                mobileLabel: o.value === 'not-started' ? 'Not Started' : o.value === 'in-progress' ? 'In Progress' : o.value === 'completed' ? 'Completed' : 'All',
              })),
            }]}
            onClear={() => { setSearchQuery(''); setStatusFilter(''); }}
          />
        </div>

        <div className="divide-y divide-gray-200 md:hidden">
          {filteredStudents.length > 0 ? filteredStudents.map((s) => (
            <MobileRecordCard
              key={s.userId}
              avatar={
                <AuthImage
                  path={s.profilePicture}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  fallback={
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                      <span className="text-xs font-semibold text-green-600">
                        {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                      </span>
                    </div>
                  }
                />
              }
              title={getStudentName(s)}
              subtitle={s.email}
              badges={getTestStatusBadge(s.testStatus)}
              fields={[
                { label: 'School', value: s.schoolName || '—', colSpan: 2 },
                { label: 'Grade', value: s.currentGrade || '—' },
                {
                  label: 'Score',
                  value: s.testStatus === 'completed' && s.totalScore != null ? `${s.totalScore} / ${s.maxScore ?? 120}` : '—',
                },
                { label: 'Joined', value: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A', colSpan: 2 },
              ]}
              menuItems={[
                { label: 'View Details', onClick: () => router.push(`/ivy-league/ivy-expert/${s.studentId}?serviceId=${s.studentIvyServiceId}`) },
                { label: 'View Report', onClick: () => router.push(`/ivy-league/ivy-expert/student-report/${s.userId}`) },
              ]}
            />
          )) : (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">No students found</p>
              <p className="mt-1 text-xs text-gray-500">{searchQuery || statusFilter ? 'Try adjusting your filters' : 'Students will appear once candidates are converted'}</p>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">School</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Test Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AuthImage
                          path={s.profilePicture}
                          alt={`${s.firstName} ${s.lastName}`}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          fallback={
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                              <span className="text-green-600 font-semibold text-sm">
                                {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                              </span>
                            </div>
                          }
                        />
                        <div>
                          <div className="font-medium text-gray-900">{getStudentName(s)}</div>
                          <div className="text-sm text-gray-500">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{s.schoolName || '—'}</div>
                      <div className="text-sm text-gray-500">{s.curriculum || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.currentGrade || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(s.testStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {s.testStatus === 'completed' && s.totalScore !== null && s.totalScore !== undefined
                        ? `${s.totalScore} / ${s.maxScore ?? 120}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/ivy-league/ivy-expert/${s.studentId}?serviceId=${s.studentIvyServiceId}`)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => router.push(`/ivy-league/ivy-expert/student-report/${s.userId}`)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium"
                        >
                          View Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No students found</p>
                    <p className="text-sm text-gray-500">
                      {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Students will appear once candidates are converted'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {myStudents.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-gray-600 sm:text-sm">
              Showing {filteredStudents.length} of {myStudents.length} students
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IvyStudentsPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" /></div>}>
      <IvyStudentsContent />
    </Suspense>
  );
}
