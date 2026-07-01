'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, referrerOnboardingAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { REFERRER_FORM_SECTIONS, REFERRER_FORM_TABS, REFERRER_IDENTITY_FIELD_KEYS, buildReferrerProfileFromApi, buildReferrerSectionSavePayload, validateReferrerSectionFields } from '@/config/referrerOnboardingConfig';
import { applyReferrerFieldChange } from '@/lib/referrerLocationUtils';
import B2BProfileForm from '@/components/B2BProfileForm';
import ReferrerDocumentsPanel from '@/components/ReferrerDocumentsPanel';

type ProfileData = Record<string, string>;

export default function ReferrerOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authAPI.getProfile();
      const userData = res.data.data.user;
      if (userData.role !== USER_ROLE.REFERRER) {
        router.push('/');
        return;
      }
      if (!userData.isActive) {
        toast.error('Your account is not activated yet. Please contact your admin.');
        router.push('/login');
        return;
      }
      if (userData.isVerified) {
        router.replace('/referrer/dashboard');
        return;
      }
      setUser(userData);
      await fetchProfile(userData);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userData: User) => {
    try {
      const res = await referrerOnboardingAPI.getProfile();
      const p = res.data.data.profile;
      setProfileData(buildReferrerProfileFromApi(p, userData));
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

    const validationError = validateReferrerSectionFields(section, profileData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const { identityData, onboardingProfileData } = buildReferrerSectionSavePayload(
      section,
      profileData,
      REFERRER_IDENTITY_FIELD_KEYS
    );

    setSavingSection(sectionId);
    try {
      await referrerOnboardingAPI.updateProfile({ identityData, onboardingProfileData });
      toast.success(`${section.title} saved`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save');
    } finally {
      setSavingSection(null);
    }
  };

  const totalRequired = REFERRER_FORM_SECTIONS.reduce(
    (sum, s) => sum + s.fields.filter((f) => f.required).length,
    0
  );
  const totalFilled = REFERRER_FORM_SECTIONS.reduce(
    (sum, s) => sum + s.fields.filter((f) => f.required && profileData[f.key]?.trim()).length,
    0
  );
  const overallPct = totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Referrer Onboarding</h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete your profile for admin verification</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-700">{overallPct}% Complete</div>
              <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                router.push('/login');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <B2BProfileForm
          profileData={profileData}
          readonlyData={{
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
          }}
          b2bDocFields={[]}
          b2bDocuments={[]}
          readOnly={false}
          savingSection={savingSection}
          onFieldChange={handleFieldChange}
          onSaveSection={handleSaveSection}
          formSections={REFERRER_FORM_SECTIONS}
          formTabs={REFERRER_FORM_TABS}
          customDocumentsTab={<ReferrerDocumentsPanel embedded />}
        />
      </div>
    </div>
  );
}
