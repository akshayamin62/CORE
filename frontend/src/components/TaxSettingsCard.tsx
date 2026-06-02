'use client';

import { useEffect, useState } from 'react';
import { servicePlanAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface TaxSettingsCardProps {
  serviceSlug: string;
  // Current saved tax percentage for this service (defaults to 18 when not set)
  gstPercentage?: number;
  // Called after a successful save with the new percentage
  onSaved?: (gst: number) => void;
  // Tailwind accent color name used for the icon/button (e.g. 'blue', 'teal', 'purple')
  accent?: 'blue' | 'teal' | 'purple';
}

const ACCENTS: Record<string, { iconBg: string; iconText: string; ring: string; btn: string; chipBg: string; chipText: string }> = {
  blue: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', ring: 'focus:ring-blue-500 focus:border-blue-500', btn: 'bg-blue-600 hover:bg-blue-700', chipBg: 'bg-blue-50', chipText: 'text-blue-700' },
  teal: { iconBg: 'bg-teal-100', iconText: 'text-teal-600', ring: 'focus:ring-teal-500 focus:border-teal-500', btn: 'bg-teal-600 hover:bg-teal-700', chipBg: 'bg-teal-50', chipText: 'text-teal-700' },
  purple: { iconBg: 'bg-purple-100', iconText: 'text-purple-600', ring: 'focus:ring-purple-500 focus:border-purple-500', btn: 'bg-purple-600 hover:bg-purple-700', chipBg: 'bg-purple-50', chipText: 'text-purple-700' },
};

export default function TaxSettingsCard({ serviceSlug, gstPercentage, onSaved, accent = 'blue' }: TaxSettingsCardProps) {
  const [value, setValue] = useState<string>(gstPercentage != null ? String(gstPercentage) : '18');
  const [saving, setSaving] = useState(false);
  const a = ACCENTS[accent] || ACCENTS.blue;

  // Keep input synced when the saved value loads/changes from the parent.
  useEffect(() => {
    if (gstPercentage != null) setValue(String(gstPercentage));
  }, [gstPercentage]);

  const handleSave = async () => {
    const num = Number(value);
    if (value === '' || isNaN(num) || num < 0 || num > 100) {
      toast.error('Enter a tax percentage between 0 and 100.');
      return;
    }
    setSaving(true);
    try {
      const res = await servicePlanAPI.setAdminTax(serviceSlug, num);
      const saved = res.data?.data?.gstPercentage ?? num;
      toast.success('Tax percentage updated!');
      onSaved?.(saved);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tax percentage');
    } finally {
      setSaving(false);
    }
  };

  const dirty = String(Number(value)) !== String(gstPercentage ?? 18);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-10 h-10 ${a.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          <svg className={`w-5 h-5 ${a.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tax (GST) Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Set the tax percentage applied on top of your prices for this service. This is added at checkout and shown on student invoices.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="sm:max-w-xs w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tax Percentage</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 18"
              className={`w-full pl-4 pr-9 py-2.5 border border-gray-300 rounded-lg ${a.ring} text-gray-900`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`px-6 py-2.5 ${a.btn} text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          {saving ? 'Saving...' : 'Save Tax'}
        </button>
        <div className="text-sm text-gray-500 sm:pb-2.5">
          Current: <span className={`font-semibold px-2 py-0.5 rounded-full ${a.chipBg} ${a.chipText}`}>{gstPercentage ?? 18}% GST</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">Set to <strong>0%</strong> to disable tax. Changes apply only to new registrations and invoices.</p>
    </div>
  );
}
