'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisorLayout from '@/components/AdvisorLayout';
import toast, { Toaster } from 'react-hot-toast';
import { ServicePricingIndexCard } from '@/components/ServicePricingPageFrame';

const allServices = [
  {
    name: 'Study Abroad',
    slug: 'study-abroad',
    description: 'Set pricing for Study Abroad PRO, PREMIUM, and PLATINUM plans for your students.',
    icon: '🌍',
    path: '/advisor/service-pricing/study-abroad-pricing',
  },
  {
    name: 'Coaching Classes',
    slug: 'coaching-classes',
    description: 'Set pricing for Coaching Classes PRO, PREMIUM, and PLATINUM plans — IELTS, GRE, GMAT, SAT, PTE & language courses.',
    icon: '📚',
    path: '/advisor/service-pricing/coaching-classes-pricing',
  },
  {
    name: 'Education Planning',
    slug: 'education-planning',
    description: 'Set pricing for Education Planning PRO, PREMIUM, and PLATINUM plans for your students.',
    icon: '🎓',
    path: '/advisor/service-pricing/education-planning-pricing',
  },
];

export default function AdvisorServicePricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);

  useEffect(() => {
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
        const profileData = response.data.data;
        if (profileData.advisor?.allowedServices) {
          setAllowedServices(profileData.advisor.allowedServices);
        }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const services = allServices.filter(s => allowedServices.includes(s.slug));

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

  return (
    <AdvisorLayout user={user}>
      <Toaster position="top-right" />
      <div className="min-h-[calc(100vh-5rem)]">
        <div className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
          <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200/50 sm:h-12 sm:w-12">
                <svg className="h-5 w-5 text-white sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">Service Pricing</h1>
                <p className="mt-1 text-sm text-gray-500 sm:text-base">Manage pricing for the services you offer to students.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {services.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center sm:rounded-2xl sm:p-12">
              <p className="text-gray-500">No services have been assigned to your advisor yet.</p>
              <p className="mt-1 text-sm text-gray-400">Contact the Super Admin to get services assigned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServicePricingIndexCard
                  key={service.slug}
                  icon={service.icon}
                  name={service.name}
                  description={service.description}
                  actionLabel="Manage Pricing"
                  onClick={() => router.push(service.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdvisorLayout>
  );
}
