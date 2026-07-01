import type { FormSection } from './b2bOnboardingConfig';
import { fromReferrerFormLocation, isValidReferrerPhone, toReferrerFormLocation } from '@/lib/referrerLocationUtils';

/** Fields stored on User / Referrer models (editable by referrer before admin verification) */
export const REFERRER_IDENTITY_FIELD_KEYS = [
  'middleName',
  'email',
  'primaryMobile',
  'country',
  'state',
  'city',
  'qualification',
  'currentRole',
] as const;

/** Identity fields admin can update on behalf of referrer (includes name) */
export const REFERRER_ADMIN_IDENTITY_FIELD_KEYS = [
  'firstName',
  'middleName',
  'lastName',
  'email',
  'primaryMobile',
  'country',
  'state',
  'city',
  'qualification',
  'currentRole',
] as const;

/** Fields stored in referrer.onboardingProfileData */
export const REFERRER_PROFILE_DATA_KEYS = [
  'fatherHusbandName',
  'dateOfBirth',
  'emergencyContact',
  'address',
  'panIndividual',
  'gstNumber',
  'bankAccountName',
  'accountType',
  'bankAccountNumber',
  'ifscCode',
] as const;

export const REFERRER_FORM_SECTIONS: FormSection[] = [
  {
    id: 'basic_identity',
    title: 'Basic Identity',
    icon: 'user',
    description: '',
    fields: [
      { key: 'firstName', label: 'First Name', type: 'readonly', required: true },
      { key: 'middleName', label: 'Middle Name', type: 'text', maxLength: 100 },
      { key: 'lastName', label: 'Last Name', type: 'readonly', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true, maxLength: 200 },
      {
        key: 'primaryMobile',
        label: 'Mobile Number',
        type: 'tel',
        required: true,
        placeholder: '10-digit mobile number',
        pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s.]?[(]?[0-9]{1,4}[)]?[-\\s.]?[0-9]{1,5}[-\\s.]?[0-9]{1,5}$',
      },
      {
        key: 'fatherHusbandName',
        label: "Father's / Husband's Name",
        type: 'text',
        required: true,
        placeholder: 'Full name',
        maxLength: 200,
      },
      {
        key: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        key: 'emergencyContact',
        label: 'Emergency Contact',
        type: 'tel',
        required: true,
        placeholder: 'Emergency contact number',
        pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s.]?[(]?[0-9]{1,4}[)]?[-\\s.]?[0-9]{1,5}[-\\s.]?[0-9]{1,5}$',
        hint: 'Valid phone number required',
      },
      { key: 'country', label: 'Country', type: 'select', required: true, placeholder: 'Select country' },
      { key: 'state', label: 'State', type: 'select', required: true, placeholder: 'Select state' },
      { key: 'city', label: 'City', type: 'select', required: true, placeholder: 'Select city' },
      { key: 'qualification', label: 'Qualification', type: 'text', required: true, maxLength: 200 },
      { key: 'currentRole', label: 'Current Role', type: 'text', required: true, maxLength: 200 },
      {
        key: 'address',
        label: 'Address',
        type: 'textarea',
        required: true,
        placeholder: 'Complete residential address',
        maxLength: 500,
      },
    ],
  },
  {
    id: 'tax_financial',
    title: 'Tax & Financial Details',
    icon: 'currency',
    description: 'Tax identification numbers and banking details for payment and compliance.',
    fields: [
      {
        key: 'panIndividual',
        label: 'PAN Card (Individual)',
        type: 'text',
        required: true,
        placeholder: 'e.g. ABCDE1234F',
        pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
        hint: '10-character PAN number',
        maxLength: 10,
      },
      {
        key: 'gstNumber',
        label: 'GST Number (if applicable)',
        type: 'text',
        placeholder: 'e.g. 22AAAAA0000A1Z5',
        pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
        hint: '15-character GSTIN (leave blank if not applicable)',
        maxLength: 15,
      },
      {
        key: 'bankAccountName',
        label: 'Bank Account Name',
        type: 'text',
        required: true,
        placeholder: 'As per bank records',
        maxLength: 200,
      },
      {
        key: 'accountType',
        label: 'Account Type',
        type: 'select',
        required: true,
        options: ['Saving', 'Current'],
        placeholder: 'Select account type',
      },
      {
        key: 'bankAccountNumber',
        label: 'Bank Account Number',
        type: 'text',
        required: true,
        placeholder: 'Account number',
        pattern: '^\\d{9,18}$',
        hint: '9-18 digit account number',
        maxLength: 18,
      },
      {
        key: 'ifscCode',
        label: 'IFSC Code',
        type: 'text',
        required: true,
        placeholder: 'e.g. HDFC0001234',
        pattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
        hint: '11-character IFSC code',
        maxLength: 11,
      },
    ],
  },
];

export const REFERRER_FORM_TABS = [
  { id: 'basic_identity', title: 'Basic Identity' },
  { id: 'tax_financial', title: 'Tax & Financial' },
  { id: '__documents__', title: 'Documents' },
];

/** Admin can edit all fields including first/last name */
export function getReferrerFormSectionsForAdmin(): FormSection[] {
  return REFERRER_FORM_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.map((field) =>
      field.key === 'firstName' || field.key === 'lastName'
        ? { ...field, type: 'text' as const }
        : field
    ),
  }));
}

export function validateReferrerSectionFields(
  section: FormSection,
  profileData: Record<string, string>
): string | null {
  for (const field of section.fields) {
    if (field.type === 'readonly') continue;

    const value = profileData[field.key]?.trim() || '';

    if (!field.required) {
      if (value && field.pattern && !new RegExp(field.pattern).test(value)) {
        return `"${field.label}" has invalid format`;
      }
      if (field.key === 'emergencyContact' && value && !isValidReferrerPhone(value)) {
        return `"${field.label}" has invalid format`;
      }
      continue;
    }

    if (!value) {
      return `"${field.label}" is required`;
    }

    if (field.key === 'emergencyContact' && !isValidReferrerPhone(value)) {
      return `"${field.label}" must be a valid phone number`;
    }

    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return `"${field.label}" has invalid format`;
    }
  }
  return null;
}

export function buildReferrerProfileFromApi(
  profile: {
    mobileNumber?: string;
    country?: string;
    state?: string;
    city?: string;
    qualification?: string;
    currentRole?: string;
    email?: string;
    onboardingProfileData?: Record<string, string>;
  },
  user: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
  }
): Record<string, string> {
  const saved = (profile.onboardingProfileData as Record<string, string>) || {};
  return toReferrerFormLocation({
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    email: user.email || profile.email || '',
    primaryMobile: profile.mobileNumber || '',
    country: profile.country || '',
    state: profile.state || '',
    city: profile.city || '',
    qualification: profile.qualification || '',
    currentRole: profile.currentRole || '',
    ...saved,
  });
}

export function buildReferrerSectionSavePayload(
  section: FormSection,
  profileData: Record<string, string>,
  identityFieldKeys: readonly string[]
) {
  const identityKeys = new Set<string>(identityFieldKeys);
  const profileDataKeys = new Set<string>(REFERRER_PROFILE_DATA_KEYS);
  const identityData: Record<string, string> = {};
  const onboardingProfileData: Record<string, string> = {};

  section.fields.forEach((f) => {
    if (profileData[f.key] === undefined) return;
    if (identityKeys.has(f.key)) {
      identityData[f.key] = profileData[f.key];
    } else if (profileDataKeys.has(f.key)) {
      onboardingProfileData[f.key] = profileData[f.key];
    }
  });

  if (identityData.country || identityData.state || identityData.city) {
    const converted = fromReferrerFormLocation(identityData);
    identityData.country = converted.country;
    identityData.state = converted.state;
    identityData.city = converted.city;
  }

  return { identityData, onboardingProfileData };
}
