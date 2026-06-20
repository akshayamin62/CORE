'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPEnquiryItem } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import toast, { Toaster } from 'react-hot-toast';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListStatGridClass,
  roleListBackBtnClass,
  formatSpServicePrice,
} from '@/components/studentDetailResponsive';

const statusColors: Record<string, { bg: string; text: string }> = {
  New: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
  Converted: { bg: 'bg-green-100', text: 'text-green-700' },
};

export default function StudentEnquiriesPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [enquiries, setEnquiries] = useState<SPEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await authAPI.getProfile();
      const userData = profileRes.data.data.user;
      if (userData.role !== USER_ROLE.PARENT) {
        router.push('/');
        return;
      }
      setUser(userData);

      const enquiriesRes = await spServiceAPI.getStudentEnquiriesById(studentId);
      setEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter((enquiry) => {
    if (!searchQuery) return true;
    const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
    const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
    const q = searchQuery.toLowerCase();
    return (
      svc?.title?.toLowerCase().includes(q) ||
      sp?.companyName?.toLowerCase().includes(q) ||
      enquiry.message?.toLowerCase().includes(q)
    );
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
    <ParentLayout user={user}>
      <Toaster position="top-right" />
      <div className="min-h-[calc(100vh-5rem)] bg-gray-50">
        <div className={`mx-auto max-w-7xl ${roleListPagePadding}`}>
          <button
            type="button"
            onClick={() => router.push(`/parent/students/${studentId}`)}
            className={roleListBackBtnClass}
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Student
          </button>

          <div className="mb-4 flex flex-col gap-2 sm:mb-6">
            <div className="min-w-0">
              <h1 className={roleListTitleClass}>Student Service Enquiries</h1>
              <p className={roleListSubtitleClass}>All service enquiries sent by your child</p>
            </div>
          </div>

          <div className={roleListStatGridClass}>
            <PageStatCard compact title="Total Enquiries" mobileTitle="Total" value={enquiries.length} color="blue" />
            <PageStatCard compact title="New Enquiries" mobileTitle="New" value={enquiries.filter((e) => e.status === 'New').length} color="green" />
            <PageStatCard compact title="Contacted" mobileTitle="Contacted" value={enquiries.filter((e) => e.status === 'Contacted').length} color="yellow" />
            <PageStatCard compact title="Converted" mobileTitle="Converted" value={enquiries.filter((e) => e.status === 'Converted').length} color="green" />
          </div>

          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by service, company, or message..."
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {/* Enquiry Cards */}
          {filteredEnquiries.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No enquiries found</h3>
              <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search criteria.' : 'No service enquiries have been sent yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {filteredEnquiries.map((enquiry) => {
                const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
                const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
                const statusColor = statusColors[enquiry.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <div key={enquiry._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2">
                    {svc?.thumbnail && (
                      <div className="h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
                        <AuthImage
                          path={svc.thumbnail}
                          alt={svc.title || ''}
                          className="w-full h-full object-cover"
                        />
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
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">{sp.companyName?.charAt(0) || 'S'}</span>
                              </div>
                            }
                          />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{sp.companyName || 'Service Provider'}</p>
                            {(sp.city || sp.state) && (
                              <p className="text-xs text-gray-500">{[sp.city, sp.state, sp.country].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {sp?.website && (
                        <a
                          href={sp.website.startsWith('http') ? sp.website : `https://${sp.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-3"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          {sp.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}

                      <h3 className="text-lg font-bold text-gray-900 mb-2">{svc?.title || 'Service'}</h3>
                      {svc?.category && (
                        <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                          {svc.category}
                        </span>
                      )}
                      {svc?.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{svc.description}</p>
                      )}

                      {svc?.priceType && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-base font-bold text-gray-900 sm:text-lg">
                            {formatSpServicePrice(svc.priceType, svc.price)}
                          </p>
                        </div>
                      )}

                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
                        <p className="text-xs text-gray-400 font-medium mb-1">Student&apos;s message</p>
                        <p className="text-sm text-gray-600 italic line-clamp-3">&quot;{enquiry.message}&quot;</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor.bg} ${statusColor.text}`}>
                          {enquiry.status}
                        </span>
                        {enquiry.createdAt && (
                          <span className="text-xs text-gray-400">
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
        </div>
      </div>
    </ParentLayout>
  );
}
