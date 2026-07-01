'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ReferrerLayout from '@/components/ReferrerLayout';
import ReferrerPartnerProfileContent from '@/components/ReferrerPartnerProfileContent';
import toast, { Toaster } from 'react-hot-toast';

export default function ReferrerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        toast.error('Your account is not activated yet.');
        router.push('/login');
        return;
      }
      if (!userData.isVerified) {
        router.replace('/referrer/onboarding');
        return;
      }
      setUser(userData);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <ReferrerLayout user={user}>
        <ReferrerPartnerProfileContent user={user} />
      </ReferrerLayout>
    </>
  );
}
