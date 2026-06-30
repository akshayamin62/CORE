'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPEnquiryItem } from '@/types';
import ServiceProviderLayout from '@/components/ServiceProviderLayout';
import toast, { Toaster } from 'react-hot-toast';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListStatGridClass,
} from '@/components/studentDetailResponsive';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';

export default function SPStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [enquiries, setEnquiries] = useState<SPEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SERVICE_PROVIDER) {
        router.push('/');
        return;
      }
      setUser(userData);

      const enquiriesRes = await spServiceAPI.getMyEnquiries();
      setEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch (error: any) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleEnquiryStatus = async (enquiryId: string, status: string) => {
    try {
      await spServiceAPI.updateEnquiryStatus(enquiryId, status);
      setEnquiries(enquiries.map(e => e._id === enquiryId ? { ...e, status: status as any } : e));
      toast.success(`Enquiry marked as ${status}`);
    } catch (error: any) {
      toast.error('Failed to update enquiry');
    }
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.studentName.toLowerCase().includes(q) ||
      e.studentEmail.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q) ||
      (typeof e.spServiceId === 'object' && e.spServiceId.title.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const statusColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800',
    Contacted: 'bg-yellow-100 text-yellow-800',
    Closed: 'bg-gray-100 text-gray-600',
    Converted: 'bg-green-100 text-green-800',
  };

  const newCount = enquiries.filter(e => e.status === 'New').length;
  const contactedCount = enquiries.filter(e => e.status === 'Contacted').length;
  const closedCount = enquiries.filter(e => e.status === 'Closed').length;
  const convertedCount = enquiries.filter(e => e.status === 'Converted').length;

  return (
    <ServiceProviderLayout user={user}>
      <Toaster position="top-right" />
      <div className={roleListPagePadding}>
        <div className="mb-4 sm:mb-6">
          <h1 className={roleListTitleClass}>Students</h1>
          <p className={roleListSubtitleClass}>Student enquiries from your service listings</p>
        </div>

        {/* Stats — compact on mobile, original layout on md+ */}
        <div className={`${roleListStatGridClass} md:hidden`}>
          <PageStatCard compact title="Total Enquiries" mobileTitle="Total" value={enquiries.length} color="blue" onClick={() => setStatusFilter('All')} />
          <PageStatCard compact title="New" mobileTitle="New" value={newCount} color="blue" onClick={() => setStatusFilter(statusFilter === 'New' ? 'All' : 'New')} />
          <PageStatCard compact title="Contacted" mobileTitle="Contacted" value={contactedCount} color="yellow" onClick={() => setStatusFilter(statusFilter === 'Contacted' ? 'All' : 'Contacted')} />
          <PageStatCard compact title="Converted" mobileTitle="Converted" value={convertedCount} color="green" onClick={() => setStatusFilter(statusFilter === 'Converted' ? 'All' : 'Converted')} />
        </div>
        <div className="mb-6 hidden grid-cols-2 gap-4 md:grid md:grid-cols-5">
          {[
            { label: 'Total Enquiries', count: enquiries.length, filter: 'All', activeColor: 'border-blue-500 bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
            { label: 'New', count: newCount, filter: 'New', activeColor: 'border-blue-500 bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
            { label: 'Contacted', count: contactedCount, filter: 'Contacted', activeColor: 'border-yellow-500 bg-yellow-50', iconBg: 'bg-yellow-100 text-yellow-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> },
            { label: 'Converted', count: convertedCount, filter: 'Converted', activeColor: 'border-green-500 bg-green-50', iconBg: 'bg-green-100 text-green-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
            { label: 'Closed', count: closedCount, filter: 'Closed', activeColor: 'border-gray-500 bg-gray-50', iconBg: 'bg-gray-100 text-gray-600', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> },
          ].map((stat) => (
            <button
              key={stat.filter}
              onClick={() => setStatusFilter(statusFilter === stat.filter ? 'All' : stat.filter)}
              className={`rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
                statusFilter === stat.filter ? stat.activeColor : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {stat.icon}
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{stat.count}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">{stat.label}</p>
            </button>
          ))}
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
          <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4 md:hidden">
            <ListPageFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by student, email, service, or message..."
              pillFilters={[
                {
                  value: statusFilter === 'All' ? '' : statusFilter,
                  onChange: (v) => setStatusFilter(v || 'All'),
                  options: [
                    { value: '', label: 'All Status', mobileLabel: 'All' },
                    { value: 'New', label: 'New' },
                    { value: 'Contacted', label: 'Contacted' },
                    { value: 'Converted', label: 'Converted' },
                    { value: 'Closed', label: 'Closed' },
                  ],
                },
              ]}
              onClear={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
            />
          </div>
          <div className="hidden border-b border-gray-200 bg-white p-4 md:block">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, email, service, or message..."
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Closed">Closed</option>
                <option value="Converted">Converted</option>
              </select>
              {(statusFilter !== 'All' || searchQuery) && (
                <button
                  onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
                  className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredEnquiries.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No student enquiries yet</h3>
              <p className="text-sm text-gray-500">When students send enquiries for your services, they will appear here.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 md:hidden">
                {filteredEnquiries.map((enquiry) => (
                  <div key={enquiry._id} className="p-3 sm:p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{enquiry.studentName}</p>
                        <p className="truncate text-xs text-gray-500">{enquiry.studentEmail}</p>
                        {enquiry.studentMobile && (
                          <p className="text-xs text-gray-500">{enquiry.studentMobile}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColors[enquiry.status]}`}>
                        {enquiry.status}
                      </span>
                    </div>
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      {typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId.title : 'Service'}
                    </p>
                    <p className="mb-3 line-clamp-2 text-xs text-gray-600">{enquiry.message}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400">
                        {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                      <select
                        value={enquiry.status}
                        onChange={(e) => handleEnquiryStatus(enquiry._id, e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Closed">Closed</option>
                        <option value="Converted">Converted</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEnquiries.map((enquiry) => (
                    <tr key={enquiry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{enquiry.studentName}</p>
                          <p className="text-xs text-gray-500">{enquiry.studentEmail}</p>
                          {enquiry.studentMobile && (
                            <p className="text-xs text-gray-500">{enquiry.studentMobile}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId.title : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {enquiry.message}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[enquiry.status]}`}>
                          {enquiry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={enquiry.status}
                          onChange={(e) => handleEnquiryStatus(enquiry._id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Closed">Closed</option>
                          <option value="Converted">Converted</option>
                        </select>
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
    </ServiceProviderLayout>
  );
}
