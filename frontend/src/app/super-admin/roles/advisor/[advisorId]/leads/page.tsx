'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import ListPageFilters from '@/components/ListPageFilters';
import LeadMobileList, { getLeadServiceColor, getLeadStageColor, LEAD_SERVICE_FILTER_OPTIONS } from '@/components/LeadMobileList';

interface LeadData {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  city?: string;
  serviceTypes: string[];
  stage: string;
  assignedCounselorId?: {
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  };
  conversionStatus?: string;
  createdAt: string;
}

interface LeadStats {
  total: number;
  new: number;
  hot: number;
  warm: number;
  cold: number;
  converted: number;
  closed: number;
  unassigned: number;
}

export default function SuperAdminAdvisorLeadsPage() {
  const router = useRouter();
  const params = useParams();
  const advisorId = params.advisorId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) fetchLeads();
  }, [currentUser, stageFilter]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setCurrentUser(userData);
    } catch (error) {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (stageFilter) params.stage = stageFilter;
      const response = await superAdminAPI.getAdvisorLeads(advisorId, params);
      setLeads(response.data.data.leads);
      setStats(response.data.data.stats);
    } catch (error: any) {
      toast.error('Failed to fetch leads');
      console.error('Fetch leads error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageCardClick = (stage: string) => {
    if (selectedStageCard === stage) {
      setSelectedStageCard(null);
      setStageFilter('');
    } else {
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    let matches = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matches = (lead.name || '').toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.mobileNumber.includes(q) ||
        (lead.city ? lead.city.toLowerCase().includes(q) : false);
    }
    if (matches && serviceFilter) {
      matches = lead.serviceTypes.includes(serviceFilter);
    }
    return matches;
  });

  const getStageColor = getLeadStageColor;
  const getServiceColor = getLeadServiceColor;

  const stageCards = [
    { title: 'Total Leads', key: 'total', stage: '', color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { title: 'New', key: 'new', stage: LEAD_STAGE.NEW, color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> },
    { title: 'Hot', key: 'hot', stage: LEAD_STAGE.HOT, color: 'red' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg> },
    { title: 'Warm', key: 'warm', stage: LEAD_STAGE.WARM, color: 'orange' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { title: 'Cold', key: 'cold', stage: LEAD_STAGE.COLD, color: 'cyan' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> },
    { title: 'Converted', key: 'converted', stage: LEAD_STAGE.CONVERTED, color: 'green' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { title: 'Closed', key: 'closed', stage: LEAD_STAGE.CLOSED, color: 'gray' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> },
  ];

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push(`/super-admin/roles/advisor/${advisorId}`)}
            className="mb-4 flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900 sm:mb-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Advisor Dashboard
          </button>

          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Advisor&apos;s Leads</h2>
            <p className="mt-1 text-gray-600">View leads under this advisor (read-only)</p>
          </div>

          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {stageCards.map((card) => {
                const value = stats[card.key as keyof LeadStats] || 0;
                const percentage = stats.total > 0 ? (value / stats.total) * 100 : 0;
                const isActive = selectedStageCard === card.stage;
                return (
                  <StatCard
                    key={card.key}
                    title={card.title}
                    value={value.toString()}
                    icon={card.icon}
                    color={card.color}
                    onClick={() => card.stage ? handleStageCardClick(card.stage) : (() => { setSelectedStageCard(null); setStageFilter(''); })()}
                    isActive={isActive}
                    percentage={card.key !== 'total' ? percentage : undefined}
                    showPercentage={card.key !== 'total'}
                  />
                );
              })}
            </div>
          )}

          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email, phone..."
                pillFilters={[
                  {
                    value: serviceFilter,
                    onChange: setServiceFilter,
                    options: LEAD_SERVICE_FILTER_OPTIONS,
                  },
                ]}
                onClear={() => {
                  setSearchQuery('');
                  setServiceFilter('');
                  setSelectedStageCard(null);
                  setStageFilter('');
                }}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No leads found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <LeadMobileList
                  leads={filteredLeads}
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
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Services</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-xs text-gray-500">{lead.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.mobileNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {lead.serviceTypes.map((service, idx) => (
                              <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                                {service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/super-admin/leads/${lead._id}`)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                          >
                            View Detail
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

          {/* Results count */}
          {leads.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing {filteredLeads.length} of {leads.length} total leads
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
  };

  return (
    <div
      className={`rounded-xl border-2 bg-white p-3.5 shadow-sm transition-all sm:p-5 ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
      } ${
        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${colorClasses[color]} [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-6 sm:[&>svg]:w-6`}>
          {icon}
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{value}</h3>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
        <p className="truncate text-xs font-semibold text-gray-700 sm:text-sm">{title}</p>
        {showPercentage && percentage !== undefined && (
          <p className="shrink-0 text-xs font-semibold text-gray-900 sm:text-sm">{percentage.toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}
