'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import ReferrerOnboardingReviewContent from '@/components/ReferrerOnboardingReviewContent';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminReferrerProfilePage() {
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
      if (userData.role !== USER_ROLE.ADMIN) {
        router.push('/');
        return;
      }
      setUser(userData);
      const dash = await adminAPI.getReferrerDashboard(referrerId);
      const u = dash.data.data.referrer.userId;
      setReferrerStatus({ isActive: u.isActive, isVerified: u.isVerified });
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await adminAPI.toggleReferrerStatus(referrerId);
      toast.success('Referrer activated');
      setReferrerStatus((s) => (s ? { ...s, isActive: true } : s));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to activate referrer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      await adminAPI.toggleReferrerStatus(referrerId);
      toast.success('Referrer deactivated');
      setReferrerStatus((s) => (s ? { ...s, isActive: false } : s));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to deactivate referrer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await adminAPI.verifyReferrer(referrerId);
      toast.success('Referrer verified successfully');
      setReferrerStatus({ isActive: true, isVerified: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to verify referrer');
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

  const headerExtra = referrerStatus ? (
    <div className="flex flex-wrap gap-2">
      {!referrerStatus.isActive && !referrerStatus.isVerified && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={handleActivate}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Activate
        </button>
      )}
      {referrerStatus.isActive && !referrerStatus.isVerified && (
        <>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleVerify}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Verify
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleDeactivate}
            className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Deactivate
          </button>
        </>
      )}
      {referrerStatus.isVerified && referrerStatus.isActive && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={handleDeactivate}
          className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
        >
          Deactivate
        </button>
      )}
      {referrerStatus.isVerified && !referrerStatus.isActive && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={handleActivate}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Activate
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <ReferrerOnboardingReviewContent
          referrerId={referrerId}
          viewerRole="admin"
          backPath={`/admin/referrers/${referrerId}`}
          canReviewDocs
          headerExtra={headerExtra}
        />
      </AdminLayout>
    </>
  );
}
