'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import SuperAdminRoleDetailFrame, { DetailPageHeader } from '@/components/SuperAdminRoleDetailFrame';
import MobileRecordActionsMenu from '@/components/MobileRecordActionsMenu';

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

export default function SuperAdminParentDetailPage() {
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
      if (u.role !== USER_ROLE.SUPER_ADMIN) { router.push('/login'); return; }
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
    <SuperAdminLayout user={user}>
      <SuperAdminRoleDetailFrame backLabel="Back to Parents" onBack={() => router.back()}>
        <p className="mb-4 text-gray-600">Parent not found.</p>
      </SuperAdminRoleDetailFrame>
    </SuperAdminLayout>
  );

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <SuperAdminRoleDetailFrame backLabel="Back to Parents" onBack={() => router.push('/super-admin/roles/parent')}>
          <DetailPageHeader
            avatar={
              <AuthImage
                path={parent.userId.profilePicture}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                fallback={
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100 sm:h-16 sm:w-16">
                    <span className="text-lg font-bold text-purple-600 sm:text-xl">{getInitials(parent.userId)}</span>
                  </div>
                }
              />
            }
            title={getFullName(parent.userId)}
            subtitle={
              <>
                <span>{parent.userId.email}</span>
                <span className={`ml-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${parent.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {parent.userId.isActive ? 'Active' : 'Inactive'}
                </span>
              </>
            }
          />

          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Relationship</p><p className="font-medium text-gray-900">{parent.relationship || '-'}</p></div>
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Mobile</p><p className="font-medium text-gray-900">{parent.mobileNumber || '-'}</p></div>
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Email</p><p className="break-all font-medium text-gray-900">{parent.email || parent.userId.email}</p></div>
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Qualification</p><p className="font-medium text-gray-900">{parent.qualification || '-'}</p></div>
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Occupation</p><p className="font-medium text-gray-900">{parent.occupation || '-'}</p></div>
              <div><p className="mb-0.5 text-xs text-gray-500 sm:text-sm">Joined</p><p className="font-medium text-gray-900">{new Date(parent.userId.createdAt).toLocaleDateString('en-GB')}</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Linked Students ({parent.studentIds.length})</h2>
            {parent.studentIds.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {parent.studentIds.map((s) => (
                  <div key={s._id} className="flex items-center justify-between gap-2 py-3">
                    <div className="flex min-w-0 items-center">
                      <AuthImage
                        path={s.userId?.profilePicture}
                        alt={getFullName(s.userId)}
                        className="mr-3 h-10 w-10 shrink-0 rounded-full object-cover"
                        fallback={
                          <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <span className="text-sm font-semibold text-blue-600">{getInitials(s.userId)}</span>
                          </div>
                        }
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{getFullName(s.userId)}</p>
                        <p className="truncate text-sm text-gray-500">{s.userId.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 md:hidden">
                      <MobileRecordActionsMenu
                        items={[{ label: 'View Detail', onClick: () => router.push(`/super-admin/roles/student/${s._id}`) }]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/super-admin/roles/student/${s._id}`)}
                      className="hidden shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 md:inline-flex"
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
        </SuperAdminRoleDetailFrame>
      </SuperAdminLayout>
    </>
  );
}
