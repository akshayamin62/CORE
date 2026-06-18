'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, archiveAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import MobileUserRecordCard from '@/components/MobileUserRecordCard';
import ListPageFilters from '@/components/ListPageFilters';

interface StaffArchiveContentProps {
  allowedRoles: string[];
  Layout: React.ComponentType<{ children: React.ReactNode; user: User }>;
  studentDetailPath: string;
  parentDetailPath?: string;
  counselorDetailPath?: string;
  referrerDetailPath?: string;
}

function StatCard({ title, value, color, onClick, active }: { title: string; value: string; color: string; onClick?: () => void; active?: boolean }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    teal: 'bg-teal-100 text-teal-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div
      className={`rounded-xl border bg-white p-3.5 shadow-sm sm:p-6 ${active ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'} ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-600 sm:text-sm">{title}</p>
          <p className="text-xl font-bold text-gray-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${colorClasses[color]}`}>
          <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function StaffArchiveContent({ allowedRoles, Layout, studentDetailPath, parentDetailPath, counselorDetailPath, referrerDetailPath }: StaffArchiveContentProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (!allowedRoles.includes(userData.role)) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchArchive();
      if (userData.role === USER_ROLE.ADMIN) {
        fetchReferrers();
      }
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const response = await archiveAPI.getStaffArchive();
      const data = response.data.data;
      setStudents(data.students || []);
      setParents(data.parents || []);
      setCounselors(data.counselors || []);
    } catch (error: any) {
      toast.error('Failed to fetch archived data');
      console.error('Fetch archive error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrers = async () => {
    try {
      const response = await adminAPI.getReferrers();
      const all = response.data.data.referrers || [];
      const archived = all.filter((r: any) =>
        r.stage === 'Closed' || (r.userId?.isVerified && !r.userId?.isActive)
      );
      setReferrers(archived);
    } catch (error: any) {
      console.error('Fetch archived referrers error:', error);
    }
  };

  // Build combined list
  const allItems = [
    ...(!typeFilter || typeFilter === 'student'
      ? students.map((s) => ({
          type: 'Student' as const,
          _id: s._id,
          userId: s.userId,
          name: getFullName(s.userId),
          email: s.userId?.email || '',
          details: s.adminId?.companyName || (s.counselorId ? getFullName(s.counselorId?.userId) : 'N/A'),
          createdAt: s.userId?.createdAt || s.createdAt,
          profilePicture: s.userId?.profilePicture,
          detailPath: studentDetailPath ? `${studentDetailPath}/${s._id}` : '',
        }))
      : []),
    ...(!typeFilter || typeFilter === 'parent'
      ? parents.map((p) => ({
          type: 'Parent' as const,
          _id: p._id,
          userId: p.userId,
          name: getFullName(p.userId),
          email: p.userId?.email || '',
          details:
            p.studentIds && p.studentIds.length > 0
              ? p.studentIds.map((s: any) => getFullName(s?.userId) || 'Unknown').join(', ')
              : 'No linked students',
          createdAt: p.userId?.createdAt || p.createdAt,
          profilePicture: p.userId?.profilePicture,
          detailPath: parentDetailPath ? `${parentDetailPath}/${p._id}` : '',
        }))
      : []),
    ...(!typeFilter || typeFilter === 'counselor'
      ? counselors.map((c) => ({
          type: 'Counselor' as const,
          _id: c._id,
          userId: c.userId,
          name: getFullName(c.userId),
          email: c.userId?.email || '',
          details: c.email || 'N/A',
          createdAt: c.userId?.createdAt || c.createdAt,
          profilePicture: c.userId?.profilePicture,
          detailPath: counselorDetailPath ? `${counselorDetailPath}/${c._id}` : '',
        }))
      : []),
    ...(!typeFilter || typeFilter === 'referrer'
      ? referrers.map((r) => ({
          type: 'Referrer' as const,
          _id: r._id,
          userId: r.userId,
          name: getFullName(r.userId),
          email: r.email || r.userId?.email || '',
          details: `Stage: ${r.stage || 'Closed'} · Slug: ${r.referralSlug || 'N/A'}`,
          createdAt: r.createdAt,
          profilePicture: r.userId?.profilePicture,
          detailPath: referrerDetailPath ? `${referrerDetailPath}/${r._id}` : '',
        }))
      : []),
  ];

  const filteredItems = allItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q)
    );
  });

  const totalStudents = students.length;
  const totalParents = parents.length;
  const totalCounselors = counselors.length;
  const totalReferrers = referrers.length;
  const totalArchived = totalStudents + totalParents + totalCounselors + totalReferrers;
  const isAdmin = user?.role === USER_ROLE.ADMIN;

  const handleActivateCounselor = async (counselorId: string) => {
    try {
      await adminAPI.toggleCounselorStatus(counselorId);
      toast.success('Counselor activated successfully');
      fetchArchive();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate counselor');
    }
  };

  const handleActivateReferrer = async (referrerId: string) => {
    try {
      await adminAPI.toggleReferrerStatus(referrerId);
      toast.success('Referrer activated and stage reset to New');
      fetchReferrers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate referrer');
    }
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
      <Toaster position="top-right" />
      <Layout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Archive</h1>
            <p className="mt-1 text-gray-600">Deactivated students{isAdmin ? ', parents, counselors and referrers' : ' and parents'}</p>
          </div>

          {/* Stats Cards */}
          <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-3'}`}>
            <StatCard
              title="Total Archived"
              value={totalArchived.toString()}
              color="red"
              onClick={() => setTypeFilter('')}
              active={!typeFilter}
            />
            <StatCard
              title="Archived Students"
              value={totalStudents.toString()}
              color="blue"
              onClick={() => setTypeFilter(typeFilter === 'student' ? '' : 'student')}
              active={typeFilter === 'student'}
            />
            <StatCard
              title="Archived Parents"
              value={totalParents.toString()}
              color="purple"
              onClick={() => setTypeFilter(typeFilter === 'parent' ? '' : 'parent')}
              active={typeFilter === 'parent'}
            />
            {isAdmin && (
              <StatCard
                title="Archived Counselors"
                value={totalCounselors.toString()}
                color="teal"
                onClick={() => setTypeFilter(typeFilter === 'counselor' ? '' : 'counselor')}
                active={typeFilter === 'counselor'}
              />
            )}
            {isAdmin && (
              <StatCard
                title="Archived Referrers"
                value={totalReferrers.toString()}
                color="orange"
                onClick={() => setTypeFilter(typeFilter === 'referrer' ? '' : 'referrer')}
                active={typeFilter === 'referrer'}
              />
            )}
          </div>

          {/* Search & Filters */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <div className="md:hidden">
                <ListPageFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Search by name, email..."
                  pillFilters={[
                    {
                      value: typeFilter,
                      onChange: setTypeFilter,
                      emptyValue: '',
                      options: [
                        { value: '', label: 'All Types', mobileLabel: 'All' },
                        { value: 'student', label: `Students (${totalStudents})`, mobileLabel: 'Students' },
                        { value: 'parent', label: `Parents (${totalParents})`, mobileLabel: 'Parents' },
                        ...(isAdmin
                          ? [
                              { value: 'counselor', label: `Counselors (${totalCounselors})`, mobileLabel: 'Counselors' },
                              { value: 'referrer', label: `Referrers (${totalReferrers})`, mobileLabel: 'Referrers' },
                            ]
                          : []),
                      ],
                    },
                  ]}
                  onClear={() => {
                    setSearchQuery('');
                    setTypeFilter('');
                  }}
                />
              </div>
              <div className="hidden md:grid md:grid-cols-3 md:gap-4">
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Types</option>
                  <option value="student">Students ({totalStudents})</option>
                  <option value="parent">Parents ({totalParents})</option>
                  {isAdmin && <option value="counselor">Counselors ({totalCounselors})</option>}
                  {isAdmin && <option value="referrer">Referrers ({totalReferrers})</option>}
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('');
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div>
              {filteredItems.length > 0 ? (
                <>
                <div className="divide-y divide-gray-200 md:hidden">
                  {filteredItems.map((item) => (
                    <MobileUserRecordCard
                      key={`${item.type}-${item._id}`}
                      avatar={
                        <AuthImage
                          path={item.profilePicture}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                          fallback={
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                              <span className="text-sm font-semibold text-red-600">{getInitials(item.userId)}</span>
                            </div>
                          }
                        />
                      }
                      title={item.name || 'N/A'}
                      subtitle={item.email}
                      badges={
                        <>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.type === 'Student' ? 'bg-blue-100 text-blue-800' : item.type === 'Counselor' ? 'bg-teal-100 text-teal-800' : item.type === 'Referrer' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type}
                          </span>
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">Deactivated</span>
                        </>
                      }
                      details={item.details || undefined}
                      joined={new Date(item.createdAt).toLocaleDateString('en-GB')}
                      menuItems={[
                        {
                          label: 'View Detail',
                          hidden: !item.detailPath,
                          onClick: () => router.push(item.detailPath!),
                        },
                        {
                          label: 'Activate',
                          variant: 'success',
                          hidden: !(isAdmin && (item.type === 'Counselor' || item.type === 'Referrer')),
                          onClick: () => item.type === 'Counselor' ? handleActivateCounselor(item._id) : handleActivateReferrer(item._id),
                        },
                      ]}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={`${item.type}-${item._id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={item.profilePicture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-red-600 font-semibold text-sm">{getInitials(item.userId)}</span>
                                </div>
                              }
                            />
                            <div>
                              <div className="font-medium text-gray-900">{item.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(item.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            item.type === 'Student' ? 'bg-blue-100 text-blue-800' : item.type === 'Counselor' ? 'bg-teal-100 text-teal-800' : item.type === 'Referrer' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.details}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Deactivated
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {item.detailPath && (
                              <button
                                onClick={() => router.push(item.detailPath)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                View Detail
                              </button>
                            )}
                            {isAdmin && item.type === 'Counselor' && (
                              <button
                                onClick={() => handleActivateCounselor(item._id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Activate
                              </button>
                            )}
                            {isAdmin && item.type === 'Referrer' && (
                              <button
                                onClick={() => handleActivateReferrer(item._id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
                </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <p className="mb-1 text-lg font-medium text-gray-900">No archived users found</p>
                    <p className="text-sm text-gray-500">
                      {searchQuery || typeFilter
                        ? 'Try adjusting your filters'
                        : 'Deactivated users will appear here'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          {totalArchived > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              Showing {filteredItems.length} of {totalArchived} total archived
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
