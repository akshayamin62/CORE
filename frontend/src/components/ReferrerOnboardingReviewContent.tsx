'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { referrerOnboardingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import B2BProfileForm from '@/components/B2BProfileForm';
import ReferrerDocumentsPanel from '@/components/ReferrerDocumentsPanel';
import {
  REFERRER_ADMIN_IDENTITY_FIELD_KEYS,
  REFERRER_FORM_SECTIONS,
  REFERRER_FORM_TABS,
  buildReferrerProfileFromApi,
  buildReferrerSectionSavePayload,
  getReferrerFormSectionsForAdmin,
  validateReferrerSectionFields,
} from '@/config/referrerOnboardingConfig';
import { applyReferrerFieldChange } from '@/lib/referrerLocationUtils';
import { roleListBackBtnClass, roleListPagePadding, roleListSubtitleClass, roleListTitleClass } from '@/components/studentDetailResponsive';

type ProfileData = Record<string, string>;

interface ReferrerOnboardingReviewContentProps {
  referrerId: string;
  viewerRole: 'admin' | 'super-admin';
  backPath: string;
  canReviewDocs?: boolean;
  headerExtra?: React.ReactNode;
}

export default function ReferrerOnboardingReviewContent({
  referrerId,
  viewerRole,
  backPath,
  canReviewDocs = false,
  headerExtra,
}: ReferrerOnboardingReviewContentProps) {
  const router = useRouter();
  const isAdmin = viewerRole === 'admin';
  const formSections = useMemo(
    () => (isAdmin ? getReferrerFormSectionsForAdmin() : REFERRER_FORM_SECTIONS),
    [isAdmin]
  );

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [referrerUser, setReferrerUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    isActive?: boolean;
    isVerified?: boolean;
  } | null>(null);

  useEffect(() => {
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrerId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res =
        viewerRole === 'admin'
          ? await referrerOnboardingAPI.getProfileForAdmin(referrerId)
          : await referrerOnboardingAPI.getProfileForSuperAdmin(referrerId);
      const p = res.data.data.profile;
      const u = res.data.data.user;
      setReferrerUser(u);
      setProfileData(buildReferrerProfileFromApi(p, u));
    } catch {
      toast.error('Failed to load referrer profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setProfileData((prev) => applyReferrerFieldChange(prev, key, value));
  };

  const handleSaveSection = async (sectionId: string) => {
    if (!isAdmin) return;

    const section = formSections?.find((s) => s.id === sectionId);
    if (!section) return;

    const validationError = validateReferrerSectionFields(section, profileData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const { identityData, onboardingProfileData } = buildReferrerSectionSavePayload(
      section,
      profileData,
      REFERRER_ADMIN_IDENTITY_FIELD_KEYS
    );

    setSavingSection(sectionId);
    try {
      const res = await referrerOnboardingAPI.updateProfileForAdmin(referrerId, {
        identityData,
        onboardingProfileData,
      });
      const u = res.data.data.user;
      if (u) {
        setReferrerUser(u);
        setProfileData((prev) => ({
          ...prev,
          firstName: u.firstName || prev.firstName,
          middleName: u.middleName || '',
          lastName: u.lastName || prev.lastName,
          email: u.email || prev.email,
        }));
      }
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
      <button type="button" onClick={() => router.push(backPath)} className={roleListBackBtnClass}>
        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={roleListTitleClass}>Referrer Onboarding Profile</h1>
          <p className={roleListSubtitleClass}>
            {isAdmin
              ? 'Edit onboarding details and documents on behalf of the referrer.'
              : 'Review onboarding details and documents'}
            {referrerUser?.email ? ` for ${referrerUser.email}` : ''}.
          </p>
          {referrerUser && (
            <p className="mt-2 text-sm text-gray-600">
              Status:{' '}
              <span className="font-medium">
                {!referrerUser.isActive && !referrerUser.isVerified
                  ? 'Pending Activation'
                  : referrerUser.isActive && !referrerUser.isVerified
                  ? 'Onboarding'
                  : referrerUser.isVerified && referrerUser.isActive
                  ? 'Active'
                  : 'Inactive'}
              </span>
            </p>
          )}
        </div>
        {headerExtra}
      </div>

      <div className="space-y-6">
        <B2BProfileForm
          profileData={profileData}
          readonlyData={{
            firstName: referrerUser?.firstName || '',
            lastName: referrerUser?.lastName || '',
            email: referrerUser?.email || '',
          }}
          b2bDocFields={[]}
          b2bDocuments={[]}
          readOnly={!isAdmin}
          savingSection={savingSection}
          onFieldChange={isAdmin ? handleFieldChange : undefined}
          onSaveSection={isAdmin ? handleSaveSection : undefined}
          formSections={formSections}
          formTabs={REFERRER_FORM_TABS}
          customDocumentsTab={
            <ReferrerDocumentsPanel
              embedded
              referrerId={referrerId}
              readOnly={!isAdmin}
              canReview={canReviewDocs}
              canUpload={isAdmin}
            />
          }
        />
      </div>
    </div>
  );
}
