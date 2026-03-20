'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, servicePlanAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import CoachingClassCards from '@/components/CoachingClassCards';
import { getServicePlans } from '@/config/servicePlans';
import toast, { Toaster } from 'react-hot-toast';

export default function CoachingClassesPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number> | null>(null);
  const [basePricing, setBasePricing] = useState<Record<string, number> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const plans = getServicePlans('coaching-classes');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADMIN) { toast.error('Access denied.'); router.push('/'); return; }
      setUser(userData);
      await fetchPricing();
    } catch { toast.error('Please login to continue'); router.push('/login'); }
    finally { setLoading(false); }
  };

  const fetchPricing = async () => {
    try {
      const [pricingRes, baseRes] = await Promise.all([
        servicePlanAPI.getAdminPricing('coaching-classes'),
        servicePlanAPI.getBasePricingForAdmin('coaching-classes'),
      ]);
      const p = pricingRes.data.data.pricing;
      if (p) {
        setPricing(p);
        const fd: Record<string, string> = {};
        for (const [key, val] of Object.entries(p)) fd[key] = String(val);
        setFormData(fd);
      }
      const bp = baseRes.data.data.basePricing;
      if (bp) setBasePricing(bp);
    } catch (error: any) { console.error('Failed to fetch pricing:', error); }
  };

  const handleSave = async () => {
    const prices: Record<string, number> = {};
    for (const plan of plans) {
      const val = Number(formData[plan.key]);
      if (isNaN(val) || val < 0) { toast.error(`Invalid price for ${plan.name}.`); return; }
      prices[plan.key] = val;
    }
    setSaving(true);
    try {
      const res = await servicePlanAPI.setAdminPricing('coaching-classes', prices);
      setPricing(res.data.data.pricing);
      toast.success('Pricing updated successfully!');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to update pricing'); }
    finally { setSaving(false); }
  };

  if (loading || !user) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>);
  }

  return (
    <AdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="px-6 lg:px-8 py-8">
          <button onClick={() => router.push('/admin/service-pricing')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Service Pricing
          </button>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Coaching Fees</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">Set the selling prices for your students&apos; coaching classes.</p>
        </div>

        <div className="p-6 lg:p-8">
          {/* Pricing Form — 2-column grid */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{pricing ? 'Update Fees' : 'Set Fees'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plans.map((plan) => {
                const inputVal = Number(formData[plan.key]) || 0;
                const basePrice = basePricing ? (basePricing[plan.key] ?? null) : null;
                const profit = basePrice !== null && inputVal > 0 ? inputVal - basePrice : null;
                return (
                  <div key={plan.key} className={`p-4 rounded-xl border ${plan.borderColor} bg-gray-50/50`}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {plan.name}
                      {plan.subtitle && <span className="text-xs text-gray-400 font-normal ml-2">({plan.subtitle})</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input type="number" min="0" step="1" value={formData[plan.key] || ''} onChange={(e) => setFormData({ ...formData, [plan.key]: e.target.value })} placeholder="Selling price" className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900" />
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      {basePrice !== null && <span className="text-gray-500">Base: ₹{basePrice.toLocaleString('en-IN')}</span>}
                      {profit !== null && (
                        <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Your Margin: {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || plans.some(p => !formData[p.key])} className="px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : pricing ? 'Update Pricing' : 'Save Pricing'}
              </button>
              {!pricing && <p className="text-sm text-amber-600">Students will not see any pricing until you set it here.</p>}
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-800">How pricing works</p>
                <p className="text-sm text-teal-700 mt-1">The <strong>base price</strong> is what you pay to the platform. The <strong>selling price</strong> you set is what your students see. The difference is your profit margin.</p>
              </div>
            </div>
          </div>

          {/* Plan Preview */}
          <div className="mt-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Coaching Classes Plan Details</h2>
              <p className="text-sm text-gray-500 mt-1">This is what your students will see when browsing plans.</p>
            </div>
            <CoachingClassCards plans={plans} pricing={pricing} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
