'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListBackBtnClass,
  formatSpServicePrice,
} from '@/components/studentDetailResponsive';

export default function SPServicesPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.providerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
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

      const servicesRes = await spServiceAPI.getSPServicesById(providerId);
      setServices(servicesRes.data.data.services || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((svc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      svc.title?.toLowerCase().includes(q) ||
      svc.description?.toLowerCase().includes(q) ||
      svc.category?.toLowerCase().includes(q)
    );
  });

  const activeCount = services.filter((s) => s.isActive).length;
  const categories = [...new Set(services.map((s) => s.category))];

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
              <h1 className={roleListTitleClass}>Service Provider&apos;s Services</h1>
              <p className={roleListSubtitleClass}>All services offered by this provider</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
            <PageStatCard compact title="Total Services" mobileTitle="Total" value={services.length} color="blue" />
            <PageStatCard compact title="Active" mobileTitle="Active" value={activeCount} color="green" />
            <PageStatCard compact title="Categories" mobileTitle="Categories" value={categories.length} color="purple" />
          </div>

          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
            <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ListPageFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by service name, description, or category..."
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">No services found</h3>
              <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search criteria.' : 'This provider has not created any services yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {filteredServices.map((svc) => (
                <div key={svc._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2">
                  {svc.thumbnail && (
                    <div className="h-32 w-full overflow-hidden bg-gray-100 sm:h-40">
                      <AuthImage
                        path={svc.thumbnail}
                        alt={svc.title || ''}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3 sm:p-6">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 text-base font-bold break-words text-gray-900 sm:text-lg">{svc.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${svc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {svc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {svc.category && (
                      <span className="mb-3 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        {svc.category}
                      </span>
                    )}

                    {svc.description && (
                      <p className="mb-4 line-clamp-3 text-sm text-gray-600">{svc.description}</p>
                    )}

                    <div className="mb-4">
                      <p className="text-base font-bold text-gray-900 sm:text-lg">
                        {formatSpServicePrice(svc.priceType, svc.price)}
                      </p>
                    </div>

                    {svc.createdAt && (
                      <div className="flex items-center text-xs text-gray-400">
                        <svg className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Created {new Date(svc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
