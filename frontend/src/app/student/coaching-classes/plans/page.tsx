'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import StudentLayout from '@/components/StudentLayout';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function BlueCheck() {
  return (
    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

export default function StudentCoachingClassesPlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  const plans = getServicePlans('coaching-classes');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.STUDENT) {
          router.push('/dashboard');
          return;
        }
        setUser(userData);
        await fetchData();
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    try {
      const pricingRes = await servicePlanAPI.getPricing('coaching-classes');
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
    } catch (error: any) {
      console.error('Failed to load plan data:', error);
    }
  };

  const handleRegister = async (planKey: string) => {
    setRegistering(planKey);
    try {
      await servicePlanAPI.register('coaching-classes', planKey);
      toast.success('Successfully registered! Redirecting...');
      setTimeout(() => router.push('/student/registration'), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  return (
    <StudentLayout user={user} formStructure={[]} currentPartIndex={0} currentSectionIndex={0} onPartChange={() => {}} onSectionChange={() => {}} isOuterNav={true} serviceName="Coaching Classes">
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Classes</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Choose your coaching class. Each includes study material, session recordings, and dedicated mock tests.</p>
        </div>

        <div className="p-6 lg:p-8">
          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {plans.map((plan) => {
              const parts = plan.subtitle?.split('\u2022').map(s => s.trim()) || [];
              const sessionInfo = parts[0] || '';
              const mockInfo = parts[1] ? `${parts[1]} Included` : '';
              const price = pricing?.[plan.key];
              const isPopular = plan.key === 'IELTS_PREMIUM';

              return (
                <div key={plan.key} className={`bg-white p-7 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-shadow relative ${isPopular ? 'border-2 border-blue-200' : 'border border-slate-100'}`}>
                  {isPopular && (
                    <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md">Popular</span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  {price != null ? (
                    <div className="mb-5">
                      <p className="text-2xl font-extrabold text-gray-900">₹{price.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">One-time payment</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-5">Price not set</p>
                  )}
                  <ul className="space-y-2.5 mb-7 flex-grow">
                    {sessionInfo && (
                      <li className="flex items-center gap-2.5 text-sm text-gray-600">
                        <BlueCheck />{sessionInfo}
                      </li>
                    )}
                    {mockInfo && (
                      <li className="flex items-center gap-2.5 text-sm text-gray-600">
                        <BlueCheck />{mockInfo}
                      </li>
                    )}
                    <li className="flex items-center gap-2.5 text-sm text-gray-600">
                      <BlueCheck />Study Material
                    </li>
                    <li className="flex items-center gap-2.5 text-sm text-gray-600">
                      <BlueCheck />Session Recordings
                    </li>
                  </ul>
                  <button
                    onClick={() => handleRegister(plan.key)}
                    disabled={registering !== null || price == null}
                    className="w-full py-3 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registering === plan.key ? (
                      <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                    ) : 'Register Now'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">All coaching classes include</p>
                <p className="text-sm text-blue-700 mt-1">Study Material, Session Recordings, and dedicated mock tests as mentioned per class.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
