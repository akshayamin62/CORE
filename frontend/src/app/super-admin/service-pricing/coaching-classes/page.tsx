'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import CoachingClassCards from '@/components/CoachingClassCards';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminCoachingClassesPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const plans = getServicePlans('coaching-classes');

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
      const res = await servicePlanAPI.getSuperAdminPricing('coaching-classes');
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
      const res = await servicePlanAPI.setSuperAdminPricing('coaching-classes', prices);
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
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.push('/super-admin/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Service Pricing
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Fees — Base Pricing</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the base (cost) price for each coaching class. Admins will see this when setting their selling prices.</p>
        </div>

        <div className="p-6 lg:p-8">
          {/* Pricing Form — 2-column grid for 11 plans */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{pricing ? 'Update Base Pricing' : 'Set Base Pricing'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plans.map((plan) => (
                <div key={plan.key} className={`p-4 rounded-xl border ${plan.borderColor} bg-gray-50/50`}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {plan.name}
                    {plan.subtitle && <span className="text-xs text-gray-400 font-normal ml-2">({plan.subtitle})</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input type="number" min="0" step="1" value={formData[plan.key] || ''} onChange={(e) => setFormData({ ...formData, [plan.key]: e.target.value })} placeholder="Base price" className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900" />
                  </div>
                  {pricing && pricing[plan.key] != null && (
                    <p className="text-xs text-gray-500 mt-1">Current: ₹{pricing[plan.key].toLocaleString('en-IN')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || plans.some(p => !formData[p.key])} className="px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : pricing ? 'Update Base Pricing' : 'Save Base Pricing'}
              </button>
              {!pricing && <p className="text-sm text-amber-600">Admins will not see any base pricing until you set it here.</p>}
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-800">How base pricing works</p>
                <p className="text-sm text-teal-700 mt-1">The base price you set here is shown to admins as their cost price. Admins set their own selling price. The difference is the admin&apos;s profit margin.</p>
              </div>
            </div>
          </div>

          {/* Plan Preview */}
          <div className="mt-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Coaching Classes Plan Details</h2>
              <p className="text-sm text-gray-500 mt-1">Feature comparison across all coaching classes.</p>
            </div>
            <CoachingClassCards plans={plans} pricing={pricing} />
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
