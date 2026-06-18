'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import ServicePlanDetailsView from '@/components/ServicePlanDetailsView';
import { getServicePlans, getServiceFeatures } from '@/config/servicePlans';
import { ServicePricingPageFrame } from '@/components/ServicePricingPageFrame';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminStudyAbroadPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const plans = getServicePlans('study-abroad');
  const features = getServiceFeatures('study-abroad');

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
        await fetchPricing();
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const fetchPricing = async () => {
    try {
      const res = await servicePlanAPI.getSuperAdminPricing('study-abroad');
      const p = res.data.data.pricing;
      if (p) {
        setPricing(p);
        const fd: Record<string, string> = {};
        for (const [key, val] of Object.entries(p)) fd[key] = String(val);
        setFormData(fd);
      }
    } catch (error: any) {
      console.error('Failed to fetch pricing:', error);
    }
  };

  const handleSave = async () => {
    const prices: Record<string, number> = {};
    for (const plan of plans) {
      const val = Number(formData[plan.key]);
      if (isNaN(val) || val < 0) {
        toast.error(`Invalid price for ${plan.name}. Must be a non-negative number.`);
        return;
      }
      prices[plan.key] = val;
    }

    setSaving(true);
    try {
      const res = await servicePlanAPI.setSuperAdminPricing('study-abroad', prices);
      setPricing(res.data.data.pricing);
      toast.success('Base pricing updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

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
      <ServicePricingPageFrame
        title="Study Abroad — Base Pricing"
        description="Set the base (cost) price for each plan tier. Admins will see this when setting their own selling price."
        backHref="/super-admin/service-pricing"
      >
          {pricing && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:rounded-2xl sm:p-6">
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${plan.badgeBg}`} />
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm sm:h-11 sm:w-11 sm:rounded-xl ${plan.iconBg} ${plan.iconText}`}>
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    </div>
                    <span className={`rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:px-3 sm:py-1 sm:text-xs ${plan.textColor} ${plan.borderColor}`}>{plan.name}</span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 sm:text-4xl">₹{pricing[plan.key]?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">Base price</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-6 lg:p-8">
            <h2 className="mb-4 text-base font-bold text-gray-900 sm:mb-6 sm:text-lg">{pricing ? 'Update Base Pricing' : 'Set Base Pricing'}</h2>
            <div className="space-y-4 sm:space-y-5">
              {plans.map((plan) => (
                <div key={plan.key}>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">{plan.name} Plan Base Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-gray-400">₹</span>
                    <input type="number" min="0" step="1" value={formData[plan.key] || ''} onChange={(e) => setFormData({ ...formData, [plan.key]: e.target.value })} placeholder="Enter base price" className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-base" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center">
              <button onClick={handleSave} disabled={saving || plans.some(p => !formData[p.key])} className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? 'Saving...' : pricing ? 'Update Base Pricing' : 'Save Base Pricing'}
              </button>
              {!pricing && <p className="text-xs text-amber-600 sm:text-sm">Admins will not see any base pricing until you set it here.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 sm:h-9 sm:w-9">
                <svg className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 sm:text-sm">How base pricing works</p>
                <p className="mt-1 text-xs text-blue-700 sm:text-sm">The base price you set here is shown to admins as their cost price. Admins set their own selling price (which must be at or above the base price). The difference is the admin&apos;s profit margin.</p>
              </div>
            </div>
          </div>

          {features.length > 0 && (
            <div>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Study Abroad Plan Details</h2>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">Complete feature comparison across all plan tiers.</p>
              </div>
              <ServicePlanDetailsView features={features} pricing={pricing} plans={plans} serviceName="Study Abroad" showPricing={false} />
            </div>
          )}
      </ServicePricingPageFrame>
    </SuperAdminLayout>
  );
}
