'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import EditReferrerModal, { ReferrerEditFormData } from '@/components/EditReferrerModal';
import ReferrerQuickActions from '@/components/ReferrerQuickActions';
import { AdminOption } from '@/components/AddReferrerModal';
import { toDatetimeLocalValue, datetimeLocalToISO } from '@/utils/datetimeLocal';
import SuperAdminRoleDetailFrame, {
  DetailInfoCard,
  DetailPageHeader,
  ListPageStatGrid,
} from '@/components/SuperAdminRoleDetailFrame';
import ListPageFilters from '@/components/ListPageFilters';
import LeadMobileList, {
  getLeadServiceColor,
  getLeadStageColor,
  LEAD_STAGE_FILTER_OPTIONS,
} from '@/components/LeadMobileList';
import PageStatCard from '@/components/PageStatCard';

interface LeadData {
  _id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  city?: string;
  serviceTypes?: string[];
  stage: string;
  source?: string;
  createdAt: string;
}

interface ReferrerNote {
  _id: string;
  text: string;
  noteDate: string;
  createdByRole: string;
  createdByName?: string;
  createdAt: string;
}

interface ReferrerDashboard {
  referrer: {
    _id: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
      profilePicture?: string;
      isActive: boolean;
      isVerified: boolean;
      createdAt: string;
    };
    adminId?: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
    };
    adminCompanyName?: string;
    email: string;
    mobileNumber?: string;
    country?: string;
    state?: string;
    city?: string;
    qualification?: string;
    currentRole?: string;
    stage?: string;
    referralSlug: string;
    notes: ReferrerNote[];
    createdAt: string;
  };
  leads: LeadData[];
  stageCounts: Record<string, number>;
  totalStudents: number;
}

export default function SuperAdminReferrerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const referrerId = params.referrerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<ReferrerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteDate, setNoteDate] = useState(() => toDatetimeLocalValue());
  const [addingNote, setAddingNote] = useState(false);
  const [activeSection, setActiveSection] = useState<'leads' | 'notes'>('leads');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [editFormData, setEditFormData] = useState<ReferrerEditFormData>({
    email: '',
    mobileNumber: '',
    adminId: '',
    country: '',
    state: '',
    city: '',
    qualification: '',
    currentRole: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin only.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchDashboard();
      fetchAdmins();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await superAdminAPI.getReferrerDashboard(referrerId);
      setDashboard(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load referrer dashboard');
      router.push('/super-admin/referrers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await superAdminAPI.getUsers({ role: 'ADMIN', isActive: true });
      const adminUsers = response.data.data.users || [];
      setAdmins(adminUsers.map((u: any) => ({
        _id: u._id,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        email: u.email,
        companyName: u.companyName,
      })));
    } catch (error: any) {
      console.error('Fetch admins error:', error);
    }
  };

  const openEditReferrer = () => {
    if (!dashboard) return;
    const r = dashboard.referrer;
    setEditFormData({
      email: r.email || '',
      mobileNumber: r.mobileNumber || '',
      adminId: r.adminId?._id || '',
      country: r.country || '',
      state: r.state || '',
      city: r.city || '',
      qualification: r.qualification || '',
      currentRole: r.currentRole || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard) return;

    if (!editFormData.mobileNumber.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(editFormData.mobileNumber.trim())) {
      toast.error('Invalid phone number format');
      return;
    }

    if (!editFormData.adminId) {
      toast.error('Please select an admin');
      return;
    }

    setEditingSubmitting(true);
    try {
      await superAdminAPI.updateReferrer(referrerId, editFormData);
      toast.success('Referrer updated successfully!');
      setShowEditModal(false);
      await fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update referrer');
    } finally {
      setEditingSubmitting(false);
    }
  };

  const getStageColor = getLeadStageColor;
  const getServiceColor = getLeadServiceColor;

  const copyReferralLink = () => {
    if (!dashboard) return;
    const link = `${window.location.origin}/referral/${dashboard.referrer.referralSlug}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !noteDate) return;
    setAddingNote(true);
    try {
      const response = await superAdminAPI.addReferrerNote(referrerId, {
        text: newNote.trim(),
        noteDate: datetimeLocalToISO(noteDate),
      });
      setDashboard(prev => prev ? { ...prev, referrer: { ...prev.referrer, notes: response.data.data.notes } } : prev);
      setNewNote('');
      setNoteDate(toDatetimeLocalValue());
      toast.success('Note added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleStartEditNote = (note: ReferrerNote) => {
    setEditingNoteId(note._id);
    setEditNoteText(note.text);
    setEditNoteDate(toDatetimeLocalValue(note.noteDate));
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editNoteText.trim() || !editNoteDate) return;
    setSavingEdit(true);
    try {
      const response = await superAdminAPI.updateReferrerNote(referrerId, editingNoteId, {
        text: editNoteText.trim(),
        noteDate: datetimeLocalToISO(editNoteDate),
      });
      setDashboard(prev => prev ? { ...prev, referrer: { ...prev.referrer, notes: response.data.data.notes } } : prev);
      setEditingNoteId(null);
      toast.success('Note updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      const response = await superAdminAPI.deleteReferrerNote(referrerId, noteId);
      setDashboard(prev => prev ? { ...prev, referrer: { ...prev.referrer, notes: response.data.data.notes } } : prev);
      toast.success('Note deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

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

  if (!dashboard) return null;

  const referrerUser = dashboard.referrer.userId;
  const allLeads = dashboard.leads;
  const adminInfo = dashboard.referrer.adminId;
  const adminLabel = dashboard.referrer.adminCompanyName ||
    (adminInfo ? [adminInfo.firstName, adminInfo.middleName, adminInfo.lastName].filter(Boolean).join(' ') : 'N/A');

  const filteredLeads = allLeads.filter((lead) => {
    const matchesStage = !stageFilter || lead.stage === stageFilter;
    const matchesSearch =
      !searchQuery ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.mobileNumber && lead.mobileNumber.includes(searchQuery));
    return matchesStage && matchesSearch;
  });

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <SuperAdminRoleDetailFrame
          backLabel="Back to Referrers"
          onBack={() => router.push('/super-admin/referrers')}
        >
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
            <DetailPageHeader
              title={getFullName(referrerUser)}
              subtitle={
                <a href={`mailto:${referrerUser.email}`} className="text-blue-600 hover:underline">
                  {referrerUser.email}
                </a>
              }
              avatar={
                <AuthImage
                  path={referrerUser.profilePicture}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm sm:h-14 sm:w-14"
                  fallback={
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 shadow-sm sm:h-14 sm:w-14">
                      <span className="text-lg font-bold text-blue-600">{getInitials(referrerUser)}</span>
                    </div>
                  }
                />
              }
            />
            <ReferrerQuickActions
              email={dashboard.referrer.email || referrerUser.email}
              mobileNumber={dashboard.referrer.mobileNumber}
              onEdit={openEditReferrer}
            />
          </div>

          <DetailInfoCard>
            <div className="flex flex-wrap items-center gap-2">
              {!referrerUser.isVerified ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Pending</span>
              ) : referrerUser.isActive ? (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Active</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Inactive</span>
              )}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  dashboard.referrer.stage === 'Hot'
                    ? 'bg-red-100 text-red-800'
                    : dashboard.referrer.stage === 'Warm'
                      ? 'bg-orange-100 text-orange-800'
                      : dashboard.referrer.stage === 'Cold'
                        ? 'bg-cyan-100 text-cyan-800'
                        : dashboard.referrer.stage === 'Converted'
                          ? 'bg-green-100 text-green-800'
                          : dashboard.referrer.stage === 'Closed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                }`}
              >
                {dashboard.referrer.stage || 'New'}
              </span>
            </div>
            <div className="w-full text-sm">
              <span className="text-gray-500">Admin: </span>
              <span className="text-gray-900">{adminLabel}</span>
            </div>
            <div className="w-full text-sm">
              <span className="text-gray-500">Phone: </span>
              {dashboard.referrer.mobileNumber ? (
                <a
                  href={`https://wa.me/${dashboard.referrer.mobileNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {dashboard.referrer.mobileNumber}
                </a>
              ) : (
                <span className="text-gray-900">—</span>
              )}
            </div>
            <button
              type="button"
              onClick={copyReferralLink}
              className="w-full rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 sm:w-auto"
            >
              Copy Referral Link
            </button>
          </DetailInfoCard>

          <div className="mb-4 hidden gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6 md:grid md:grid-cols-2 lg:grid-cols-3">
            <ReferrerInfoItem label="Email" value={referrerUser.email} href={`mailto:${referrerUser.email}`} />
            <ReferrerInfoItem
              label="Mobile"
              value={dashboard.referrer.mobileNumber || '—'}
              href={
                dashboard.referrer.mobileNumber
                  ? `https://wa.me/${dashboard.referrer.mobileNumber.replace(/[^0-9]/g, '')}`
                  : undefined
              }
              external={!!dashboard.referrer.mobileNumber}
            />
            <ReferrerInfoItem
              label="Location"
              value={[dashboard.referrer.city, dashboard.referrer.state, dashboard.referrer.country].filter(Boolean).join(', ') || '—'}
            />
            <ReferrerInfoItem label="Qualification" value={dashboard.referrer.qualification || '—'} />
            <ReferrerInfoItem label="Current Role" value={dashboard.referrer.currentRole || '—'} />
            <ReferrerInfoItem
              label="Member Since"
              value={new Date(referrerUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            />
            <ReferrerInfoItem label="Admin" value={adminLabel} />
            <ReferrerInfoItem label="Referral Slug" value={dashboard.referrer.referralSlug} />
            <ReferrerInfoItem label="Total Leads" value={String(allLeads.length)} />
          </div>

          <ListPageStatGrid columns={3}>
            <PageStatCard title="Total Leads" mobileTitle="Leads" value={allLeads.length} color="blue" />
            <PageStatCard title="Students" mobileTitle="Students" value={dashboard.totalStudents} color="green" />
            <PageStatCard
              title="Converted"
              mobileTitle="Converted"
              value={dashboard.stageCounts?.[LEAD_STAGE.CONVERTED] || 0}
              color="purple"
            />
          </ListPageStatGrid>

          {/* Section Toggle */}
          <div className="mb-4 flex justify-end">
            {activeSection === 'leads' ? (
              <button
                onClick={() => setActiveSection('notes')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Notes
                {dashboard.referrer.notes?.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{dashboard.referrer.notes.length}</span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setActiveSection('leads')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Leads
                <span className="ml-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{allLeads.length}</span>
              </button>
            )}
          </div>

          {/* Notes Section */}
          {activeSection === 'notes' && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Notes</h3>
            {/* Add Note Form */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter a note..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="datetime-local"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim() || !noteDate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>
            </div>
            {/* Notes List */}
            {(!dashboard.referrer.notes || dashboard.referrer.notes.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {[...dashboard.referrer.notes].reverse().map((note) => (
                  <div key={note._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {editingNoteId === note._id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <textarea
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={editNoteDate}
                            onChange={(e) => setEditNoteDate(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSaveEditNote}
                            disabled={savingEdit || !editNoteText.trim()}
                            title="Save"
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            title="Cancel"
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-gray-400">
                              {new Date(note.noteDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              note.createdByRole === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {note.createdByName || (note.createdByRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin')}{' '}({note.createdByRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'})
                            </span>
                          </div>
                        </div>
                        {note.createdByRole === 'SUPER_ADMIN' && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditNote(note)}
                              title="Edit note"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note._id)}
                              disabled={deletingNoteId === note._id}
                              title="Delete note"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Leads Section */}
          {activeSection === 'leads' && (
          <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
              <div className="md:hidden">
                <ListPageFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Search by name, email or phone..."
                  pillFilters={[
                    {
                      value: stageFilter,
                      onChange: setStageFilter,
                      options: LEAD_STAGE_FILTER_OPTIONS,
                    },
                  ]}
                  onClear={() => {
                    setStageFilter('');
                    setSearchQuery('');
                  }}
                />
              </div>
              <div className="hidden md:flex md:flex-wrap md:gap-4">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, email or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="min-w-[150px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Stage</label>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stages</option>
                    {Object.values(LEAD_STAGE).map((stage) => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStageFilter('');
                      setSearchQuery('');
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="mx-auto mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mb-1 text-lg font-medium text-gray-900">No leads found</h3>
                <p className="text-gray-500">No referral leads match current filters</p>
              </div>
            ) : (
              <>
                <LeadMobileList
                  leads={filteredLeads.map((lead) => ({
                    ...lead,
                    mobileNumber: lead.mobileNumber || '',
                    serviceTypes: lead.serviceTypes || [],
                  }))}
                  getStageColor={getStageColor}
                  getServiceColor={getServiceColor}
                  getMenuItems={(lead) => [
                    {
                      label: 'View',
                      onClick: () => router.push(`/super-admin/leads/${lead._id}`),
                    },
                  ]}
                />
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-1/4 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
                      <th className="w-1/4 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="w-1/6 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                            <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                            <p className="text-sm text-gray-500">{lead.mobileNumber || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {lead.serviceTypes?.map((service) => (
                              <span key={service} className={`rounded-full px-2 py-1 text-xs font-medium ${getServiceColor(service)}`}>
                                {service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => router.push(`/super-admin/leads/${lead._id}`)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
          </>
          )}
        </SuperAdminRoleDetailFrame>
        <EditReferrerModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          submitting={editingSubmitting}
          formData={editFormData}
          setFormData={setEditFormData}
          referrerName={dashboard ? getFullName(dashboard.referrer.userId) : ''}
          admins={admins}
        />
      </SuperAdminLayout>
    </>
  );
}

// Referrer Info Item Component
function ReferrerInfoItem({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      {href && value !== '—' ? (
        <a
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-sm font-semibold text-blue-600 hover:underline wrap-break-word"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm font-semibold text-gray-800 wrap-break-word">{value}</p>
      )}
    </div>
  );
}
