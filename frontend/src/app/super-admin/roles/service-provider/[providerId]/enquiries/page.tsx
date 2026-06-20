'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPEnquiryItem } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
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

export default function SPEnquiriesPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.providerId as string;

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
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        router.push('/');
        return;
      }
      setUser(userData);

      const enquiriesRes = await spServiceAPI.getSPEnquiriesById(providerId);
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
    const q = searchQuery.toLowerCase();
    return (
      svc?.title?.toLowerCase().includes(q) ||
      enquiry.studentName?.toLowerCase().includes(q) ||
      enquiry.studentEmail?.toLowerCase().includes(q) ||
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
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="min-h-[calc(100vh-5rem)] bg-gray-50">
        <div className={`mx-auto max-w-7xl ${roleListPagePadding}`}>
          <button
            type="button"
            onClick={() => router.back()}
            className={roleListBackBtnClass}
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="mb-4 flex flex-col gap-2 sm:mb-6">
            <div className="min-w-0">
              <h1 className={roleListTitleClass}>Service Provider Enquiries</h1>
              <p className={roleListSubtitleClass}>All enquiries received by this service provider</p>
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
                searchPlaceholder="Search by service, student, email, or message..."
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {filteredEnquiries.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No enquiries found</h3>
              <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search criteria.' : 'This provider has not received any enquiries yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {filteredEnquiries.map((enquiry) => {
                const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
                const statusColor = statusColors[enquiry.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <div key={enquiry._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2">
                    {svc?.thumbnail && (
                      <div className="h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
                        <AuthImage
                          path={svc.thumbnail}
                          alt={svc.title || ''}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3 sm:p-6">
                      <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                          <span className="text-sm font-bold text-indigo-600">{enquiry.studentName?.charAt(0) || 'S'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{enquiry.studentName || 'Student'}</p>
                          {enquiry.studentEmail && (
                            <p className="truncate text-xs text-gray-500">{enquiry.studentEmail}</p>
                          )}
                        </div>
                      </div>

                      {enquiry.studentMobile && (
                        <p className="mb-3 text-xs text-gray-500">
                          <span className="font-medium">Mobile:</span> {enquiry.studentMobile}
                        </p>
                      )}

                      <h3 className="mb-2 text-base font-bold break-words text-gray-900 sm:text-lg">{svc?.title || 'Service'}</h3>
                      {svc?.category && (
                        <span className="mb-3 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                          {svc.category}
                        </span>
                      )}
                      {svc?.description && (
                        <p className="mb-3 line-clamp-3 text-sm text-gray-600">{svc.description}</p>
                      )}

                      {svc?.priceType && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-base font-bold text-gray-900 sm:text-lg">
                            {formatSpServicePrice(svc.priceType, svc.price)}
                          </p>
                        </div>
                      )}

                      <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2.5">
                        <p className="mb-1 text-xs font-medium text-gray-400">Student&apos;s message</p>
                        <p className="line-clamp-3 text-sm italic text-gray-600">&quot;{enquiry.message}&quot;</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor.bg} ${statusColor.text}`}>
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
    </SuperAdminLayout>
  );
}
