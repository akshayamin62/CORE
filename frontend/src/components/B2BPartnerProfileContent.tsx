'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingAPI } from '@/lib/api';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { User, USER_ROLE, B2BDocumentField, B2BLeadDocument } from '@/types';
import toast from 'react-hot-toast';
import { B2B_FORM_SECTIONS } from '@/config/b2bOnboardingConfig';
import B2BProfileForm from '@/components/B2BProfileForm';
import { roleListBackBtnClass, roleListPagePadding, roleListSubtitleClass, roleListTitleClass } from '@/components/studentDetailResponsive';

type ProfileData = Record<string, string>;

interface B2BPartnerProfileContentProps {
  user: User;
}

const isFieldValueEmpty = (val: string | undefined, fieldType?: string): boolean => {
  if (fieldType === 'checkbox') return val !== 'true' && val !== '1' && val !== 'yes';
  return !val?.trim();
};

export default function B2BPartnerProfileContent({ user }: B2BPartnerProfileContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [initialProfileData, setInitialProfileData] = useState<ProfileData>({});
  const initialProfileRef = useRef<ProfileData>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [b2bDocFields, setB2BDocFields] = useState<B2BDocumentField[]>([]);
  const [b2bDocuments, setB2BDocuments] = useState<B2BLeadDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const dashboardPath = user.role === USER_ROLE.ADMIN ? '/admin/dashboard' : '/advisor/dashboard';

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfile(), fetchAndSeedDocs()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await onboardingAPI.getProfile();
      const p = res.data.data.profile;
      const saved = (p as { b2bProfileData?: ProfileData }).b2bProfileData || {};
      const merged = { companyName: p.companyName || '', primaryMobile: p.mobileNumber || '', ...saved };
      setProfileData(merged);
      setInitialProfileData(merged);
      initialProfileRef.current = merged;
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const fetchAndSeedDocs = async () => {
    setLoadingDocs(true);
    try {
      const [fr, dr] = await Promise.all([b2bLeadDocumentAPI.getMyFields(), b2bLeadDocumentAPI.getMyDocuments()]);
      setB2BDocFields(fr.data.data.fields || []);
      setB2BDocuments(dr.data.data.documents || []);
    } catch {
      /* silent */
    } finally {
      setLoadingDocs(false);
    }
  };

  const readonlyData = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
  };

  const handleFieldChange = (key: string, value: string) => {
    setProfileData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'country') {
        next.state = '';
        next.city = '';
      }
      if (key === 'state') {
        next.city = '';
      }
      if (key === 'companyCountry') {
        next.companyState = '';
        next.companyCity = '';
      }
      if (key === 'companyState') {
        next.companyCity = '';
      }
      return next;
    });
  };

  const handleSaveSection = async (sectionId: string) => {
    const section = B2B_FORM_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const sectionData: ProfileData = {};
    for (const field of section.fields) {
      if (field.type === 'readonly') continue;
      if (field.conditionalOn && profileData[field.conditionalOn] !== field.conditionalValue) continue;

      const wasEmpty = isFieldValueEmpty(initialProfileRef.current[field.key], field.type);
      if (!wasEmpty) continue;

      const value = profileData[field.key];
      if (value !== undefined) sectionData[field.key] = value;

      if (field.required && isFieldValueEmpty(value, field.type)) {
        toast.error(`"${field.label}" is required`);
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
      await onboardingAPI.updateProfile({ b2bProfileData: sectionData });
      const nextProfile = { ...profileData };
      const nextInitial = { ...initialProfileRef.current };
      Object.entries(sectionData).forEach(([key, value]) => {
        if (!isFieldValueEmpty(value, section.fields.find((f) => f.key === key)?.type)) {
          nextInitial[key] = value;
        }
      });
      initialProfileRef.current = nextInitial;
      setInitialProfileData(nextInitial);
      setProfileData(nextProfile);
      toast.success(`${section.title} saved`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save');
    } finally {
      setSavingSection(null);
    }
  };

  const handleUploadDoc = async (field: B2BDocumentField, file: File) => {
    setUploadingDocId(field._id);
    try {
      await b2bLeadDocumentAPI.uploadDocument(null, field._id, field.documentKey, field.documentName, file);
      toast.success(`${field.documentName} uploaded`);
      const [fr, dr] = await Promise.all([b2bLeadDocumentAPI.getMyFields(), b2bLeadDocumentAPI.getMyDocuments()]);
      setB2BDocFields(fr.data.data.fields || []);
      setB2BDocuments(dr.data.data.documents || []);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Upload failed');
    } finally {
      setUploadingDocId(null);
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
      <button
        type="button"
        onClick={() => router.push(dashboardPath)}
        className={roleListBackBtnClass}
      >
        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      <div className="mb-6 sm:mb-8">
        <h1 className={roleListTitleClass}>Company Profile</h1>
        <p className={roleListSubtitleClass}>
          View your onboarding details. You can fill empty fields and upload missing documents; filled fields cannot be changed.
        </p>
      </div>

      <B2BProfileForm
        profileData={profileData}
        readonlyData={readonlyData}
        initialProfileData={initialProfileData}
        b2bDocFields={b2bDocFields}
        b2bDocuments={b2bDocuments}
        loadingDocs={loadingDocs}
        readOnly
        allowEditEmptyFieldsOnly
        allowUploadMissingDocsOnly
        savingSection={savingSection}
        onFieldChange={handleFieldChange}
        onSaveSection={handleSaveSection}
        uploadingDocId={uploadingDocId}
        onUploadDoc={handleUploadDoc}
      />
    </div>
  );
}
