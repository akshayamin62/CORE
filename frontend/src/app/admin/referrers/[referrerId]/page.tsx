'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

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
    email: string;
    mobileNumber?: string;
      country?: string;
      state?: string;
      city?: string;
      qualification?: string;
      currentRole?: string;
    stage?: string;
    referralSlug: string;
    createdAt: string;
  };
  leads: LeadData[];
  stageCounts: Record<string, number>;
  totalStudents: number;
}

export default function AdminReferrerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const referrerId = params.referrerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<ReferrerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReferrerStage, setSelectedReferrerStage] = useState<string>('');
  const [savingStage, setSavingStage] = useState(false);

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
      fetchDashboard();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getReferrerDashboard(referrerId);
      setDashboard(response.data.data);
      setSelectedReferrerStage(response.data.data.referrer.stage || 'New');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load referrer dashboard');
      router.push('/admin/referrers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReferrerStage = async () => {
    if (!dashboard || !selectedReferrerStage) return;
    setSavingStage(true);
    try {
      await adminAPI.updateReferrerStage(referrerId, selectedReferrerStage);
      setDashboard(prev => prev ? { ...prev, referrer: { ...prev.referrer, stage: selectedReferrerStage } } : prev);
      toast.success('Referrer stage updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setSavingStage(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800';
      case LEAD_STAGE.HOT: return 'bg-red-100 text-red-800';
      case LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800';
      case LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800';
      case LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      case LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyReferralLink = () => {
    if (!dashboard) return;
    const link = `${window.location.origin}/referral/${dashboard.referrer.referralSlug}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
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
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/referrers')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Referrers
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Referrer Dashboard</h1>
            <p className="text-gray-600 mt-1">Leads referred by this referrer</p>
          </div>

          {/* Referrer Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <AuthImage
                path={referrerUser.profilePicture}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
                fallback={
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">{getInitials(referrerUser)}</span>
                  </div>
                }
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900">{getFullName(referrerUser)}</h2>
                  {!referrerUser.isVerified ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Pending</span>
                  ) : referrerUser.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{referrerUser.email}</p>
                {dashboard.referrer.mobileNumber && (
                  <p className="text-sm text-gray-500">{dashboard.referrer.mobileNumber}</p>
                )}
                {dashboard.referrer.country && (
                  <p className="text-sm text-gray-500">{[dashboard.referrer.city, dashboard.referrer.state, dashboard.referrer.country].filter(Boolean).join(', ')}</p>
                )}
                {dashboard.referrer.qualification && (
                  <p className="text-sm text-gray-500">Qualification: {dashboard.referrer.qualification}</p>
                )}
                {dashboard.referrer.currentRole && (
                  <p className="text-sm text-gray-500">Current Role: {dashboard.referrer.currentRole}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Referrer Stage Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Stage:</label>
                {dashboard.referrer.stage === 'Converted' ? (
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">Converted (locked)</span>
                ) : (
                  <>
                    <select
                      value={selectedReferrerStage}
                      onChange={(e) => setSelectedReferrerStage(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {['New', 'Hot', 'Warm', 'Cold', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveReferrerStage}
                      disabled={savingStage || selectedReferrerStage === (dashboard.referrer.stage || 'New')}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {savingStage ? 'Saving...' : 'Save'}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Copy Referral Link
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stages</option>
                  {Object.values(LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStageFilter('');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500">No referral leads match current filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                              <span key={service} className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
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
                            onClick={() => router.push(`/admin/leads/${lead._id}`)}
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
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {showPercentage && percentage !== undefined && (
          <p className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}
