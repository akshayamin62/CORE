'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI, coachingBatchAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';

import { getServicePlans } from '@/config/servicePlans';
import CoachingClassCards, { ClassTiming } from '@/components/CoachingClassCards';
import BatchSelectModal from '@/components/BatchSelectModal';
import toast, { Toaster } from 'react-hot-toast';

export default function StudentCoachingClassesPlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);
  const [batchSelectPlan, setBatchSelectPlan] = useState<{ key: string; name: string } | null>(null);
  const [registeredClasses, setRegisteredClasses] = useState<Record<string, ClassTiming | null>>({});

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
      const [pricingRes, servicesRes] = await Promise.all([
        servicePlanAPI.getPricing('coaching-classes'),
        serviceAPI.getMyServices(),
      ]);
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);

      // Build registeredClasses map from coaching registrations
      const regs = servicesRes.data.data.registrations || [];
      const regMap: Record<string, ClassTiming | null> = {};
      for (const reg of regs) {
        const svc = typeof reg.serviceId === 'object' ? reg.serviceId : null;
        if (svc?.slug === 'coaching-classes' && reg.planTier) {
          regMap[reg.planTier] = reg.classTiming || null;
        }
      }
      setRegisteredClasses(regMap);
    } catch (error: any) {
      console.error('Failed to load plan data:', error);
    }
  };

  const handleRegister = async (planKey: string, classTiming?: { batchDate: string; timeFrom: string; timeTo: string }) => {
    setRegistering(planKey);
    try {
      await servicePlanAPI.register('coaching-classes', planKey, classTiming);
      toast.success('Successfully registered!');
      setBatchSelectPlan(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(null);
    }
  };

  const handleRegisterClick = async (planKey: string, planName: string) => {
    try {
      const res = await coachingBatchAPI.getBatches(planKey);
      const batches = res.data.data.batches || [];
      if (batches.length > 0) {
        setBatchSelectPlan({ key: planKey, name: planName });
      } else {
        toast.error('No batches available for this class. Please check back later.');
      }
    } catch {
      toast.error('Failed to load batches. Please try again.');
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
    <>
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
          <CoachingClassCards
            plans={plans}
            pricing={pricing}
            registeredClasses={registeredClasses}
            renderAction={(plan) => (
              <button
                onClick={() => handleRegisterClick(plan.key, plan.name)}
                disabled={registering !== null || pricing?.[plan.key] == null}
                className="w-full py-3 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering === plan.key ? (
                  <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                ) : 'Register Now'}
              </button>
            )}
          />

          {/* Note */}
          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-5">
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

      {batchSelectPlan && (
        <BatchSelectModal
          isOpen={true}
          onClose={() => setBatchSelectPlan(null)}
          planKey={batchSelectPlan.key}
          planName={batchSelectPlan.name}
          onSelectBatch={(classTiming) => handleRegister(batchSelectPlan.key, classTiming)}
          registering={registering !== null}
        />
      )}
    </>
  );
}
