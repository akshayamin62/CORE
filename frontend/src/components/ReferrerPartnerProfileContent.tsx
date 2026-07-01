'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { referrerOnboardingAPI } from '@/lib/api';
import { User } from '@/types';
import toast from 'react-hot-toast';
import B2BProfileForm from '@/components/B2BProfileForm';
import ReferrerDocumentsPanel from '@/components/ReferrerDocumentsPanel';
import {
  REFERRER_FORM_SECTIONS,
  REFERRER_FORM_TABS,
  REFERRER_PROFILE_DATA_KEYS,
  buildReferrerProfileFromApi,
} from '@/config/referrerOnboardingConfig';
import { applyReferrerFieldChange, isValidReferrerPhone } from '@/lib/referrerLocationUtils';
import { roleListBackBtnClass, roleListPagePadding, roleListSubtitleClass, roleListTitleClass } from '@/components/studentDetailResponsive';

type ProfileData = Record<string, string>;

interface ReferrerPartnerProfileContentProps {
  user: User;
}

const isFieldValueEmpty = (val: string | undefined, fieldType?: string): boolean => {
  if (fieldType === 'checkbox') return val !== 'true' && val !== '1' && val !== 'yes';
  return !val?.trim();
};

export default function ReferrerPartnerProfileContent({ user }: ReferrerPartnerProfileContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [initialProfileData, setInitialProfileData] = useState<ProfileData>({});
  const initialProfileRef = useRef<ProfileData>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      await fetchProfile();
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await referrerOnboardingAPI.getProfile();
      const p = res.data.data.profile;
      const merged = buildReferrerProfileFromApi(p, user);
      setProfileData(merged);
      setInitialProfileData(merged);
      initialProfileRef.current = merged;
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setProfileData((prev) => applyReferrerFieldChange(prev, key, value));
  };

  const handleSaveSection = async (sectionId: string) => {
    const section = REFERRER_FORM_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const sectionData: ProfileData = {};
    const profileDataKeys = new Set<string>(REFERRER_PROFILE_DATA_KEYS);
    for (const field of section.fields) {
      if (!profileDataKeys.has(field.key)) continue;
      const wasEmpty = isFieldValueEmpty(initialProfileRef.current[field.key], field.type);
      if (!wasEmpty) continue;

      const value = profileData[field.key];
      if (value !== undefined) sectionData[field.key] = value;

      if (field.required && isFieldValueEmpty(value, field.type)) {
        toast.error(`"${field.label}" is required`);
        return;
      }
      if (field.key === 'emergencyContact' && value && !isValidReferrerPhone(value)) {
        toast.error(`"${field.label}" must be a valid phone number`);
        return;
      }
      if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
        toast.error(`"${field.label}" has invalid format`);
        return;
      }
    }

    if (Object.keys(sectionData).length === 0) {
      toast.error('No empty fields to save in this section');
      return;
    }

    setSavingSection(sectionId);
    try {
      await referrerOnboardingAPI.updateProfile({ onboardingProfileData: sectionData });
      const nextInitial = { ...initialProfileRef.current, ...sectionData };
      initialProfileRef.current = nextInitial;
      setInitialProfileData(nextInitial);
      toast.success(`${section.title} saved`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save');
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div className={`${roleListPagePadding} flex items-center justify-center py-24`}>
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={roleListPagePadding}>
      <button type="button" onClick={() => router.push('/referrer/dashboard')} className={roleListBackBtnClass}>
        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      <div className="mb-6 sm:mb-8">
        <h1 className={roleListTitleClass}>My Profile</h1>
        <p className={roleListSubtitleClass}>
          View your onboarding details. You can fill empty fields and re-upload rejected documents; filled fields cannot be changed.
        </p>
      </div>

      <div className="space-y-6">
        <B2BProfileForm
          profileData={profileData}
          readonlyData={{
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
          }}
          initialProfileData={initialProfileData}
          b2bDocFields={[]}
          b2bDocuments={[]}
          readOnly
          allowEditEmptyFieldsOnly
          savingSection={savingSection}
          onFieldChange={handleFieldChange}
          onSaveSection={handleSaveSection}
          formSections={REFERRER_FORM_SECTIONS}
          formTabs={REFERRER_FORM_TABS}
          customDocumentsTab={
            <ReferrerDocumentsPanel embedded allowUploadMissingOrRejectedOnly />
          }
        />
      </div>
    </div>
  );
}
