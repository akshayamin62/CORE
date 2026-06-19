'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import OpsLayout from '@/components/OpsLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import {
  studentPagePadding,
  studentCardClass,
  studentTitleClass,
  studentBadgeRowClass,
  studentAvatarClass,
  studentAvatarFallbackClass,
  parentMetaGridClass,
  parentMetaItemClass,
  parentMetaLabelClass,
  parentMetaValueClass,
  parentLinkedSectionClass,
  parentLinkedStudentRowClass,
  parentLinkedStudentBtnClass,
} from '@/components/studentDetailResponsive';

interface ParentDetail {
  _id: string;
  userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string; isActive: boolean; isVerified?: boolean; createdAt: string };
  studentIds: { _id: string; userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string } }[];
  email: string;
  relationship: string;
  mobileNumber: string;
  qualification: string;
  occupation: string;
  createdAt: string;
}

export default function OpsParentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const parentId = params.parentId as string;
  const [user, setUser] = useState<User | null>(null);
  const [parent, setParent] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    authAPI.getProfile().then(res => {
      const u = res.data.data.user;
      if (u.role !== USER_ROLE.OPS) { router.push('/login'); return; }
      setUser(u);
      fetchParent();
    }).catch(() => router.push('/login'));
  }, [router, parentId]);

  const fetchParent = async () => {
    try {
      const response = await parentAPI.getParentDetail(parentId);
      setParent(response.data.data.parent);
    } catch { toast.error('Failed to fetch parent details'); } finally { setLoading(false); }
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  if (!parent) return (
    <OpsLayout user={user}>
      <div className={studentPagePadding}>
        <p className="text-gray-600 mb-4">Parent not found.</p>
        <button type="button" onClick={() => router.back()} className="text-blue-600 hover:underline">Go Back</button>
      </div>
    </OpsLayout>
  );

  const metaFields = [
    { label: 'Relationship', value: parent.relationship || '-' },
    { label: 'Mobile', value: parent.mobileNumber || '-' },
    { label: 'Email', value: parent.email || parent.userId.email },
    { label: 'Qualification', value: parent.qualification || '-' },
    { label: 'Occupation', value: parent.occupation || '-' },
    { label: 'Joined', value: new Date(parent.userId.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <OpsLayout user={user}>
        <div className={studentPagePadding}>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900 sm:mb-6"
          >
            <svg className="mr-1.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Parents
          </button>

          <div className={studentCardClass}>
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:gap-4">
              <AuthImage
                path={parent.userId.profilePicture}
                alt={getFullName(parent.userId)}
                className={studentAvatarClass}
                fallback={
                  <div className={studentAvatarFallbackClass}>
                    <span className="text-lg font-bold text-purple-600 sm:text-xl">{getInitials(parent.userId)}</span>
                  </div>
                }
              />
              <div className="min-w-0">
                <h1 className={studentTitleClass}>{getFullName(parent.userId)}</h1>
                <p className="truncate text-sm text-gray-600">{parent.userId.email}</p>
                <div className={studentBadgeRowClass + ' mt-1.5'}>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${parent.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {parent.userId.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className={parentMetaGridClass}>
              {metaFields.map((field) => (
                <div key={field.label} className={parentMetaItemClass}>
                  <p className={parentMetaLabelClass}>{field.label}</p>
                  <p className={parentMetaValueClass}>{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={parentLinkedSectionClass}>
            <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
              Linked Students ({parent.studentIds.length})
            </h2>
            {parent.studentIds.length > 0 ? (
              <div>
                {parent.studentIds.map((s) => (
                  <div key={s._id} className={parentLinkedStudentRowClass}>
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <AuthImage
                        path={s.userId?.profilePicture}
                        alt={getFullName(s.userId)}
                        className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                        fallback={
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:h-10 sm:w-10">
                            <span className="text-xs font-semibold text-blue-600 sm:text-sm">{getInitials(s.userId)}</span>
                          </div>
                        }
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{getFullName(s.userId)}</p>
                        <p className="truncate text-xs text-gray-500 sm:text-sm">{s.userId.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/ops/students/${s._id}`)}
                      className={parentLinkedStudentBtnClass}
                    >
                      View Detail
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No students linked.</p>
            )}
          </div>
        </div>
      </OpsLayout>
    </>
  );
}
