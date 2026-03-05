'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

interface IvyStudentItem {
  userId: string;
  studentId: string;
  studentIvyServiceId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
  createdAt: string;
}

function IvyStudentsContent() {
  const router = useRouter();
  const [myStudents, setMyStudents] = useState<IvyStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-ivy-students`);
        if (res.data.success) {
          setMyStudents(res.data.students);
        }
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
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return getStudentName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.schoolName || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading students...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="py-8 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ivy Students</h1>
          <p className="text-gray-600 text-sm">Candidates converted to students under your guidance</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">Total: <span className="font-bold text-gray-900">{myStudents.length}</span></p>
              </div>
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64 text-gray-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-2 text-gray-500 font-medium">No students converted yet</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">School</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((s) => (
                    <tr key={s.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{getStudentName(s)}</div>
                            <div className="text-sm text-gray-500">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{s.schoolName || '—'}</div>
                        <div className="text-sm text-gray-500">{s.curriculum || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.currentGrade || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/ivy-league/ivy-expert?studentId=${s.studentId}&userId=${s.userId}&studentIvyServiceId=${s.studentIvyServiceId}`)}
                            className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => router.push(`/ivy-league/ivy-expert/student-report/${s.userId}`)}
                            className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-purple-600 text-white hover:bg-purple-700"
                          >
                            View Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredStudents.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IvyStudentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
      <IvyStudentsContent />
    </Suspense>
  );
}
