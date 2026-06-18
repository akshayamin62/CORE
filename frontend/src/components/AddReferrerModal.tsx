'use client';

import ResponsiveFormModal from '@/components/ResponsiveFormModal';

export interface ReferrerFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  adminId: string;
  country: string;
  state: string;
  city: string;
  qualification: string;
  currentRole: string;
}

export interface AdminOption {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
}

interface AddReferrerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formData: ReferrerFormData;
  setFormData: React.Dispatch<React.SetStateAction<ReferrerFormData>>;
  admins?: AdminOption[];
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 md:py-2 md:text-sm';

export default function AddReferrerModal({
  open,
  onClose,
  onSubmit,
  submitting,
  formData,
  setFormData,
  admins,
}: AddReferrerModalProps) {
  return (
    <ResponsiveFormModal
      open={open}
      onClose={onClose}
      title="Add New Referrer"
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
            form="add-referrer-form"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 md:py-2"
          >
            {submitting ? 'Creating...' : 'Create Referrer'}
          </button>
        </div>
      }
    >
      <form id="add-referrer-form" onSubmit={onSubmit} className="space-y-4">
        {admins && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select Admin <span className="text-red-500">*</span>
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
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={inputClass}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Middle Name</label>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={inputClass}
              placeholder="Enter last name"
            />
          </div>
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
              placeholder="Enter referrer email"
            />
          </div>
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
            placeholder="+1234567890 or (123) 456-7890"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className={inputClass}
              placeholder="Country"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className={inputClass}
              placeholder="State"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={inputClass}
              placeholder="City"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Qualification <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              className={inputClass}
              placeholder="e.g. B.Com, MBA"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Current Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
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
