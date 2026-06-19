'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, advisorAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE } from '@/types';
import AdvisorLayout from '@/components/AdvisorLayout';
import toast, { Toaster } from 'react-hot-toast';
import ListPageFilters from '@/components/ListPageFilters';
import EnquiryUrlCopy from '@/components/EnquiryUrlCopy';
import LeadMobileList, {
  getLeadServiceColor,
  getLeadStageColor,
  LEAD_SERVICE_FILTER_OPTIONS,
  LEAD_STAGE_FILTER_OPTIONS,
} from '@/components/LeadMobileList';

export default function AdvisorLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [enquiryFormUrl, setEnquiryFormUrl] = useState<string>('');

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('');
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchEnquiryFormUrl();
    }
  }, [user, serviceFilter]);

  useEffect(() => {
    let filtered = allLeads;
    if (stageFilter) {
      filtered = filtered.filter(l => l.stage === stageFilter);
    }
    setLeads(filtered);
  }, [allLeads, stageFilter]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADVISOR) {
        toast.error('Access denied. Advisor only.');
        router.push('/');
        return;
      }
      setUser(userData);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const params: Record<string, string> = {};
      if (serviceFilter) params.serviceTypes = serviceFilter;
      const response = await advisorAPI.getLeads(params);
      setAllLeads(response.data.data?.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    }
  };

  const fetchEnquiryFormUrl = async () => {
    try {
      const response = await advisorAPI.getEnquiryFormUrl();
      const slug = response.data.data?.slug;
      if (slug) {
        setEnquiryFormUrl(`${window.location.origin}/enquiry/${slug}`);
      }
    } catch (error) {
      console.error('Error fetching enquiry form URL:', error);
    }
  };


  const handleStageCardClick = (stage: string | null) => {
    if (stage === null || stage === 'all') {
      setSelectedStageCard('all');
      setStageFilter('');
    } else {
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  const getStageColor = getLeadStageColor;
  const getServiceColor = getLeadServiceColor;

  const clearAllFilters = () => {
    setStageFilter('');
    setServiceFilter('');
    setSearchQuery('');
    setSelectedStageCard(null);
  };

  // Stats from allLeads
  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.stage === LEAD_STAGE.NEW).length;
  const hotLeads = allLeads.filter(l => l.stage === LEAD_STAGE.HOT).length;
  const warmLeads = allLeads.filter(l => l.stage === LEAD_STAGE.WARM).length;
  const coldLeads = allLeads.filter(l => l.stage === LEAD_STAGE.COLD).length;
  const convertedLeads = allLeads.filter(l => l.stage === LEAD_STAGE.CONVERTED).length;
  const closedLeads = allLeads.filter(l => l.stage === LEAD_STAGE.CLOSED).length;

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (lead.name || '').toLowerCase().includes(query) || lead.email.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <AdvisorLayout user={user}>
        <div className="p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Lead Management</h1>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">Manage and track your enquiry leads</p>
            </div>

            {enquiryFormUrl && (
              <EnquiryUrlCopy label="Your Enquiry Form URL" url={enquiryFormUrl} />
            )}
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard title="Total Leads" value={totalLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="blue" onClick={() => handleStageCardClick('all')} isActive={selectedStageCard === 'all'} showPercentage={false} />
            <StatCard title="New" value={newLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} color="blue" onClick={() => handleStageCardClick(LEAD_STAGE.NEW)} isActive={selectedStageCard === LEAD_STAGE.NEW} percentage={totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0} />
            <StatCard title="Hot" value={hotLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>} color="red" onClick={() => handleStageCardClick(LEAD_STAGE.HOT)} isActive={selectedStageCard === LEAD_STAGE.HOT} percentage={totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0} />
            <StatCard title="Warm" value={warmLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>} color="orange" onClick={() => handleStageCardClick(LEAD_STAGE.WARM)} isActive={selectedStageCard === LEAD_STAGE.WARM} percentage={totalLeads > 0 ? (warmLeads / totalLeads) * 100 : 0} />
            <StatCard title="Cold" value={coldLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>} color="cyan" onClick={() => handleStageCardClick(LEAD_STAGE.COLD)} isActive={selectedStageCard === LEAD_STAGE.COLD} percentage={totalLeads > 0 ? (coldLeads / totalLeads) * 100 : 0} />
            <StatCard title="Converted" value={convertedLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="green" onClick={() => handleStageCardClick(LEAD_STAGE.CONVERTED)} isActive={selectedStageCard === LEAD_STAGE.CONVERTED} percentage={totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0} />
            <StatCard title="Closed" value={closedLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} color="gray" onClick={() => handleStageCardClick(LEAD_STAGE.CLOSED)} isActive={selectedStageCard === LEAD_STAGE.CLOSED} percentage={totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0} />
          </div>

          {/* Search and Filters + Leads List */}
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="rounded-t-xl border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
              <div className="md:hidden">
                <ListPageFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Search by name or email..."
                  pillFilters={[
                    {
                      value: stageFilter,
                      onChange: (value) => {
                        setStageFilter(value);
                        setSelectedStageCard(value || null);
                      },
                      options: LEAD_STAGE_FILTER_OPTIONS,
                    },
                    {
                      value: serviceFilter,
                      onChange: setServiceFilter,
                      options: LEAD_SERVICE_FILTER_OPTIONS,
                    },
                  ]}
                  onClear={clearAllFilters}
                />
              </div>
              <div className="hidden md:block">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
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
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stages</option>
                  {Object.values(LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Services</option>
                  {Object.values(SERVICE_TYPE).map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
            </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500">
                  {stageFilter || serviceFilter || searchQuery ? 'Try adjusting your filters' : 'Share your enquiry form URL to start receiving leads'}
                </p>
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
                      onClick: () => router.push(`/advisor/leads/${lead._id}`),
                    },
                  ]}
                />
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
                      <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                      <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="w-1/5 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                            <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                            <p className="text-sm text-gray-500">{lead.mobileNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {lead.serviceTypes?.map((service) => (
                              <span key={service} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
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
                            onClick={() => router.push(`/advisor/leads/${lead._id}`)}
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

          {filteredLeads.length > 0 && (
            <p className="text-sm text-gray-600">
              Showing {filteredLeads.length} of {allLeads.length} total leads
            </p>
          )}
        </div>
      </AdvisorLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
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
