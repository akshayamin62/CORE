'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function ReviewerPaymentButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const u = JSON.parse(userStr);
      if (
        u?.role === 'REVIEWER' ||
        (u?.email || '').toLowerCase().trim() === 'reviewer@admitra.io'
      ) {
        setShow(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => router.push('/make-payment')}
      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0e5080] to-[#0876b8] text-white font-bold rounded-lg hover:shadow-lg transition-shadow mt-6"
    >
      Make Payment (₹1)
      <ArrowRight className="w-5 h-5" />
    </button>
  );
}
