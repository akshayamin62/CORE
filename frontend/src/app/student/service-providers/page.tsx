'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing, SPEnquiryItem } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import StudentOuterPageLayout from '@/components/StudentOuterPageLayout';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListBackBtnClass,
  roleListTabStatGridClass,
  roleListStatGridClass,
  formatSpServicePrice,
  navigateToStudentApplicationDashboard,
} from '@/components/studentDetailResponsive';

const statusColors: Record<string, { bg: string; text: string }> = {
  New: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
  Converted: { bg: 'bg-green-100', text: 'text-green-700' },
};

export default function StudentServiceProvidersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
  const [myEnquiries, setMyEnquiries] = useState<SPEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-services'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [enquiryModal, setEnquiryModal] = useState<SPServiceListing | null>(null);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [sendingEnquiry, setSendingEnquiry] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await authAPI.getProfile();
      const userData = profileRes.data.data.user;
      if (userData.role !== USER_ROLE.STUDENT) {
        router.push('/');
        return;
      }
      setUser(userData);

      const [servicesRes, enquiriesRes] = await Promise.all([
        spServiceAPI.browseServices(),
        spServiceAPI.getStudentEnquiries(),
      ]);
      setServices(servicesRes.data.data.services || []);
      setMyEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEnquiry = async () => {
    if (!enquiryModal || !enquiryMessage.trim()) return;
    setSendingEnquiry(true);
    try {
      const sp = typeof enquiryModal.serviceProviderId === 'object' ? enquiryModal.serviceProviderId._id : enquiryModal.serviceProviderId;
      await spServiceAPI.sendEnquiry({
        spServiceId: enquiryModal._id,
        serviceProviderId: sp,
        message: enquiryMessage.trim(),
      });
      toast.success('Enquiry sent successfully!');
      setEnquiryModal(null);
      setEnquiryMessage('');
      const enquiriesRes = await spServiceAPI.getStudentEnquiries();
      setMyEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send enquiry');
    } finally {
      setSendingEnquiry(false);
    }
  };

  const enquiredServiceIds = new Set(
    myEnquiries.map((e) =>
      typeof e.spServiceId === 'object' ? e.spServiceId._id : e.spServiceId
    )
  );

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];
  const cities = ['All', ...Array.from(new Set(
    services
      .map((s) => (typeof s.serviceProviderId === 'object' ? s.serviceProviderId.city : null))
      .filter((c): c is string => !!c)
  ))];

  const filteredServices = services.filter((service) => {
    const sp = typeof service.serviceProviderId === 'object' ? service.serviceProviderId : null;
    const matchesCategory = categoryFilter === 'All' || service.category === categoryFilter;
    const matchesCity = cityFilter === 'All' || sp?.city === cityFilter;
    const matchesSearch = !searchQuery ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesCity && matchesSearch;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setCityFilter('All');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <StudentOuterPageLayout user={user}>
        <div className={`mx-auto max-w-7xl ${roleListPagePadding}`}>
          <button type="button" onClick={() => navigateToStudentApplicationDashboard(router)} className={roleListBackBtnClass}>
            <svg className="mr-1.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Dashboard
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className={roleListTitleClass}>Service Providers</h1>
            <p className={roleListSubtitleClass}>Browse services and send enquiries to service providers</p>
          </div>

          <div className={roleListTabStatGridClass}>
            <PageStatCard
              title="Browse Services"
              mobileTitle="Browse"
              value={services.length}
              color="blue"
              active={activeTab === 'browse'}
              onClick={() => setActiveTab('browse')}
            />
            <PageStatCard
              title="My Enquiries"
              mobileTitle="Enquiries"
              value={myEnquiries.length}
              color="green"
              active={activeTab === 'my-services'}
              onClick={() => setActiveTab('my-services')}
            />
          </div>

          {activeTab === 'browse' && (
            <>
              <div className={`${roleListStatGridClass} hidden md:grid`}>
                <PageStatCard title="Filtered Results" mobileTitle="Results" value={filteredServices.length} color="green" />
                <PageStatCard title="Categories" mobileTitle="Categories" value={new Set(services.map((s) => s.category)).size} color="purple" />
                <PageStatCard
                  title="Providers"
                  mobileTitle="Providers"
                  value={new Set(services.map((s) => (typeof s.serviceProviderId === 'object' ? s.serviceProviderId._id : s.serviceProviderId))).size}
                  color="amber"
                />
              </div>

              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
                <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <ListPageFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search services or companies..."
                    desktopColumns={4}
                    pillFilters={[
                      {
                        value: categoryFilter,
                        onChange: setCategoryFilter,
                        emptyValue: 'All',
                        options: categories.map((cat) => ({
                          value: cat,
                          label: cat === 'All' ? 'All Categories' : cat,
                          mobileLabel: cat === 'All' ? 'All Cat.' : cat,
                        })),
                      },
                      {
                        value: cityFilter,
                        onChange: setCityFilter,
                        emptyValue: 'All',
                        options: cities.map((city) => ({
                          value: city,
                          label: city === 'All' ? 'All Cities' : city,
                          mobileLabel: city === 'All' ? 'All Cities' : city,
                        })),
                      },
                    ]}
                    onClear={clearFilters}
                  />
                </div>
              </div>

              {filteredServices.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                  <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No services found</h3>
                  <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {filteredServices.map((service) => {
                    const sp = typeof service.serviceProviderId === 'object' ? service.serviceProviderId : null;
                    const alreadyEnquired = enquiredServiceIds.has(service._id);
                    return (
                      <div key={service._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2">
                        {service.thumbnail && (
                          <div className="h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
                            <AuthImage path={service.thumbnail} alt={service.title} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="p-3 sm:p-6">
                          {sp && (
                            <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
                              <AuthImage
                                path={sp.companyLogo}
                                alt={sp.companyName || ''}
                                className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-10 sm:w-10"
                                fallback={
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:h-10 sm:w-10">
                                    <span className="text-xs font-bold text-blue-600 sm:text-sm">{sp.companyName?.charAt(0) || 'S'}</span>
                                  </div>
                                }
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{sp.companyName || 'Service Provider'}</p>
                                {(sp.city || sp.state) && (
                                  <p className="truncate text-xs text-gray-500">{[sp.city, sp.state, sp.country].filter(Boolean).join(', ')}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {sp?.website && (
                            <a
                              href={sp.website.startsWith('http') ? sp.website : `https://${sp.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-blue-600 hover:text-blue-800 sm:mb-3"
                            >
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              {sp.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}

                          <h3 className="mb-1.5 text-base font-bold text-gray-900 sm:mb-2 sm:text-lg">{service.title}</h3>
                          <span className="mb-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 sm:mb-3 sm:px-2.5 sm:text-xs">
                            {service.category}
                          </span>
                          <p className="mb-3 line-clamp-3 text-xs text-gray-600 sm:mb-4 sm:text-sm">{service.description}</p>

                          <p className="mb-3 text-base font-bold text-gray-900 sm:mb-4 sm:text-lg">
                            {formatSpServicePrice(service.priceType, service.price)}
                          </p>

                          {alreadyEnquired ? (
                            <div className="flex w-full cursor-default items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 py-2 text-xs font-semibold text-green-700 sm:py-2.5 sm:text-sm">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Enquiry Sent
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEnquiryModal(service); setEnquiryMessage(''); }}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:py-2.5 sm:text-sm"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send Enquiry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'my-services' && (
            <>
              {myEnquiries.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                  <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No enquiries yet</h3>
                  <p className="mb-4 text-sm text-gray-500">Browse services and send an enquiry to get started.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {myEnquiries.map((enquiry) => {
                    const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
                    const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
                    const statusColor = statusColors[enquiry.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    return (
                      <div key={enquiry._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:border-2">
                        {svc?.thumbnail && (
                          <div className="h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
                            <AuthImage path={svc.thumbnail} alt={svc.title || ''} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="p-3 sm:p-6">
                          {sp && (
                            <div className="mb-3 flex items-center gap-2.5 sm:gap-3">
                              <AuthImage
                                path={sp.companyLogo}
                                alt={sp.companyName || ''}
                                className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-10 sm:w-10"
                                fallback={
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 sm:h-10 sm:w-10">
                                    <span className="text-xs font-bold text-blue-600 sm:text-sm">{sp.companyName?.charAt(0) || 'S'}</span>
                                  </div>
                                }
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">{sp.companyName || 'Service Provider'}</p>
                                {(sp.city || sp.state) && (
                                  <p className="truncate text-xs text-gray-500">{[sp.city, sp.state, sp.country].filter(Boolean).join(', ')}</p>
                                )}
                              </div>
                            </div>
                          )}

                          <h3 className="mb-1.5 text-base font-bold text-gray-900 sm:text-lg">{svc?.title || 'Service'}</h3>
                          {svc?.category && (
                            <span className="mb-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 sm:mb-3 sm:text-xs">
                              {svc.category}
                            </span>
                          )}
                          {svc?.description && (
                            <p className="mb-2 line-clamp-2 text-xs text-gray-600 sm:mb-3 sm:text-sm">{svc.description}</p>
                          )}

                          {svc?.priceType && (
                            <p className="mb-2 text-base font-bold text-gray-900 sm:mb-3">
                              {formatSpServicePrice(svc.priceType, svc.price)}
                            </p>
                          )}

                          <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 sm:mb-4">
                            <p className="mb-0.5 text-[10px] font-medium text-gray-400 sm:text-xs">Your message</p>
                            <p className="line-clamp-3 text-xs italic text-gray-600 sm:text-sm">&ldquo;{enquiry.message}&rdquo;</p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-xs ${statusColor.bg} ${statusColor.text}`}>
                              {enquiry.status}
                            </span>
                            {enquiry.createdAt && (
                              <span className="text-[10px] text-gray-400 sm:text-xs">
                                {new Date(enquiry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </StudentOuterPageLayout>

      {enquiryModal && (
        <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="app-modal-panel w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">Send Enquiry</h3>
              <button type="button" onClick={() => setEnquiryModal(null)} className="rounded-full p-2 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-1 text-sm text-gray-600">Service: <strong>{enquiryModal.title}</strong></p>
            <p className="mb-4 text-sm text-gray-600">
              Provider: <strong>
                {typeof enquiryModal.serviceProviderId === 'object'
                  ? enquiryModal.serviceProviderId.companyName
                  : 'Service Provider'}
              </strong>
            </p>
            <textarea
              rows={4}
              value={enquiryMessage}
              onChange={(e) => setEnquiryMessage(e.target.value)}
              placeholder="Write your message or questions about this service..."
              className="mb-4 w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:px-4"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={handleSendEnquiry}
                disabled={sendingEnquiry || !enquiryMessage.trim()}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingEnquiry ? 'Sending...' : 'Send Enquiry'}
              </button>
              <button
                type="button"
                onClick={() => setEnquiryModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:shrink-0"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
