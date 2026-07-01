'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import B2BPartnerProfileContent from '@/components/B2BPartnerProfileContent';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getProfile();
        const userData = response.data.data.user;
        if (userData.role !== USER_ROLE.ADMIN) {
          toast.error('Access denied. Admin only.');
          router.push('/');
          return;
        }
        if (!userData.isVerified) {
          router.replace('/admin/onboarding');
          return;
        }
        setUser(userData);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout user={user}>
      <Toaster position="top-right" />
      <B2BPartnerProfileContent user={user} />
    </AdminLayout>
  );
}
