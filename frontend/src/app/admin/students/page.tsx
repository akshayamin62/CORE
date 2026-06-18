'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminStudentAPI, adminTransferAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import { StudentMobileList } from '@/components/StudentMobileRecordCard';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import { ListPageStatGrid } from '@/components/SuperAdminRoleDetailFrame';

interface AdvisorInfo {
  _id: string;
  companyName?: string;
  userId?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
  };
}

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
      email: string;
    };
  };
  advisorId?: AdvisorInfo;
  registrationCount: number;
  serviceNames?: string[];
  createdAt: string;
  convertedFromLead?: {
    _id: string;
    name: string;
    email: string;
    mobileNumber?: string;
  };
}

interface Transfer {
  _id: string;
  studentId: {
    _id: string;
    userId: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  fromAdvisorId: {
    _id: string;
    companyName: string;
    email?: string;
  };
  interestedServices: string[];
  status: string;
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  'study-abroad': 'Study Abroad',
  'ivy-league': 'Ivy League',
  'education-planning': 'Education Planning',
  'coaching-classes': 'Coaching Classes',
};

interface UserStats {
  total: number;
  active: number;
  pendingTransfers: number;
  transferred: number;
}

type TransferFilter = 'all' | 'transferred' | 'pending';

export default function AdminStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferFilter, setTransferFilter] = useState<TransferFilter>('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('');
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, pendingTransfers: 0, transferred: 0 });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; transferId: string }>({ open: false, transferId: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      await Promise.all([fetchStudents(), fetchPendingTransfers()]);
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await adminStudentAPI.getStudents();
      const fetchedStudents = response.data.data.students;
      setStudents(fetchedStudents);
      if (response.data.data.isMainAdmin !== undefined) {
        setIsMainAdmin(response.data.data.isMainAdmin);
      }
      return fetchedStudents;
    } catch (error: any) {
      toast.error('Failed to fetch students');
      return [];
    }
  };

  const fetchPendingTransfers = async () => {
    try {
      const response = await adminTransferAPI.getPendingTransfers();
      const transfers = response.data.data?.transfers || [];
      setPendingTransfers(transfers);
      return transfers;
    } catch {
      return [];
    }
  };

  const refreshAll = async () => {
    const [fetchedStudents, fetchedTransfers] = await Promise.all([fetchStudents(), fetchPendingTransfers()]);
    const s = fetchedStudents as StudentData[];
    const t = fetchedTransfers as Transfer[];
    setStats({
      total: s.length,
      active: s.filter((s: StudentData) => s.user.isActive).length,
      pendingTransfers: t.length,
      transferred: s.filter((s: StudentData) => !!s.advisorId).length,
    });
  };

  useEffect(() => {
    if (students.length > 0 || pendingTransfers.length >= 0) {
      setStats({
        total: students.length,
        active: students.filter(s => s.user.isActive).length,
        pendingTransfers: pendingTransfers.length,
        transferred: students.filter(s => !!s.advisorId).length,
      });
    }
  }, [students, pendingTransfers]);

  const handleApprove = async (transferId: string) => {
    try {
      setActionLoading(transferId);
      await adminTransferAPI.approveTransfer(transferId);
      toast.success('Transfer approved — student moved to your account');
      await refreshAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason'); return; }
    try {
      setActionLoading(rejectModal.transferId);
      await adminTransferAPI.rejectTransfer(rejectModal.transferId, { reason: rejectReason });
      toast.success('Transfer rejected');
      setRejectModal({ open: false, transferId: '' });
      setRejectReason('');
      await refreshAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getFullName(student.user).toLowerCase();
    const counselorName = student.counselorId?.userId ? getFullName(student.counselorId.userId).toLowerCase() : '';
    const advisorName = student.advisorId?.companyName?.toLowerCase() || '';

    const matchesSearch =
      studentName.includes(query) ||
      student.user.email.toLowerCase().includes(query) ||
      student.mobileNumber?.includes(query) ||
      counselorName.includes(query) ||
      advisorName.includes(query);

    const matchesService = !serviceFilter || (student.serviceNames || []).includes(serviceFilter);
    const matchesCounselor = !counselorFilter || student.counselorId?._id === counselorFilter;

    if (transferFilter === 'transferred') return matchesSearch && matchesService && matchesCounselor && !!student.advisorId;
    return matchesSearch && matchesService && matchesCounselor && student.user.isActive !== false;
  });

  const availableServices = [...new Set(students.flatMap(s => s.serviceNames || []))].sort();
  const availableCounselors = students
    .filter(s => s.counselorId?.userId)
    .reduce<{ _id: string; name: string }[]>((acc, s) => {
      if (!acc.find(c => c._id === s.counselorId!._id)) {
        acc.push({ _id: s.counselorId!._id, name: getFullName(s.counselorId!.userId) });
      }
      return acc;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name));

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
      <AdminLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-5 md:mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Students</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">Manage students and incoming transfer requests</p>
          </div>

          {/* Stats Cards */}
          <ListPageStatGrid>
            <PageStatCard
              title="Total Students"
              value={stats.total}
              color="blue"
              active={transferFilter === 'all'}
              onClick={() => setTransferFilter('all')}
            />
            {isMainAdmin && (
              <PageStatCard
                title="Via Advisor"
                value={stats.transferred}
                color="purple"
                active={transferFilter === 'transferred'}
                onClick={() => setTransferFilter('transferred')}
              />
            )}
            {isMainAdmin && (
              <PageStatCard
                title="Pending Transfers"
                value={stats.pendingTransfers}
                color="yellow"
                active={transferFilter === 'pending'}
                onClick={() => setTransferFilter('pending')}
              />
            )}
            <PageStatCard title="Active" value={stats.active} color="green" />
          </ListPageStatGrid>

          {/* Pending Transfers Section */}
          {transferFilter === 'pending' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Pending Transfer Requests</h2>
              {pendingTransfers.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  No pending transfer requests
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTransfers.map((transfer) => (
                    <div key={transfer._id} className="bg-white rounded-xl border border-yellow-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {transfer.studentId?.userId?.firstName} {transfer.studentId?.userId?.middleName ? transfer.studentId.userId.middleName + ' ' : ''}{transfer.studentId?.userId?.lastName}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">Pending</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{transfer.studentId?.userId?.email}</p>
                          <p className="text-sm text-gray-600 mt-1">From: <span className="font-medium">{transfer.fromAdvisorId?.companyName}</span></p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {transfer.interestedServices?.map((s) => (
                              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{SERVICE_LABELS[s] || s}</span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Requested {new Date(transfer.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(transfer._id)}
                            disabled={actionLoading === transfer._id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60"
                          >
                            {actionLoading === transfer._id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, transferId: transfer._id })}
                            disabled={actionLoading === transfer._id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students Table */}
          {transferFilter !== 'pending' && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
                <div className="md:hidden">
                  <ListPageFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search by name, email, mobile..."
                    pillFilters={[
                      {
                        value: serviceFilter,
                        onChange: setServiceFilter,
                        emptyValue: '',
                        options: [
                          { value: '', label: 'All Services', mobileLabel: 'All' },
                          ...availableServices.map((s) => ({ value: s, label: s, mobileLabel: s.split(' ')[0] })),
                        ],
                      },
                      {
                        value: counselorFilter,
                        onChange: setCounselorFilter,
                        emptyValue: '',
                        options: [
                          { value: '', label: 'All Counselors', mobileLabel: 'All' },
                          ...availableCounselors.map((c) => ({
                            value: c._id,
                            label: c.name,
                            mobileLabel: c.name.split(' ')[0],
                          })),
                        ],
                      },
                      ...(isMainAdmin
                        ? [
                            {
                              value: transferFilter === 'all' ? '' : transferFilter,
                              onChange: (v: string) => setTransferFilter((v || 'all') as TransferFilter),
                              emptyValue: '',
                              options: [
                                { value: '', label: 'All Students', mobileLabel: 'All' },
                                { value: 'transferred', label: 'Via Advisor', mobileLabel: 'Advisor' },
                              ],
                            },
                          ]
                        : []),
                    ]}
                    onClear={() => {
                      setSearchQuery('');
                      setTransferFilter('all');
                      setServiceFilter('');
                      setCounselorFilter('');
                    }}
                  />
                </div>
                <div className="hidden md:block">
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="Search by name, email, mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-[220px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />

                  <div className="flex-1 min-w-[150px]">
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Services</option>
                      {availableServices.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <select
                      value={counselorFilter}
                      onChange={(e) => setCounselorFilter(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Counselors</option>
                      {availableCounselors.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {isMainAdmin ? (
                    <div className="flex-1 min-w-[150px]">
                      <select
                        value={transferFilter}
                        onChange={(e) => setTransferFilter(e.target.value as TransferFilter)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      >
                        <option value="all">All Students</option>
                        <option value="transferred">Via Advisor (Transferred)</option>
                      </select>
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => { setSearchQuery(''); setTransferFilter('all'); setServiceFilter(''); setCounselorFilter(''); }}
                    className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Clear Filters
                  </button>
                </div>
                </div>
              </div>

              <StudentMobileList
                students={filteredStudents}
                getMenuItems={(student) => [
                  {
                    label: 'View Details',
                    onClick: () => router.push(`/admin/students/${student._id}`),
                  },
                ]}
              />

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Counselor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin/Advisor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registrations</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.counselorId?.userId ? getFullName(student.counselorId.userId) : 'N/A'}
                          </td>
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
                              onClick={() => router.push(`/admin/students/${student._id}`)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <p className="text-lg font-medium text-gray-900 mb-1">No students found</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || serviceFilter || counselorFilter ? 'Try adjusting your search or filters' : 'Students will appear here once leads are converted'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="app-modal-panel bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Transfer</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={handleReject} disabled={!!actionLoading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-60">
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
              <button onClick={() => { setRejectModal({ open: false, transferId: '' }); setRejectReason(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
