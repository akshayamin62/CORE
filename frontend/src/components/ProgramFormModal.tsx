'use client';

import { useState } from 'react';
import ResponsiveFormModal from '@/components/ResponsiveFormModal';

interface ProgramFormData {
  university: string;
  universityRanking: {
    webometricsWorld: string;
    webometricsNational: string;
    usNews: string;
    qs: string;
  };
  programName: string;
  programUrl: string;
  campus: string;
  country: string;
  studyLevel: string;
  duration: string;
  ieltsScore: string;
  applicationFee: string;
  yearlyTuitionFees: string;
}

interface ProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProgramFormData) => Promise<void>;
  submitting: boolean;
}

export default function ProgramFormModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: ProgramFormModalProps) {
  const [currency, setCurrency] = useState('');
  const [formData, setFormData] = useState<ProgramFormData>({
    university: '',
    universityRanking: {
      webometricsWorld: '',
      webometricsNational: '',
      usNews: '',
      qs: '',
    },
    programName: '',
    programUrl: '',
    campus: '',
    country: '',
    studyLevel: '',
    duration: '',
    ieltsScore: '',
    applicationFee: '',
    yearlyTuitionFees: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('ranking.')) {
      const rankingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        universityRanking: {
          ...prev.universityRanking,
          [rankingKey]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefixFee = (fee: string) => {
      if (!fee) return fee;
      if (currency) return `${currency} ${fee}`;
      return fee;
    };
    await onSubmit({
      ...formData,
      applicationFee: prefixFee(formData.applicationFee),
      yearlyTuitionFees: prefixFee(formData.yearlyTuitionFees),
    });
    resetForm();
  };

  const resetForm = () => {
    setCurrency('');
    setFormData({
      university: '',
      universityRanking: {
        webometricsWorld: '',
        webometricsNational: '',
        usNews: '',
        qs: '',
      },
      programName: '',
      programUrl: '',
      campus: '',
      country: '',
      studyLevel: '',
      duration: '',
      ieltsScore: '',
      applicationFee: '',
      yearlyTuitionFees: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ResponsiveFormModal
      open={isOpen}
      onClose={handleClose}
      title="Add New Program"
      maxWidth="4xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-300 md:py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-program-form"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:py-2"
          >
            {submitting ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      }
    >
      <form id="add-program-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">University *</label>
            <input
              type="text"
              name="university"
              value={formData.university}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Program Name *</label>
            <input
              type="text"
              name="programName"
              value={formData.programName}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Program Link *</label>
            <input
              type="url"
              name="programUrl"
              value={formData.programUrl}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Campus</label>
            <input
              type="text"
              name="campus"
              value={formData.campus}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Country *</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Study Level *</label>
            <select
              name="studyLevel"
              value={formData.studyLevel}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Level</option>
              <option value="Certificate">Certificate</option>
              <option value="Diploma">Diploma</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate/Master">Postgraduate/Master</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Duration (months)</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">IELTS Score</label>
            <input
              type="number"
              step="0.5"
              name="ieltsScore"
              value={formData.ieltsScore}
              onChange={handleInputChange}
              min="0"
              max="9"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Currency</label>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Currency</option>
              <option value="USD">USD – US Dollar ($)</option>
              <option value="GBP">GBP – British Pound (£)</option>
              <option value="EUR">EUR – Euro (€)</option>
              <option value="AUD">AUD – Australian Dollar (A$)</option>
              <option value="CAD">CAD – Canadian Dollar (C$)</option>
              <option value="NZD">NZD – New Zealand Dollar (NZ$)</option>
              <option value="SGD">SGD – Singapore Dollar (S$)</option>
              <option value="CHF">CHF – Swiss Franc (CHF)</option>
              <option value="INR">INR – Indian Rupee (₹)</option>
              <option value="AED">AED – UAE Dirham (AED)</option>
              <option value="MYR">MYR – Malaysian Ringgit (MYR)</option>
              <option value="JPY">JPY – Japanese Yen (¥)</option>
              <option value="SEK">SEK – Swedish Krona (SEK)</option>
              <option value="DKK">DKK – Danish Krone (DKK)</option>
              <option value="NOK">NOK – Norwegian Krone (NOK)</option>
              <option value="HKD">HKD – Hong Kong Dollar (HK$)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Application Fee</label>
            <input
              type="number"
              step="0.01"
              name="applicationFee"
              value={formData.applicationFee}
              onChange={handleInputChange}
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Yearly Tuition Fees</label>
            <input
              type="number"
              step="0.01"
              name="yearlyTuitionFees"
              value={formData.yearlyTuitionFees}
              onChange={handleInputChange}
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">University Rankings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Webometrics World</label>
              <input
                type="number"
                name="ranking.webometricsWorld"
                value={formData.universityRanking.webometricsWorld}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Webometrics National</label>
              <input
                type="number"
                name="ranking.webometricsNational"
                value={formData.universityRanking.webometricsNational}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">US News</label>
              <input
                type="number"
                name="ranking.usNews"
                value={formData.universityRanking.usNews}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">QS Ranking</label>
              <input
                type="number"
                name="ranking.qs"
                value={formData.universityRanking.qs}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </form>
    </ResponsiveFormModal>
  );
}
