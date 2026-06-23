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

interface IvyCandidate {
  _id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  profilePicture?: string;
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
}

const TEST_STATUS_OPTIONS = [
  { value: '', label: 'All Test Status' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function getTestStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-700' },
    'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  };
  const s = map[status] || map['not-started'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function IvyCandidatesContent() {
  const router = useRouter();
  const [myCandidates, setMyCandidates] = useState<IvyCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-candidates`);
        if (res.data.success) setMyCandidates(res.data.candidates);
      } catch (err: any) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const getCandidateName = (c: IvyCandidate) =>
    [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');

  const filteredCandidates = myCandidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      getCandidateName(c).toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.schoolName || '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || c.testStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = myCandidates.length;
  const completed = myCandidates.filter((c) => c.testStatus === 'completed').length;
  const notStarted = myCandidates.filter((c) => !c.testStatus || c.testStatus === 'not-started').length;

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
        <h1 className={roleListTitleClass}>Ivy Candidates</h1>
        <p className={roleListSubtitleClass}>Candidates assigned to you for evaluation</p>
      </div>

      <div className={roleListStatGridClass}>
        <PageStatCard
          compact
          title="Total Candidates"
          mobileTitle="Total"
          value={total}
          color="yellow"
          onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
          active={!statusFilter && !searchQuery}
        />
        <PageStatCard
          compact
          title="Test Completed"
          mobileTitle="Completed"
          value={completed}
          color="green"
          onClick={() => { setSearchQuery(''); setStatusFilter('completed'); }}
          active={statusFilter === 'completed'}
        />
        <PageStatCard
          compact
          title="Not Started"
          mobileTitle="Not Started"
          value={notStarted}
          color="gray"
          onClick={() => { setSearchQuery(''); setStatusFilter('not-started'); }}
          active={statusFilter === 'not-started'}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
          <ListPageFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by name, email or school..."
            pillFilters={[
              {
                value: statusFilter,
                onChange: setStatusFilter,
                emptyValue: '',
                options: TEST_STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  mobileLabel: o.value === 'not-started' ? 'Not Started' : o.value === 'in-progress' ? 'In Progress' : o.value === 'completed' ? 'Completed' : 'All',
                })),
              },
            ]}
            onClear={() => { setSearchQuery(''); setStatusFilter(''); }}
          />
        </div>

        <div className="divide-y divide-gray-200 md:hidden">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((c) => (
              <MobileRecordCard
                key={c._id}
                avatar={
                  <AuthImage
                    path={c.profilePicture}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    fallback={
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                        <span className="text-xs font-semibold text-amber-600">
                          {c.firstName?.charAt(0)?.toUpperCase() || ''}{c.lastName?.charAt(0)?.toUpperCase() || ''}
                        </span>
                      </div>
                    }
                  />
                }
                title={getCandidateName(c)}
                subtitle={c.email}
                badges={getTestStatusBadge(c.testStatus)}
                fields={[
                  { label: 'School', value: c.schoolName || '—', colSpan: 2 },
                  { label: 'Grade', value: c.currentGrade || '—' },
                  {
                    label: 'Score',
                    value:
                      c.testStatus === 'completed' && c.totalScore !== null
                        ? `${c.totalScore} / ${c.maxScore}`
                        : '—',
                  },
                  {
                    label: 'Joined',
                    value: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A',
                    colSpan: 2,
                  },
                ]}
                menuItems={[
                  {
                    label: 'View Details',
                    onClick: () => router.push(`/ivy-league/ivy-expert/candidates/${c.userId}`),
                  },
                ]}
              />
            ))
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">No candidates found</p>
              <p className="mt-1 text-xs text-gray-500">
                {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Candidates will appear once assigned to you'}
              </p>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">School</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Test Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AuthImage
                          path={c.profilePicture}
                          alt={`${c.firstName} ${c.lastName}`}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          fallback={
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                              <span className="text-amber-600 font-semibold text-sm">
                                {c.firstName?.charAt(0)?.toUpperCase() || ''}{c.lastName?.charAt(0)?.toUpperCase() || ''}
                              </span>
                            </div>
                          }
                        />
                        <div>
                          <div className="font-medium text-gray-900">{getCandidateName(c)}</div>
                          <div className="text-sm text-gray-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{c.schoolName || '—'}</div>
                      <div className="text-sm text-gray-500">{c.curriculum || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.currentGrade || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(c.testStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {c.testStatus === 'completed' && c.totalScore !== null
                        ? `${c.totalScore} / ${c.maxScore}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/ivy-league/ivy-expert/candidates/${c.userId}`)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No candidates found</p>
                    <p className="text-sm text-gray-500">
                      {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Candidates will appear once assigned to you'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {myCandidates.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-gray-600 sm:text-sm">
              Showing {filteredCandidates.length} of {myCandidates.length} candidates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IvyCandidatesPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" /></div>}>
      <IvyCandidatesContent />
    </Suspense>
  );
}
