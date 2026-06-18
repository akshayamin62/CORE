'use client';

import ResponsiveFormModal from '@/components/ResponsiveFormModal';
import { AdminOption } from '@/components/AddReferrerModal';
import CountryStateCitySelect from '@/components/CountryStateCitySelect';
export interface ReferrerEditFormData {
  email: string;
  mobileNumber: string;
  adminId: string;
  country: string;
  state: string;
  city: string;
  qualification: string;
  currentRole: string;
}

interface EditReferrerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formData: ReferrerEditFormData;
  setFormData: React.Dispatch<React.SetStateAction<ReferrerEditFormData>>;
  referrerName: string;
  admins?: AdminOption[];
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 md:py-2 md:text-sm';

export default function EditReferrerModal({
  open,
  onClose,
  onSubmit,
  submitting,
  formData,
  setFormData,
  referrerName,
  admins,
}: EditReferrerModalProps) {
  return (
    <ResponsiveFormModal
      open={open}
      onClose={onClose}
      title="Edit Referrer"
      maxWidth="lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 md:py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-referrer-form"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 md:py-2"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="edit-referrer-form" onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{referrerName || 'N/A'}</p>
          <p className="mt-1 text-xs text-gray-500">Name cannot be changed here</p>
        </div>

        {admins && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Admin <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.adminId}
              onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
              className={inputClass}
            >
              <option value="">-- Select Admin --</option>
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {admin.companyName ||
                    [admin.firstName, admin.middleName, admin.lastName].filter(Boolean).join(' ')}{' '}
                  ({[admin.firstName, admin.middleName, admin.lastName].filter(Boolean).join(' ')})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
              placeholder="Referrer email"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.mobileNumber}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^[+()\-\s.0-9]*$/.test(value)) {
                  setFormData({ ...formData, mobileNumber: value });
                }
              }}
              className={inputClass}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <CountryStateCitySelect
          country={formData.country}
          state={formData.state}
          city={formData.city}
          onChange={({ country, state, city }) =>
            setFormData({ ...formData, country, state, city })
          }
          inputClass={inputClass}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Qualification</label>
            <input
              type="text"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              className={inputClass}
              placeholder="e.g. B.Com, MBA"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Current Role</label>
            <input
              type="text"
              value={formData.currentRole}
              onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
              className={inputClass}
              placeholder="e.g. Teacher, Counselor"
            />
          </div>
        </div>
      </form>
    </ResponsiveFormModal>
  );
}
