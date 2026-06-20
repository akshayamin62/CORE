'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ComingSoon from '@/components/ComingSoon';
import { roleListPagePadding, roleListBackBtnClass } from '@/components/studentDetailResponsive';

export default function StudentAlumniPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    authAPI.getProfile().then(res => {
      const u = res.data.data.user;
      if (u.role !== USER_ROLE.STUDENT) { router.push('/'); return; }
      setUser(u);
      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  return (
    <div className={roleListPagePadding}>
      <button type="button" onClick={() => router.back()} className={roleListBackBtnClass}>
        <svg className="mr-1.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Return to Dashboard
      </button>
      <ComingSoon title="Alumni" />
    </div>
  );
}
