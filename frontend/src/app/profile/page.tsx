'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, formAnswerAPI } from '@/lib/api';
import { User } from '@/types';
import { SectionConfig } from '@/config/formConfig';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import AuthImage from '@/components/AuthImage';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Student profile form state
  const [formSections, setFormSections] = useState<SectionConfig[]>([]);
  const [formValues, setFormValues] = useState<any>({});
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      setUser(userData);

      // If student, also fetch profile form data
      if (userData?.role === 'STUDENT') {
        await fetchStudentProfileData();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch profile';
      toast.error(message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfileData = async () => {
    try {
      const res = await formAnswerAPI.getStudentProfile();
      const { formStructure, answers } = res.data.data;
      setFormSections(formStructure || []);

      // Initialize form values from saved answers
      const values: any = {};
      formStructure?.forEach((section: SectionConfig) => {
        if (!values[section.key]) values[section.key] = {};
        const sectionAnswers = answers?.[section.key] || {};
        section.subSections?.forEach((sub: any) => {
          if (sectionAnswers[sub.key]) {
            values[section.key][sub.key] = sectionAnswers[sub.key];
          } else {
            values[section.key][sub.key] = [{}];
          }
        });
      });
      setFormValues(values);
    } catch (error: any) {
      console.error('Failed to fetch student profile data:', error);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    setUploadingPic(true);
    try {
      const res = await authAPI.uploadProfilePicture(file);
      const newPic = res.data.data.profilePicture;
      setUser((prev) => prev ? { ...prev, profilePicture: newPic } : prev);
      // Sync localStorage for Navbar
      const stored = localStorage.getItem('user');
      if (stored) {
        try { const u = JSON.parse(stored); u.profilePicture = newPic; localStorage.setItem('user', JSON.stringify(u)); } catch {}
      }
      toast.success('Profile picture updated');
    } catch {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveProfilePic = async () => {
    setUploadingPic(true);
    try {
      await authAPI.removeProfilePicture();
      setUser((prev) => prev ? { ...prev, profilePicture: undefined } : prev);
      // Sync localStorage for Navbar
      const stored = localStorage.getItem('user');
      if (stored) {
        try { const u = JSON.parse(stored); delete u.profilePicture; localStorage.setItem('user', JSON.stringify(u)); } catch {}
      }
      toast.success('Profile picture removed');
    } catch {
      toast.error('Failed to remove profile picture');
    } finally {
      setUploadingPic(false);
    }
  };



  const handleFieldChange = (
    sectionId: string,
    subSectionId: string,
    index: number,
    key: string,
    value: any
  ) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[sectionId]) newValues[sectionId] = {};
      if (!newValues[sectionId][subSectionId]) newValues[sectionId][subSectionId] = [{}];
      if (!newValues[sectionId][subSectionId][index]) newValues[sectionId][subSectionId][index] = {};
      newValues[sectionId][subSectionId][index][key] = value;
      return newValues;
    });
  };

  const handleAddInstance = (sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[sectionId]) newValues[sectionId] = {};
      if (!newValues[sectionId][subSectionId]) newValues[sectionId][subSectionId] = [];
      newValues[sectionId][subSectionId].push({});
      return newValues;
    });
  };

  const handleRemoveInstance = (sectionId: string, subSectionId: string, index: number) => {
    setFormValues((prev: any) => {
      const newValues = JSON.parse(JSON.stringify(prev));
      if (newValues[sectionId]?.[subSectionId]) {
        newValues[sectionId][subSectionId] = newValues[sectionId][subSectionId].filter(
          (_: any, i: number) => i !== index
        );
      }
      return newValues;
    });
  };

  const validateSection = (sectionKey: string): boolean => {
    const section = formSections[selectedSectionIndex];
    if (!section) return true;
    const sectionValues = formValues[sectionKey] || {};

    const newErrors: any = {};
    let hasErrors = false;

    section.subSections?.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection.key] || [{}];

      subSectionValues.forEach((instanceValues: any, index: number) => {
        // Filter fields based on conditional visibility (education board logic)
        const visibleFields = subSection.fields.filter((f) => {
          const eduLevel = instanceValues?.educationLevel;
          const board = instanceValues?.board;
          if (f.key === 'board' || f.key === 'boardFullName') {
            if (eduLevel !== 'secondary_school' && eduLevel !== 'higher_secondary_school') return false;
          }
          if (f.key === 'boardFullName') {
            if (board !== 'State Board' && board !== 'Other') return false;
          }
          if (f.key === 'fieldOfStudy' && eduLevel === 'secondary_school') return false;
          return true;
        });
        visibleFields.forEach((field) => {
          if (field.required) {
            let value = instanceValues?.[field.key];

            if ((!value || (typeof value === 'string' && value.trim() === '')) && field.defaultValue) {
              value = field.defaultValue;
              setFormValues((prev: any) => {
                const newValues = JSON.parse(JSON.stringify(prev));
                if (newValues[sectionKey]?.[subSection.key]?.[index]) {
                  newValues[sectionKey][subSection.key][index][field.key] = field.defaultValue;
                }
                return newValues;
              });
            }

            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection.key]) newErrors[subSection.key] = [];
              if (!newErrors[subSection.key][index]) newErrors[subSection.key][index] = {};
              newErrors[subSection.key][index][field.key] = `${field.label} is required`;
              hasErrors = true;
            }
          }
        });
      });
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSaveSection = async (sectionId: string) => {
    if (!validateSection(sectionId)) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSaving(true);
      const sectionAnswers = formValues[sectionId] || {};
      await formAnswerAPI.saveStudentProfile({ [sectionId]: sectionAnswers });
      toast.success('Saved successfully!');
      setErrors({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      student: 'from-blue-500 to-cyan-500',
      OPS: 'from-green-500 to-emerald-500',
      alumni: 'from-purple-500 to-pink-500',
      service_provider: 'from-orange-500 to-red-500',
      admin: 'from-gray-700 to-gray-900',
    };
    return colors[role.toLowerCase() as keyof typeof colors] || colors.student;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center animate-scale-in">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Student profile view with form sections
  if (user?.role === 'STUDENT' && formSections.length > 0) {
    const currentSection = formSections[selectedSectionIndex];

    const isParentalSection = currentSection?.title === 'Parental Details';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <Toaster position="top-right" />

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-4 pb-24 sm:px-6 sm:py-8 lg:px-8">
          {/* Header */}
          <div className="mb-5 animate-fade-in sm:mb-8">
            <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-4xl md:text-5xl">My Profile</h1>
            <p className="text-sm text-gray-600 sm:text-lg">View and manage your profile information</p>
          </div>

          {/* Profile Card Header */}
          <div className="mb-6 animate-fade-in rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="rounded-t-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  {user?.profilePicture ? (
                    <AuthImage path={user.profilePicture} alt="Profile" className="h-16 w-16 rounded-2xl object-cover shadow-xl sm:h-20 sm:w-20" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white shadow-xl sm:h-20 sm:w-20">
                      {getInitials(user)}
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
                  {uploadingPic && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60"><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}
                </div>
                <div className="min-w-0 text-center sm:ml-2 sm:text-left">
                  <h2 className="mb-1 truncate text-xl font-bold text-white sm:text-2xl">{getFullName(user)}</h2>
                  <p className="truncate text-sm text-blue-100 sm:text-base">{user?.email}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPic} className="px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                      {user?.profilePicture ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {user?.profilePicture && (
                      <button onClick={handleRemoveProfilePic} disabled={uploadingPic} className="px-3 py-1 text-xs font-medium bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap">
            {formSections.map((section, idx) => (
              <button
                key={section.key}
                onClick={() => setSelectedSectionIndex(idx)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                  idx === selectedSectionIndex
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          {/* Form Section */}
          {currentSection && (
            <div className="animate-fade-in">
              <FormSectionRenderer
                section={currentSection}
                values={formValues[currentSection.key] || {}}
                onChange={isParentalSection ? () => {} : (subSectionId, index, key, value) =>
                  handleFieldChange(currentSection.key, subSectionId, index, key, value)
                }
                onAddInstance={isParentalSection ? () => {} : (subSectionId) =>
                  handleAddInstance(currentSection.key, subSectionId)
                }
                onRemoveInstance={isParentalSection ? () => {} : (subSectionId, index) =>
                  handleRemoveInstance(currentSection.key, subSectionId, index)
                }
                errors={errors}
                readOnly={isParentalSection}
                readOnlyKeys={['firstName', 'middleName', 'lastName']}
                noDelete={isParentalSection}
              />
              {isParentalSection && (
                <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  Parental details can only be edited by Super Admin
                </div>
              )}
              {!isParentalSection && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveSection(currentSection.key)}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative mx-auto max-w-4xl px-4 py-4 pb-24 sm:px-6 sm:py-8 lg:px-8">
        <div>
          {/* Header */}
          <div className="mb-5 animate-fade-in sm:mb-8">
            <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
              My Profile
            </h1>
            <p className="text-sm text-gray-600 sm:text-lg">
              View and manage your account information
            </p>
          </div>

          {/* Profile Card */}
          <div className="animate-fade-in rounded-2xl border border-gray-100 bg-white shadow-xl">
            {/* Profile Header */}
            <div className="rounded-t-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-4 sm:p-8">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  {user?.profilePicture ? (
                    <AuthImage path={user.profilePicture} alt="Profile" className="h-16 w-16 rounded-2xl object-cover shadow-xl sm:h-20 sm:w-20" />
                  ) : (
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-xl sm:h-20 sm:w-20 ${user?.role ? `bg-gradient-to-br ${getRoleBadgeColor(user.role)}` : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                      {getInitials(user)}
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
                  {uploadingPic && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60"><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}
                </div>
                <div className="min-w-0 text-center sm:ml-6 sm:text-left">
                  <h2 className="mb-1 truncate text-xl font-bold text-white sm:text-3xl">{getFullName(user)}</h2>
                  <p className="truncate text-sm text-blue-100 sm:text-lg">{user?.email}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPic} className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                      {user?.profilePicture ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {user?.profilePicture && (
                      <button onClick={handleRemoveProfilePic} disabled={uploadingPic} className="px-3 py-1.5 text-xs font-medium bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                {/* Full Name */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Full Name</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-900 font-medium">{getFullName(user)}</span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Email Address</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium">{user?.email}</span>
                  </div>
                </div>

                {/* Account Role */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Account Role</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Account Status */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Account Status</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'} mr-3 animate-pulse`}></div>
                    <span className={`font-semibold ${user?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Verification Status</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <div className={`w-3 h-3 rounded-full ${user?.isVerified ? 'bg-green-500' : 'bg-yellow-500'} mr-3 animate-pulse`}></div>
                    <span className={`font-semibold ${user?.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {user?.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="group">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Member Since</label>
                  <div className="flex items-center rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 transition-shadow group-hover:shadow-md sm:p-4">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Notice */}
            {!user?.isVerified && (
              <div className="mx-4 mb-4 rounded-xl border-l-4 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 sm:mx-8 sm:mb-8 sm:p-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start">
                  <div className="shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 sm:h-12 sm:w-12">
                      <svg className="h-6 w-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 sm:ml-4">
                    <h3 className="mb-1 text-base font-bold text-yellow-900 sm:mb-2 sm:text-lg">Account Verification Required</h3>
                    <p className="text-sm leading-relaxed text-yellow-800 sm:text-base">
                      Your account is pending additional verification. You will be notified via email once approved. 
                      This helps us maintain a secure and trusted community.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


