'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import ReferrerOnboardingReviewContent from '@/components/ReferrerOnboardingReviewContent';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminReferrerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const referrerId = params.referrerId as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [referrerStatus, setReferrerStatus] = useState<{
    isActive: boolean;
    isVerified: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authAPI.getProfile();
      const userData = res.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        router.push('/');
        return;
      }
      setUser(userData);
      const dash = await superAdminAPI.getReferrerDashboard(referrerId);
      const u = dash.data.data.referrer.userId;
      setReferrerStatus({ isActive: u.isActive, isVerified: u.isVerified });
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      await superAdminAPI.toggleReferrerStatus(referrerId);
      toast.success('Referrer deactivated');
      setReferrerStatus((s) => (s ? { ...s, isActive: false } : s));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to deactivate referrer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const headerExtra =
    referrerStatus?.isVerified && referrerStatus?.isActive ? (
      <button
        type="button"
        disabled={actionLoading}
        onClick={handleDeactivate}
        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
      >
        Deactivate
      </button>
    ) : null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <ReferrerOnboardingReviewContent
          referrerId={referrerId}
          viewerRole="super-admin"
          backPath={`/super-admin/referrers/${referrerId}`}
          canReviewDocs={false}
          headerExtra={headerExtra}
        />
      </SuperAdminLayout>
    </>
  );
}
