'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, serviceAPI, servicePlanAPI, studentPlanDiscountAPI } from '@/lib/api';
import { User, Service, USER_ROLE } from '@/types';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import CoachingClassCards, { ClassTiming } from '@/components/CoachingClassCards';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import ParentLayout from '@/components/ParentLayout';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListBackBtnClass,
  roleListTabStatGridClass,
} from '@/components/studentDetailResponsive';
import toast, { Toaster } from 'react-hot-toast';

interface PlanDiscountInfo {
  type: string;
  value: number;
  calculatedAmount: number;
  discountId: string;
  reason?: string;
}

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
  const [coachingRegisteredClasses, setCoachingRegisteredClasses] = useState<Record<string, ClassTiming | null>>({});
  const [studentName, setStudentName] = useState<string>(paramStudentName || '');
  const [adminId, setAdminId] = useState<string>(paramAdminId || '');
  const [advisorId, setAdvisorId] = useState<string>('');

  // Discount state
  const [planDiscounts, setPlanDiscounts] = useState<Record<string, Record<string, PlanDiscountInfo>>>({});
  const [discountForm, setDiscountForm] = useState<{ planKey: string; type: string; value: string; reason: string } | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [advisorOwnedServiceSlugs, setAdvisorOwnedServiceSlugs] = useState<string[]>([]);
  const [isTransferredStudent, setIsTransferredStudent] = useState(false);
  const isAdmin = user?.role === USER_ROLE.ADMIN || user?.role === USER_ROLE.ADVISOR || user?.role === 'admin';

  // Discount management restrictions for transferred students:
  // - Advisor: can only manage discounts for services they originally registered
  // - Admin: can only manage discounts for services NOT registered under an advisor
  const canManageDiscount = (serviceSlug: string) => {
    if (!isTransferredStudent) return true; // Not transferred, full access for both
    if (user?.role === USER_ROLE.ADVISOR) {
      return advisorOwnedServiceSlugs.includes(serviceSlug); // Advisor: only own services
    }
    // Admin: block advisor-owned services (those discounts are locked)
    return !advisorOwnedServiceSlugs.includes(serviceSlug);
  };

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
            if (data.coachingPlanTiers) setCoachingRegisteredClasses(data.coachingPlanTiers);
            if (data.studentName) setStudentName(data.studentName);
            if (data.adminId) setAdminId(data.adminId);
            if (data.advisorId) setAdvisorId(data.advisorId);
            if (!data.adminId && data.advisorId) setAdminId(data.advisorId);
            if (data.adminId && data.advisorId) setIsTransferredStudent(true);
            if (data.advisorOwnedServiceSlugs) setAdvisorOwnedServiceSlugs(data.advisorOwnedServiceSlugs);
          } catch (err: any) {
            if (err?.response?.status === 403) {
              toast.error('You do not have access to this student');
              router.push('/');
              return;
            }
          }

          // Fetch student plan discounts
          try {
            const discRes = await studentPlanDiscountAPI.getDiscounts(studentId);
            setPlanDiscounts(discRes.data.data.discounts || {});
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
    setDiscountForm(null);

    try {
      let p: Record<string, number> | null = null;

      // For transferred students, use advisor pricing for advisor-owned services
      const useAdvisorPricing = isTransferredStudent && advisorOwnedServiceSlugs.includes(slug) && advisorId;
      const pricingId = useAdvisorPricing ? advisorId : adminId;

      if (pricingId) {
        try {
          const pricingRes = await servicePlanAPI.getAdminPricingById(slug, pricingId);
          p = pricingRes.data.data.pricing || null;
        } catch {
          // Will fall through to own-pricing fallback
        }
      }

      // Fallback: if logged-in admin/advisor is viewing and student pricing lookup returned empty,
      // fetch own admin/advisor pricing directly.
      if (!p && isAdmin) {
        try {
          const ownPricingRes = await servicePlanAPI.getAdminPricing(slug);
          p = ownPricingRes.data.data.pricing || null;
        } catch {
          // Own pricing also unavailable
        }
      }

      if (p) setPricing(p);
    } catch {
      console.error('Failed to load pricing');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSetDiscount = async () => {
    if (!discountForm || !studentId || !selectedService) return;
    const val = Number(discountForm.value);
    if (isNaN(val) || val < 0) { toast.error('Invalid discount value'); return; }
    setSavingDiscount(true);
    try {
      await studentPlanDiscountAPI.setDiscount({
        studentId,
        serviceSlug: selectedService,
        planTier: discountForm.planKey,
        type: discountForm.type,
        value: val,
        reason: discountForm.reason || undefined,
      });
      toast.success('Discount set successfully');
      setDiscountForm(null);
      // Refresh discounts
      const discRes = await studentPlanDiscountAPI.getDiscounts(studentId);
      setPlanDiscounts(discRes.data.data.discounts || {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleRemoveDiscount = async (discountId: string) => {
    if (!studentId) return;
    try {
      await studentPlanDiscountAPI.removeDiscount(discountId);
      toast.success('Discount removed');
      const discRes = await studentPlanDiscountAPI.getDiscounts(studentId);
      setPlanDiscounts(discRes.data.data.discounts || {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove discount');
    }
  };

  const getDiscountedPrice = (slug: string, planKey: string, originalPrice: number): number | null => {
    const disc = planDiscounts[slug]?.[planKey];
    if (!disc) return null;
    return originalPrice - disc.calculatedAmount;
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
  const isParent = user?.role === USER_ROLE.PARENT;

  const handlePageBack = () => {
    if (selectedService) {
      setSelectedService(null);
      setPricing(null);
      return;
    }
    if (studentId && isParent) {
      router.push(`/parent/students/${studentId}`);
      return;
    }
    router.back();
  };

  const pageContent = (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        <div className={`mx-auto max-w-7xl ${roleListPagePadding}`}>
          <button
            type="button"
            onClick={handlePageBack}
            className={roleListBackBtnClass}
          >
            <svg className="mr-1.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {selectedService ? 'Back to Services' : studentId && isParent ? 'Back to Student' : 'Back'}
          </button>

          {!selectedService && (
            <div className="mb-4 sm:mb-6">
              <h1 className={roleListTitleClass}>Service Plans</h1>
              <p className={roleListSubtitleClass}>
                {studentName
                  ? `View ${studentName}'s registered plans and pricing`
                  : 'Select a service to view plan details and pricing'}
              </p>
            </div>
          )}

          {/* Service Selection */}
          {!selectedService && (
            <>
              <div className={roleListTabStatGridClass}>
                <PageStatCard
                  title="Available Services"
                  mobileTitle="Services"
                  value={services.length}
                  color="blue"
                />
                <PageStatCard
                  title="Registered Plans"
                  mobileTitle="Registered"
                  value={Object.keys(studentPlanTiers).length}
                  color="green"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                {services.map((service) => (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => handleSelectService(service.slug)}
                    className="group w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2"
                  >
                    <div className="p-3 sm:p-6">
                      <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
                          <svg className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-lg">{service.name}</h3>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 sm:text-sm">{service.shortDescription}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {studentPlanTiers[service.slug] && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 sm:text-xs">
                            {studentPlanTiers[service.slug]} Plan
                          </span>
                        )}
                        {service.slug === 'coaching-classes' && Object.keys(coachingRegisteredClasses).length > 0 && (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-800 sm:text-xs">
                            {Object.keys(coachingRegisteredClasses).length} Registered
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-blue-700 sm:mt-4 sm:py-2.5 sm:text-sm">
                        View Plans
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
              {loadingPlans ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading plan details...</p></div>
                </div>
              ) : (
                <>
                {selectedService === 'coaching-classes' ? (
                  <>
                    {/* Coaching Classes Header */}
                    <div className="mb-8">
                      <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Classes</h2>
                      <p className="mt-1 text-gray-500 text-lg max-w-2xl">
                        {Object.keys(coachingRegisteredClasses).length > 0
                          ? `${studentName || 'Student'} is registered for ${Object.keys(coachingRegisteredClasses).length} coaching class(es).`
                          : 'Compare features and pricing across all coaching classes.'}
                      </p>
                    </div>

                    {/* No pricing warning */}
                    {!pricing && (
                      <div className="mb-8 bg-amber-50/80 backdrop-blur border border-amber-200 rounded-2xl p-5">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900">Pricing Not Available</p>
                            <p className="text-sm text-amber-700 mt-0.5">{adminId ? 'Admin has not set pricing yet.' : 'No admin pricing available.'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <CoachingClassCards
                      plans={plans}
                      pricing={pricing}
                      registeredClasses={Object.keys(coachingRegisteredClasses).length > 0 ? coachingRegisteredClasses : undefined}
                      discounts={selectedService ? planDiscounts[selectedService] : undefined}
                    />

                    {/* Admin Discount Controls for Coaching */}
                    {isAdmin && studentId && canManageDiscount(selectedService!) && (
                      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Set Discount for {studentName || 'Student'}</h3>
                        {!pricing && (
                          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Set admin selling price first for this service, then discount options will be enabled for each plan.
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {plans.map((plan) => {
                            const price = pricing?.[plan.key];
                            if (price == null) {
                              return (
                                <div key={plan.key} className="border border-gray-200 rounded-xl p-4">
                                  <p className="text-sm font-bold text-gray-800 mb-1">{plan.name}</p>
                                  <p className="text-xs text-gray-500 mb-2">Price: Not set</p>
                                  <p className="text-xs text-amber-700 font-medium">Set pricing for this plan to enable discounts.</p>
                                </div>
                              );
                            }
                            const disc = planDiscounts[selectedService!]?.[plan.key];
                            const discountedPrice = disc ? price - disc.calculatedAmount : null;
                            const isEditing = discountForm?.planKey === plan.key;

                            return (
                              <div key={plan.key} className="border border-gray-200 rounded-xl p-4">
                                <p className="text-sm font-bold text-gray-800 mb-1">{plan.name}</p>
                                <p className="text-xs text-gray-500 mb-2">Price: ₹{price.toLocaleString('en-IN')}</p>
                                {disc && !isEditing ? (
                                  <div>
                                    <p className="text-xs text-blue-700 font-semibold">
                                      Discount: {disc.type === 'percentage' ? `${disc.value}%` : `₹${disc.value.toLocaleString('en-IN')}`} (-₹{disc.calculatedAmount.toLocaleString('en-IN')})
                                    </p>
                                    <p className="text-sm font-bold text-blue-600 mt-1">After Discount: ₹{discountedPrice?.toLocaleString('en-IN')}</p>
                                    {disc.reason && <p className="text-xs text-gray-400 mt-1">Reason: {disc.reason}</p>}
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={() => setDiscountForm({ planKey: plan.key, type: disc.type, value: String(disc.value), reason: disc.reason || '' })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                      <button onClick={() => handleRemoveDiscount(disc.discountId)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
                                    </div>
                                  </div>
                                ) : isEditing ? (
                                  <div className="space-y-2">
                                    <select value={discountForm.type} onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5">
                                      <option value="percentage">Percentage (%)</option>
                                      <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                    <input type="number" min="0" value={discountForm.value} onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })} placeholder={discountForm.type === 'percentage' ? 'e.g. 10' : 'e.g. 5000'} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                                    <input type="text" value={discountForm.reason} onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })} placeholder="Reason (optional)" className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                                    <div className="flex gap-2">
                                      <button onClick={handleSetDiscount} disabled={savingDiscount || !discountForm.value} className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{savingDiscount ? 'Saving...' : 'Save'}</button>
                                      <button onClick={() => setDiscountForm(null)} className="flex-1 text-xs bg-gray-100 text-gray-600 py-1.5 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setDiscountForm({ planKey: plan.key, type: 'percentage', value: '', reason: '' })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Set Discount</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                      <p className="text-sm text-blue-800">
                        <strong>All coaching classes include:</strong> Study Material, Session Recordings, and dedicated mock tests as listed per program.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Mobile title */}
                    <div className="mb-4 md:hidden">
                      <h2 className={roleListTitleClass}>{selectedServiceInfo?.name} Plans</h2>
                      <p className={roleListSubtitleClass}>
                        {studentPlanTiers[selectedService!]
                          ? `${studentName || 'Student'} is on the ${studentPlanTiers[selectedService!]} plan.`
                          : 'Compare features and pricing across all plan tiers.'}
                      </p>
                    </div>

                    {/* Desktop banner — unchanged */}
                    <div className="mb-8 hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden md:block">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full" />
                      <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight relative">{selectedServiceInfo?.name} Plans</h2>
                      <p className="mt-2 text-blue-200 text-lg max-w-2xl relative">
                        {studentPlanTiers[selectedService!]
                          ? `${studentName || 'Student'} is on the ${studentPlanTiers[selectedService!]} plan.`
                          : 'Compare features and pricing across all plan tiers.'}
                      </p>
                    </div>

                    {/* Plan Cards — full-width stacked on mobile (like student plans page) */}
                    {plans.length > 0 && studentPlanTiers[selectedService!] && (
                      <div className={`mb-6 grid gap-4 sm:mb-8 sm:gap-6 ${plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                        {plans.map((plan) => {
                          const currentTier = studentPlanTiers[selectedService!];
                          const isCurrent = currentTier === plan.key;
                          const PLAN_HIERARCHY: Record<string, number> = { PRO: 0, PREMIUM: 1, PLATINUM: 2 };
                          const isUpgradePlan = (PLAN_HIERARCHY[plan.key] ?? -1) > (PLAN_HIERARCHY[currentTier] ?? -1);
                          const isLowerPlan = (PLAN_HIERARCHY[plan.key] ?? -1) < (PLAN_HIERARCHY[currentTier] ?? -1);
                          const priceDiff = pricing && pricing[plan.key] != null && pricing[currentTier] != null
                            ? pricing[plan.key] - pricing[currentTier] : null;
                          const disc = planDiscounts[selectedService!]?.[plan.key];
                          const discountedPrice = pricing?.[plan.key] != null && disc ? pricing[plan.key] - disc.calculatedAmount : null;

                          return (
                            <div key={plan.key} className={`relative rounded-2xl shadow-sm border ${isCurrent ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'} overflow-hidden`}>
                              {!isCurrent && <div className={`h-1.5 ${plan.badgeBg}`} />}
                              {isCurrent && (
                                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                  Current Plan
                                </div>
                              )}
                              <div className="p-4 sm:p-5 md:p-7">
                                <div className="mb-1">
                                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${isCurrent ? 'bg-white/20 text-white' : `${plan.badgeBg} text-white`}`}>{plan.name}</span>
                                </div>
                                {plan.subtitle && <p className={`mb-3 text-xs font-semibold uppercase tracking-wide sm:mb-4 ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>{plan.subtitle}</p>}
                                {pricing?.[plan.key] != null ? (
                                  <div className="mb-4 sm:mb-5">
                                    {discountedPrice != null ? (
                                      <>
                                        <p className={`text-lg line-through ${isCurrent ? 'text-blue-300' : 'text-gray-400'}`}>₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                                        <p className={`text-2xl font-extrabold sm:text-3xl md:text-4xl ${isCurrent ? 'text-white' : 'text-gray-900'}`}>₹{discountedPrice.toLocaleString('en-IN')}</p>
                                        <p className={`mt-1 text-xs font-semibold ${isCurrent ? 'text-blue-200' : 'text-gray-600'}`}>
                                          {disc.type === 'percentage' ? `${disc.value}% off` : `₹${disc.calculatedAmount.toLocaleString('en-IN')} off`}
                                        </p>
                                      </>
                                    ) : (
                                      <p className={`text-2xl font-extrabold sm:text-3xl md:text-4xl ${isCurrent ? 'text-white' : 'text-gray-900'}`}>₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                                    )}
                                    {isUpgradePlan && priceDiff != null && priceDiff > 0 && (
                                      <p className={`mt-2 text-sm font-semibold ${isCurrent ? 'text-blue-200' : 'text-emerald-600'}`}>+₹{priceDiff.toLocaleString('en-IN')} upgrade difference</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mb-4 sm:mb-5"><p className={`text-sm font-medium ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>Price not set</p></div>
                                )}
                                {isCurrent ? (
                                  <span className="inline-block w-full rounded-full bg-white py-2.5 text-center text-sm font-bold text-blue-600 sm:py-3">Current Plan</span>
                                ) : isUpgradePlan ? (
                                  <span className="inline-block w-full rounded-full border border-blue-200 bg-blue-50 py-2.5 text-center text-sm font-bold text-blue-600 sm:py-3">Upgrade Option</span>
                                ) : isLowerPlan ? (
                                  <span className="inline-block w-full rounded-full bg-gray-100 py-2.5 text-center text-sm font-bold text-gray-400 sm:py-3">Lower Tier</span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {plans.length > 0 ? (
                      <>
                      <ServicePlanDetailsView
                        features={features}
                        pricing={pricing}
                        plans={plans}
                        serviceName={selectedServiceInfo?.name || ''}
                        showPricing={!studentPlanTiers[selectedService!]}
                        noPricingMessage={adminId ? 'Admin has not set pricing yet.' : 'No admin pricing available.'}
                        discounts={selectedService ? planDiscounts[selectedService] : undefined}
                      />

                      {/* Admin Discount Controls */}
                      {isAdmin && studentId && canManageDiscount(selectedService!) && (
                        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Set Discount for {studentName || 'Student'}</h3>
                          {!pricing && (
                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              Set admin selling price first for this service, then discount options will be enabled for each plan.
                            </div>
                          )}
                          <div className={`grid gap-4 ${plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                            {plans.map((plan) => {
                              const price = pricing?.[plan.key];
                              if (price == null) {
                                return (
                                  <div key={plan.key} className="border border-gray-200 rounded-xl p-4">
                                    <p className="text-sm font-bold text-gray-800 mb-1">{plan.name}</p>
                                    <p className="text-xs text-gray-500 mb-2">Price: Not set</p>
                                    <p className="text-xs text-amber-700 font-medium">Set pricing for this plan to enable discounts.</p>
                                  </div>
                                );
                              }
                              const disc = planDiscounts[selectedService!]?.[plan.key];
                              const discountedPrice = disc ? price - disc.calculatedAmount : null;
                              const isEditing = discountForm?.planKey === plan.key;

                              return (
                                <div key={plan.key} className="border border-gray-200 rounded-xl p-4">
                                  <p className="text-sm font-bold text-gray-800 mb-1">{plan.name}</p>
                                  <p className="text-xs text-gray-500 mb-2">Price: ₹{price.toLocaleString('en-IN')}</p>
                                  {disc && !isEditing ? (
                                    <div>
                                      <p className="text-xs text-blue-700 font-semibold">
                                        Discount: {disc.type === 'percentage' ? `${disc.value}%` : `₹${disc.value.toLocaleString('en-IN')}`} (-₹{disc.calculatedAmount.toLocaleString('en-IN')})
                                      </p>
                                      <p className="text-sm font-bold text-blue-600 mt-1">After Discount: ₹{discountedPrice?.toLocaleString('en-IN')}</p>
                                      {disc.reason && <p className="text-xs text-gray-400 mt-1">Reason: {disc.reason}</p>}
                                      <div className="flex gap-2 mt-2">
                                        <button onClick={() => setDiscountForm({ planKey: plan.key, type: disc.type, value: String(disc.value), reason: disc.reason || '' })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                        <button onClick={() => handleRemoveDiscount(disc.discountId)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
                                      </div>
                                    </div>
                                  ) : isEditing ? (
                                    <div className="space-y-2">
                                      <select value={discountForm.type} onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                      </select>
                                      <input type="number" min="0" value={discountForm.value} onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })} placeholder={discountForm.type === 'percentage' ? 'e.g. 10' : 'e.g. 5000'} className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                                      <input type="text" value={discountForm.reason} onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })} placeholder="Reason (optional)" className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                                      <div className="flex gap-2">
                                        <button onClick={handleSetDiscount} disabled={savingDiscount || !discountForm.value} className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{savingDiscount ? 'Saving...' : 'Save'}</button>
                                        <button onClick={() => setDiscountForm(null)} className="flex-1 text-xs bg-gray-100 text-gray-600 py-1.5 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDiscountForm({ planKey: plan.key, type: 'percentage', value: '', reason: '' })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Set Discount</button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      </>
                    ) : (
                      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <p className="text-gray-500">No plans configured for this service yet.</p>
                      </div>
                    )}
                  </>
                )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (isParent) {
    return <ParentLayout user={user}>{pageContent}</ParentLayout>;
  }

  return pageContent;
}

export default function ServicePlansViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <ServicePlansViewContent />
    </Suspense>
  );
}
