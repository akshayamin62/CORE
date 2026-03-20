'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import StudentLayout from '@/components/StudentLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

const PLAN_HIERARCHY: Record<string, number> = { PRO: 0, PREMIUM: 1, PLATINUM: 2 };

const availableServices = [
  {
    slug: 'study-abroad',
    name: 'Study Abroad',
    description: 'Comprehensive support for international education with expert guidance at every step.',
    color: 'from-blue-500 via-blue-600 to-indigo-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    plansPage: '/student/study-abroad/plans',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    slug: 'coaching-classes',
    name: 'Coaching Classes',
    description: 'Expert coaching for IELTS, GRE, GMAT, SAT, PTE and language courses.',
    color: 'from-teal-500 via-emerald-500 to-cyan-500',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    plansPage: '/student/coaching-classes/plans',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function StudentServicePlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);

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
        // Fetch student's current registrations
        try {
          const servicesRes = await serviceAPI.getMyServices();
          setRegistrations(servicesRes.data.data.registrations || []);
        } catch { /* ignore */ }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSelectService = async (slug: string) => {
    setSelectedService(slug);
    setLoadingPlans(true);
    setPricing(null);

    try {
      const pricingRes = await servicePlanAPI.getPricing(slug);
      const p = pricingRes.data.data.pricing;
      if (p) setPricing(p);
    } catch {
      toast.error('Failed to load plan details');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleRegister = async (planKey: string) => {
    if (!selectedService) return;
    setRegistering(planKey);
    try {
      await servicePlanAPI.register(selectedService, planKey);
      toast.success('Successfully registered! Redirecting...');
      // Refresh registrations
      try {
        const servicesRes = await serviceAPI.getMyServices();
        setRegistrations(servicesRes.data.data.registrations || []);
      } catch { /* ignore */ }
      setTimeout(() => router.push('/student/registration'), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(null);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    if (!selectedService) return;
    setRegistering(planKey);
    try {
      await servicePlanAPI.upgrade(selectedService, planKey);
      toast.success(`Successfully upgraded to ${planKey}!`);
      // Refresh registrations
      try {
        const servicesRes = await serviceAPI.getMyServices();
        setRegistrations(servicesRes.data.data.registrations || []);
      } catch { /* ignore */ }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upgrade failed');
    } finally {
      setRegistering(null);
    }
  };

  const getCurrentPlanTier = (slug: string): string | null => {
    const reg = registrations.find((r: any) => {
      const svc = typeof r.serviceId === 'object' ? r.serviceId : null;
      return svc && svc.slug === slug;
    });
    return reg?.planTier || null;
  };

  const isUpgrade = (planKey: string, currentTier: string | null): boolean => {
    if (!currentTier) return false;
    return (PLAN_HIERARCHY[planKey] ?? -1) > (PLAN_HIERARCHY[currentTier] ?? -1);
  };

  const getUpgradePriceDiff = (planKey: string, currentTier: string | null): number | null => {
    if (!currentTier || !pricing) return null;
    const currentPrice = pricing[currentTier];
    const targetPrice = pricing[planKey];
    if (currentPrice == null || targetPrice == null) return null;
    return targetPrice - currentPrice;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  const selectedServiceInfo = availableServices.find((s) => s.slug === selectedService);
  const plans = selectedService ? getServicePlans(selectedService) : [];

  return (
    <StudentLayout user={user} formStructure={[]} currentPartIndex={0} currentSectionIndex={0} onPartChange={() => {}} onSectionChange={() => {}} isOuterNav={true}>
      <Toaster position="top-right" />
      <div className="p-6 lg:p-8">
        {/* Service Selector */}
        {!selectedService && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
              <p className="text-gray-500 mt-1">Browse our services, compare plans, and register for the one that fits your goals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableServices.map((service) => (
                <button
                  key={service.slug}
                  onClick={() => handleSelectService(service.slug)}
                  className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${service.color}`} />
                  <div className="p-6">
                    <div className={`w-12 h-12 ${service.iconBg} ${service.iconColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      {service.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                      View Plans
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Selected Service View */}
        {selectedService && (
          <div>
            <button onClick={() => setSelectedService(null)} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Services
            </button>

            {loadingPlans ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading plan details...</p></div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full" />
                  <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight relative">{selectedServiceInfo?.name} Plans</h2>
                  <p className="mt-2 text-blue-200 text-lg max-w-2xl relative">
                    {getCurrentPlanTier(selectedService!)
                      ? `You are on the ${getCurrentPlanTier(selectedService!)} plan. Upgrade to unlock more features.`
                      : 'Compare and choose the plan that best fits your needs.'}
                  </p>
                </div>

                {/* Register / Upgrade CTA Cards */}
                <div className={`grid gap-5 mb-10 ${plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  {plans.map((plan) => {
                    const currentTier = getCurrentPlanTier(selectedService!);
                    const isCurrent = currentTier === plan.key;
                    const canUpgrade = isUpgrade(plan.key, currentTier);
                    const priceDiff = getUpgradePriceDiff(plan.key, currentTier);
                    const isLowerPlan = currentTier ? (PLAN_HIERARCHY[plan.key] ?? -1) < (PLAN_HIERARCHY[currentTier] ?? -1) : false;

                    return (
                      <div key={plan.key} className={`relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border ${isCurrent ? 'ring-2 ring-green-500 ' : ''}${plan.borderColor} overflow-hidden`}>
                        {isCurrent && (
                          <div className="absolute top-3 right-3 z-10 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Current Plan
                          </div>
                        )}
                        <div className={`${plan.headerGradient} px-5 py-4 text-white`}>
                          <h3 className="text-lg font-bold">{plan.name}</h3>
                          {plan.subtitle && <p className="text-xs opacity-80 mt-0.5">{plan.subtitle}</p>}
                        </div>
                        <div className="p-5">
                          {pricing?.[plan.key] != null ? (
                            <div className="mb-4">
                              <p className="text-3xl font-extrabold text-gray-900">₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                              <p className="text-xs text-gray-500 mt-1">One-time payment</p>
                              {canUpgrade && priceDiff != null && priceDiff > 0 && (
                                <p className="text-sm text-emerald-600 font-semibold mt-2">
                                  +₹{priceDiff.toLocaleString('en-IN')} upgrade difference
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mb-4"><p className="text-sm text-gray-400 font-medium">Price not set</p></div>
                          )}

                          {isCurrent ? (
                            <button disabled className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-green-500 cursor-default">
                              Your Current Plan
                            </button>
                          ) : canUpgrade ? (
                            <button
                              onClick={() => handleUpgrade(plan.key)}
                              disabled={registering !== null || pricing?.[plan.key] == null}
                              className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.headerGradient} hover:opacity-90 hover:shadow-md`}
                            >
                              {registering === plan.key ? (
                                <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Upgrading...</span>
                              ) : `Upgrade to ${plan.name}`}
                            </button>
                          ) : isLowerPlan ? (
                            <button disabled className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-gray-400 bg-gray-100 cursor-not-allowed">
                              Lower Tier
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRegister(plan.key)}
                              disabled={registering !== null || pricing?.[plan.key] == null}
                              className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.headerGradient} hover:opacity-90 hover:shadow-md`}
                            >
                              {registering === plan.key ? (
                                <span className="inline-flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Registering...</span>
                              ) : 'Register Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Features Comparison */}
                {getServiceFeatures(selectedService!).length > 0 && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Plan Features Comparison</h2>
                      <p className="text-sm text-gray-500 mt-1">See what&apos;s included across all tiers.</p>
                    </div>
                    <ServicePlanDetailsView features={getServiceFeatures(selectedService!)} pricing={pricing} plans={plans} serviceName={selectedServiceInfo?.name || ''} showPricing={false} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
