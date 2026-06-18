'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import MobileRecordCard from '@/components/MobileRecordCard';
import PageStatCard from '@/components/PageStatCard';
import AddReferrerModal from '@/components/AddReferrerModal';

interface AdminData {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
}

interface ReferrerData {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    isActive: boolean;
  };
  adminId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
  };
  adminCompanyName?: string;
  email: string;
  mobileNumber?: string;  stage?: string;  referralSlug: string;
  leadCount: number;
  createdAt: string;
}

export default function SuperAdminReferrersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'archived'>('all');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
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
      fetchReferrers();
      fetchAdmins();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchReferrers = async () => {
    try {
      const response = await superAdminAPI.getReferrers();
      setReferrers(response.data.data.referrers);
    } catch (error: any) {
      toast.error('Failed to fetch referrers');
      console.error('Fetch referrers error:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.adminId) {
      toast.error('Please select an admin');
      return;
    }

    if (!formData.mobileNumber.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      toast.error('Invalid phone number format');
      return;
    }

    if (!formData.country.trim() || !formData.state.trim() || !formData.city.trim()) {
      toast.error('Country, state, and city are required');
      return;
    }

    if (!formData.qualification.trim() || !formData.currentRole.trim()) {
      toast.error('Qualification and current role are required');
      return;
    }

    setSubmitting(true);
    try {
      await superAdminAPI.createReferrer(formData);
      toast.success('Referrer created successfully!');
      setShowModal(false);
      setFormData({ firstName: '', middleName: '', lastName: '', email: '', mobileNumber: '', adminId: '', country: '', state: '', city: '', qualification: '', currentRole: '' });
      fetchReferrers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create referrer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (referrerId: string, isVerified: boolean, isActive: boolean) => {
    try {
      await superAdminAPI.toggleReferrerStatus(referrerId);
      if (!isVerified) {
        toast.success('Referrer verified and activated successfully');
      } else {
        toast.success(`Referrer ${isActive ? 'deactivated' : 'activated'} successfully`);
      }
      fetchReferrers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle referrer status');
    }
  };

  const filteredReferrers = referrers.filter((referrer) => {
    const referrerName = getFullName(referrer.userId).toLowerCase();
    const matchesSearch =
      referrerName.includes(searchQuery.toLowerCase()) ||
      referrer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (referrer.mobileNumber && referrer.mobileNumber.includes(searchQuery)) ||
      referrer.referralSlug.includes(searchQuery.toLowerCase());

    const isActive = referrer.userId?.isActive;
    const isVerified = referrer.userId?.isVerified;
    const isClosed = referrer.stage === 'Closed';
    const isArchived = isClosed || (isVerified && !isActive);
    let matchesStatus: boolean;
    if (stageFilter) {
      matchesStatus = (referrer.stage || 'New') === stageFilter;
    } else {
      matchesStatus =
        (statusFilter === 'all' && !isArchived) ||
        (statusFilter === 'active' && isVerified && isActive && !isClosed) ||
        (statusFilter === 'pending' && !isVerified && !isClosed) ||
        (statusFilter === 'archived' && isArchived);
    }

    const matchesAdmin =
      adminFilter === 'all' ||
      referrer.adminId?._id === adminFilter;

    return matchesSearch && matchesStatus && matchesAdmin;
  });

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
      <SuperAdminLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/super-admin/dashboard')}
            className="mb-4 flex items-center text-gray-600 transition-colors hover:text-gray-900 sm:mb-6"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">All Referrers</h2>
              <p className="mt-1 text-gray-600 sm:mt-2">Manage referrers across all admins</p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xl font-light leading-none text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-90 md:hidden"
              aria-label="Add Referrer"
            >
              +
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="hidden shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 md:flex"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Referrer
            </button>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            <PageStatCard
              title="Total"
              value={referrers.length}
              color="blue"
              onClick={() => { setStatusFilter('all'); setStageFilter(''); }}
              active={statusFilter === 'all' && !stageFilter}
            />
            <PageStatCard
              title="Active"
              value={referrers.filter(r => r.userId?.isVerified && r.userId?.isActive).length}
              color="green"
              onClick={() => { setStatusFilter('active'); setStageFilter(''); }}
              active={statusFilter === 'active' && !stageFilter}
            />
            <PageStatCard
              title="Pending"
              value={referrers.filter(r => !r.userId?.isVerified).length}
              color="amber"
              onClick={() => { setStatusFilter('pending'); setStageFilter(''); }}
              active={statusFilter === 'pending' && !stageFilter}
            />
            <PageStatCard
              title="Archived"
              value={referrers.filter(r => r.userId?.isVerified && !r.userId?.isActive).length}
              color="gray"
              onClick={() => { setStatusFilter('archived'); setStageFilter(''); }}
              active={statusFilter === 'archived' && !stageFilter}
            />
          </div>

          {/* Referrer Pipeline Overview */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Referrer Pipeline Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7">
              {/* Total */}
              <div
                onClick={() => setStageFilter('')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${!stageFilter ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.length}</h3>
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-gray-700 sm:mt-3 sm:text-sm">Total Referrers</p>
              </div>
              {/* New */}
              <div
                onClick={() => setStageFilter(stageFilter === 'New' ? '' : 'New')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'New' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => (r.stage || 'New') === 'New').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">New</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => (r.stage || 'New') === 'New').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Hot */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Hot' ? '' : 'Hot')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'Hot' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => r.stage === 'Hot').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Hot</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Hot').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Warm */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Warm' ? '' : 'Warm')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'Warm' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => r.stage === 'Warm').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Warm</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Warm').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Cold */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Cold' ? '' : 'Cold')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'Cold' ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => r.stage === 'Cold').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Cold</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Cold').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Converted */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Converted' ? '' : 'Converted')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'Converted' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => r.stage === 'Converted').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Converted</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Converted').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Closed */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Closed' ? '' : 'Closed')}
                className={`cursor-pointer rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-5 ${stageFilter === 'Closed' ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{referrers.filter(r => r.stage === 'Closed').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Closed</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Closed').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
            </div>
          </div>

          <AddReferrerModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
            submitting={submitting}
            formData={formData}
            setFormData={setFormData}
            admins={admins}
          />

          {/* Referrers Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-6">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search name, email, phone, or slug..."
                desktopColumns={4}
                pillFilters={[
                  {
                    value: statusFilter,
                    onChange: (v) => setStatusFilter(v as 'all' | 'active' | 'pending' | 'archived'),
                    emptyValue: 'all',
                    options: [
                      { value: 'all', label: 'All Status', mobileLabel: 'All' },
                      { value: 'active', label: 'Active' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'archived', label: 'Archived' },
                    ],
                  },
                  {
                    value: adminFilter,
                    onChange: setAdminFilter,
                    emptyValue: 'all',
                    options: [
                      { value: 'all', label: 'All Admins', mobileLabel: 'All Admins' },
                      ...admins.map((admin) => {
                        const label =
                          admin.companyName ||
                          [admin.firstName, admin.middleName, admin.lastName].filter(Boolean).join(' ');
                        return {
                          value: admin._id,
                          label,
                          mobileLabel:
                            admin.companyName?.split(' ')[0] ||
                            admin.firstName ||
                            label.slice(0, 10),
                        };
                      }),
                    ],
                  },
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setAdminFilter('all');
                  setStatusFilter('all');
                }}
              />
            </div>

            {referrers.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-500 text-lg">No referrers yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create First Referrer
                </button>
              </div>
            ) : filteredReferrers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-lg">No referrers found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
              </div>
            ) : (
              <>
              <div className="divide-y divide-gray-200 md:hidden">
                {filteredReferrers.map((referrer) => (
                  <MobileRecordCard
                    key={referrer._id}
                    avatar={
                      <AuthImage
                        path={referrer.userId.profilePicture}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        fallback={
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <span className="font-semibold text-blue-600">{getInitials(referrer.userId)}</span>
                          </div>
                        }
                      />
                    }
                    title={getFullName(referrer.userId)}
                    subtitle={referrer.email}
                    menuItems={[
                      {
                        label: 'View',
                        onClick: () => router.push(`/super-admin/referrers/${referrer._id}`),
                      },
                      {
                        label: !referrer.userId?.isVerified ? 'Activate' : referrer.userId?.isActive ? 'Deactivate' : 'Activate',
                        variant: !referrer.userId?.isVerified ? 'success' : referrer.userId?.isActive ? 'warning' : 'success',
                        onClick: () => handleToggleStatus(referrer._id, referrer.userId?.isVerified, referrer.userId?.isActive),
                      },
                    ]}
                    badges={
                      <>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          referrer.stage === 'Hot' ? 'bg-red-100 text-red-800' :
                          referrer.stage === 'Warm' ? 'bg-orange-100 text-orange-800' :
                          referrer.stage === 'Cold' ? 'bg-cyan-100 text-cyan-800' :
                          referrer.stage === 'Converted' ? 'bg-green-100 text-green-800' :
                          referrer.stage === 'Closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{referrer.stage || 'New'}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          !referrer.userId?.isVerified ? 'bg-amber-100 text-amber-700' :
                          referrer.userId?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{!referrer.userId?.isVerified ? 'Pending' : referrer.userId?.isActive ? 'Active' : 'Inactive'}</span>
                      </>
                    }
                    fields={[
                      {
                        label: 'Admin',
                        value: referrer.adminCompanyName || (referrer.adminId ? [referrer.adminId.firstName, referrer.adminId.middleName, referrer.adminId.lastName].filter(Boolean).join(' ') : 'N/A'),
                        colSpan: 2,
                      },
                      { label: 'Leads', value: referrer.leadCount },
                      { label: 'Phone', value: referrer.mobileNumber || 'N/A', colSpan: 2 },
                      { label: 'Created', value: new Date(referrer.createdAt).toLocaleDateString('en-GB') },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-237.5">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReferrers.map((referrer) => (
                    <tr key={referrer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AuthImage
                            path={referrer.userId.profilePicture}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover mr-3"
                            fallback={
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-blue-600 font-semibold">
                                  {getInitials(referrer.userId)}
                                </span>
                              </div>
                            }
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getFullName(referrer.userId)}
                            </div>
                            <div className="text-sm text-gray-500">{referrer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900 text-sm">
                          {referrer.adminCompanyName || (referrer.adminId ? [referrer.adminId.firstName, referrer.adminId.middleName, referrer.adminId.lastName].filter(Boolean).join(' ') : 'N/A')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {referrer.mobileNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {referrer.leadCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          referrer.stage === 'Hot' ? 'bg-red-100 text-red-800' :
                          referrer.stage === 'Warm' ? 'bg-orange-100 text-orange-800' :
                          referrer.stage === 'Cold' ? 'bg-cyan-100 text-cyan-800' :
                          referrer.stage === 'Converted' ? 'bg-green-100 text-green-800' :
                          referrer.stage === 'Closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {referrer.stage || 'New'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          !referrer.userId?.isVerified ? 'bg-amber-100 text-amber-700' :
                          referrer.userId?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {!referrer.userId?.isVerified ? 'Pending' : referrer.userId?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(referrer.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/super-admin/referrers/${referrer._id}`)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            View Detail
                          </button>
                          <button
                            onClick={() => handleToggleStatus(referrer._id, referrer.userId?.isVerified, referrer.userId?.isActive)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              !referrer.userId?.isVerified
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : referrer.userId?.isActive
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {!referrer.userId?.isVerified ? 'Verify & Activate' : referrer.userId?.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}
