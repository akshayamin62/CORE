'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminAPI, leadAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import AddReferrerModal from '@/components/AddReferrerModal';
import ListPageFilters from '@/components/ListPageFilters';
import MobileRecordCard from '@/components/MobileRecordCard';

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
  email: string;
  mobileNumber?: string;
  stage?: string;
  referralSlug: string;
  leadCount: number;
  createdAt: string;
}

export default function ReferrersListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'archived'>('all');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [referrerRegUrl, setReferrerRegUrl] = useState('');
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

      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied. Admin only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchReferrers();
      fetchReferrerRegUrl();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchReferrers = async () => {
    try {
      const response = await adminAPI.getReferrers();
      setReferrers(response.data.data.referrers);
    } catch (error: any) {
      toast.error('Failed to fetch referrers');
      console.error('Fetch referrers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await adminAPI.createReferrer(formData);
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

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (referrerId: string, isVerified: boolean, isActive: boolean) => {
    try {
      await adminAPI.toggleReferrerStatus(referrerId);
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

  const fetchReferrerRegUrl = async () => {
    try {
      const response = await leadAPI.getEnquiryFormUrl();
      const slug = response.data.data.slug;
      if (slug) {
        setReferrerRegUrl(`${window.location.origin}/become-referrer/${slug}`);
      }
    } catch {
      // ignore
    }
  };

  const copyReferralLink = (slug: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/referral/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedSlug(null), 2000);
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
      <AdminLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors md:mb-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Referrers</h2>
              <p className="mt-1 text-gray-600 sm:mt-2">
                Manage referrers and their referral links
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="hidden shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 md:flex"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Referrer
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg md:hidden"
              aria-label="Add referrer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              onClick={() => { setStatusFilter('all'); setStageFilter(''); }}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' && !stageFilter ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Total</p>
            </div>
            <div
              onClick={() => { setStatusFilter('active'); setStageFilter(''); }}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'active' && !stageFilter ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.userId?.isVerified && r.userId?.isActive).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Active</p>
            </div>
            <div
              onClick={() => { setStatusFilter('pending'); setStageFilter(''); }}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' && !stageFilter ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => !r.userId?.isVerified).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Pending</p>
            </div>
            <div
              onClick={() => { setStatusFilter('archived'); setStageFilter(''); }}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'archived' && !stageFilter ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.userId?.isVerified && !r.userId?.isActive).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Archived</p>
            </div>
          </div>

          {/* Referrer Pipeline Overview */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Referrer Pipeline Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Total */}
              <div
                onClick={() => setStageFilter('')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${!stageFilter ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.length}</h3>
                </div>
                <p className="text-sm font-semibold text-gray-700 mt-3">Total Referrers</p>
              </div>
              {/* New */}
              <div
                onClick={() => setStageFilter(stageFilter === 'New' ? '' : 'New')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'New' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => (r.stage || 'New') === 'New').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">New</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => (r.stage || 'New') === 'New').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Hot */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Hot' ? '' : 'Hot')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'Hot' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.stage === 'Hot').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Hot</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Hot').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Warm */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Warm' ? '' : 'Warm')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'Warm' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.stage === 'Warm').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Warm</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Warm').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Cold */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Cold' ? '' : 'Cold')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'Cold' ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.stage === 'Cold').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Cold</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Cold').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Converted */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Converted' ? '' : 'Converted')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'Converted' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.stage === 'Converted').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Converted</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Converted').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
              {/* Closed */}
              <div
                onClick={() => setStageFilter(stageFilter === 'Closed' ? '' : 'Closed')}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${stageFilter === 'Closed' ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.stage === 'Closed').length}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-semibold text-gray-700">Closed</p>
                  <p className="text-sm font-semibold text-gray-900">{referrers.length > 0 ? ((referrers.filter(r => r.stage === 'Closed').length / referrers.length) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search name, email, phone, or slug..."
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
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setStageFilter('');
                }}
              />
            </div>
          </div>

          {referrerRegUrl && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Referrer Registration Link</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono break-all">{referrerRegUrl}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referrerRegUrl);
                  toast.success('Registration link copied!');
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1.5 shrink-0 ml-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </button>
            </div>
          )}

          <AddReferrerModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
            submitting={submitting}
            formData={formData}
            setFormData={setFormData}
          />

          {/* Referrers Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {referrers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-500 text-lg">No referrers yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Your First Referrer
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                            <span className="font-semibold text-purple-600">{getInitials(referrer.userId)}</span>
                          </div>
                        }
                      />
                    }
                    title={getFullName(referrer.userId)}
                    subtitle={referrer.email}
                    menuItems={[
                      {
                        label: 'View',
                        onClick: () => router.push(`/admin/referrers/${referrer._id}`),
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
                      { label: 'Leads', value: referrer.leadCount },
                      { label: 'Phone', value: referrer.mobileNumber || 'N/A', colSpan: 2 },
                      { label: 'Created', value: new Date(referrer.createdAt).toLocaleDateString('en-GB') },
                    ]}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
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
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-purple-600 font-semibold">
                                  {getInitials(referrer.userId)}
                                </span>
                              </div>
                            }
                          />
                          <div className="font-medium text-gray-900">{getFullName(referrer.userId) || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {referrer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {referrer.mobileNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                          {referrer.leadCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            !referrer.userId?.isVerified
                              ? 'bg-amber-100 text-amber-800'
                              : referrer.userId?.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {!referrer.userId?.isVerified ? 'Pending' : referrer.userId?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                        {new Date(referrer.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/referrers/${referrer._id}`)}
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

          {referrers.length > 0 && (
            <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
              <span>
                Showing {filteredReferrers.length} of {referrers.length} referrer{referrers.length !== 1 ? 's' : ''}
              </span>
              {(searchQuery || statusFilter !== 'active') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('active');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
