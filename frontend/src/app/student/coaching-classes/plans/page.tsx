'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import StudentLayout from '@/components/StudentLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function StudentCoachingClassesPlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  const plans = getServicePlans('coaching-classes');
  const features = getServiceFeatures('coaching-classes');

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
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-teal-500/10 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full" />
          <div className="px-6 lg:px-8 py-8 relative">
            <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-teal-100 hover:text-white transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Coaching Classes</h1>
            <p className="text-teal-100 mt-1 max-w-2xl">Choose your coaching class. Each includes study material, session recordings, and dedicated mock tests.</p>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {/* Plan Cards — responsive grid for 11 classes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
            {plans.map((plan) => (
              <div key={plan.key} className={`relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border ${plan.borderColor} overflow-hidden`}>
                <div className={`${plan.headerGradient} px-5 py-4 text-white`}>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.subtitle && <p className="text-xs opacity-80 mt-0.5">{plan.subtitle}</p>}
                </div>
                <div className="p-5">
                  {pricing?.[plan.key] != null ? (
                    <div className="mb-4">
                      <p className="text-3xl font-extrabold text-gray-900">₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500 mt-1">One-time payment</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 font-medium">Price not set</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleRegister(plan.key)}
                    disabled={registering !== null || pricing?.[plan.key] == null}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.headerGradient} hover:opacity-90 hover:shadow-md`}
                  >
                    {registering === plan.key ? (
                      <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                    ) : 'Register Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mb-8 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-800">All coaching classes include</p>
                <p className="text-sm text-teal-700 mt-1">Study Material, Session Recordings, and dedicated mock tests as mentioned per class.</p>
              </div>
            </div>
          </div>

          {/* Features Comparison */}
          {features.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Coaching Classes Details</h2>
                <p className="text-sm text-gray-500 mt-1">Compare features across all coaching classes.</p>
              </div>
              <ServicePlanDetailsView features={features} pricing={pricing} plans={plans} serviceName="Coaching Classes" showPricing={false} />
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
