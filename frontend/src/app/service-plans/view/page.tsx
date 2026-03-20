'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, serviceAPI, servicePlanAPI } from '@/lib/api';
import { User, Service } from '@/types';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

function ServicePlansViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  // Support legacy URLs with explicit adminId/studentName params
  const paramAdminId = searchParams.get('adminId');
  const paramStudentName = searchParams.get('studentName');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [studentPlanTiers, setStudentPlanTiers] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState<string>(paramStudentName || '');
  const [adminId, setAdminId] = useState<string>(paramAdminId || '');

  useEffect(() => {
    const init = async () => {
      try {
        const [profileRes, servicesRes] = await Promise.all([
          authAPI.getProfile(),
          serviceAPI.getAllServices(),
        ]);
        setUser(profileRes.data.data.user);
        const allServices = servicesRes.data.data.services || servicesRes.data.data || [];
        setServices(allServices.filter((s: Service) => s.isActive));

        // Fetch student's current plan tiers, name, and adminId if studentId is provided
        if (studentId) {
          try {
            const tiersRes = await servicePlanAPI.getStudentPlanTiers(studentId);
            const data = tiersRes.data.data;
            setStudentPlanTiers(data.planTiers || {});
            if (data.studentName) setStudentName(data.studentName);
            if (data.adminId) setAdminId(data.adminId);
          } catch { /* ignore */ }
        }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSelectService = async (slug: string) => {
    setSelectedService(slug);
    setLoadingPlans(true);
    setPricing(null);

    try {
      if (adminId) {
        const pricingRes = await servicePlanAPI.getAdminPricingById(slug, adminId);
        const p = pricingRes.data.data.pricing;
        if (p) setPricing(p);
      }
    } catch {
      console.error('Failed to load pricing');
    } finally {
      setLoadingPlans(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  const selectedServiceInfo = services.find(s => s.slug === selectedService);
  const plans = selectedService ? getServicePlans(selectedService) : [];
  const features = selectedService ? getServiceFeatures(selectedService) : [];

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full" />
          <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 relative">
            <button
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Service Plans</h1>
            {studentName && <p className="text-blue-200 mt-1">Viewing plans for <span className="font-semibold text-white">{studentName}</span></p>}
            {!studentName && <p className="text-blue-200 mt-1">Browse and compare service plans and pricing.</p>}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Service Selection */}
          {!selectedService && (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">Select a Service</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a service to view its plan details and pricing.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map((service) => (
                  <button
                    key={service._id}
                    onClick={() => handleSelectService(service.slug)}
                    className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 text-left"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.shortDescription}</p>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                          View Plans
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                        {studentPlanTiers[service.slug] && (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            studentPlanTiers[service.slug] === 'PLATINUM' ? 'bg-amber-100 text-amber-800' :
                            studentPlanTiers[service.slug] === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {studentPlanTiers[service.slug]}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {services.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500">No services available.</p>
                </div>
              )}
            </>
          )}

          {/* Plan Details for Selected Service */}
          {selectedService && (
            <div>
              <button
                onClick={() => { setSelectedService(null); setPricing(null); }}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Services
              </button>

              {loadingPlans ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading plan details...</p></div>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full" />
                    <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight relative">{selectedServiceInfo?.name} Plans</h2>
                    <p className="mt-2 text-blue-200 text-lg max-w-2xl relative">
                      {studentPlanTiers[selectedService!]
                        ? `${studentName || 'Student'} is on the ${studentPlanTiers[selectedService!]} plan.`
                        : 'Compare features and pricing across all plan tiers.'}
                    </p>
                  </div>

                  {/* Plan Cards with current plan indicator */}
                  {plans.length > 0 && studentPlanTiers[selectedService!] && (
                    <div className={`grid gap-5 mb-8 ${plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                      {plans.map((plan) => {
                        const currentTier = studentPlanTiers[selectedService!];
                        const isCurrent = currentTier === plan.key;
                        const PLAN_HIERARCHY: Record<string, number> = { PRO: 0, PREMIUM: 1, PLATINUM: 2 };
                        const isUpgradePlan = (PLAN_HIERARCHY[plan.key] ?? -1) > (PLAN_HIERARCHY[currentTier] ?? -1);
                        const isLowerPlan = (PLAN_HIERARCHY[plan.key] ?? -1) < (PLAN_HIERARCHY[currentTier] ?? -1);
                        const priceDiff = pricing && pricing[plan.key] != null && pricing[currentTier] != null
                          ? pricing[plan.key] - pricing[currentTier] : null;

                        return (
                          <div key={plan.key} className={`relative bg-white rounded-2xl shadow-md border-2 ${isCurrent ? 'ring-2 ring-green-500 ' : ''}${plan.borderColor} overflow-hidden`}>
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
                                <div className="mb-3">
                                  <p className="text-3xl font-extrabold text-gray-900">₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                                  <p className="text-xs text-gray-500 mt-1">One-time payment</p>
                                  {isUpgradePlan && priceDiff != null && priceDiff > 0 && (
                                    <p className="text-sm text-emerald-600 font-semibold mt-2">+₹{priceDiff.toLocaleString('en-IN')} upgrade difference</p>
                                  )}
                                </div>
                              ) : (
                                <div className="mb-3"><p className="text-sm text-gray-400 font-medium">Price not set</p></div>
                              )}
                              {isCurrent ? (
                                <span className="inline-block w-full text-center py-2 px-4 rounded-xl font-bold text-sm text-white bg-green-500">Current Plan</span>
                              ) : isUpgradePlan ? (
                                <span className="inline-block w-full text-center py-2 px-4 rounded-xl font-bold text-sm text-blue-600 bg-blue-50 border border-blue-200">Upgrade Option</span>
                              ) : isLowerPlan ? (
                                <span className="inline-block w-full text-center py-2 px-4 rounded-xl font-bold text-sm text-gray-400 bg-gray-100">Lower Tier</span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {plans.length > 0 ? (
                    <ServicePlanDetailsView
                      features={features}
                      pricing={pricing}
                      plans={plans}
                      serviceName={selectedServiceInfo?.name || ''}
                      showPricing={true}
                      noPricingMessage={adminId ? 'Admin has not set pricing yet.' : 'No admin pricing available.'}
                    />
                  ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                      <p className="text-gray-500">No plans configured for this service yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ServicePlansViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <ServicePlansViewContent />
    </Suspense>
  );
}
