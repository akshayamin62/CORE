'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect page - this page is deprecated, use /admin/dashboard instead
export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new admin dashboard
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

