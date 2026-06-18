'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { ServicePricingIndexCard } from '@/components/ServicePricingPageFrame';

const services = [
  {
    name: 'Study Abroad',
    slug: 'study-abroad',
    description: 'Set the base pricing for Study Abroad PRO, PREMIUM, and PLATINUM plans. Admins will see this as their cost price.',
    icon: '🌍',
    path: '/super-admin/service-pricing/study-abroad',
    color: 'blue',
  },
  {
    name: 'Coaching Classes',
    slug: 'coaching-classes',
    description: 'Set the base pricing for Coaching Classes PRO, PREMIUM, and PLATINUM plans — IELTS, GRE, GMAT, SAT, PTE & language courses.',
    icon: '📚',
    path: '/super-admin/service-pricing/coaching-classes',
    color: 'teal',
  },
  {
    name: 'Education Planning',
    slug: 'education-planning',
    description: 'Set the base pricing for Education Planning PRO, PREMIUM, and PLATINUM plans — Brainography, Counseling, Portfolio & Activity Management.',
    icon: '🎓',
    path: '/super-admin/service-pricing/education-planning',
    color: 'purple',
  },
];

export default function SuperAdminServicePricingIndexPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.SUPER_ADMIN) {
          toast.error('Access denied. Super Admin only.');
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
    checkAuth();
  }, [router]);

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
                <p className="mt-1 text-sm text-gray-500 sm:text-base">Set base pricing for services. Admins will see these as their cost prices and set their own selling prices.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServicePricingIndexCard
                key={service.slug}
                icon={service.icon}
                name={service.name}
                description={service.description}
                onClick={() => router.push(service.path)}
              />
            ))}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
