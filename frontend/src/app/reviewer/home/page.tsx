'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { paymentAPI } from '@/lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const REVIEWER_EMAIL = 'reviewer@admitra.io';

export default function ReviewerHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reviewerName, setReviewerName] = useState('Reviewer');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if ((user?.email || '').toLowerCase().trim() !== REVIEWER_EMAIL) {
        router.replace('/dashboard');
        return;
      }
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      setReviewerName(fullName || 'Reviewer');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const handleMakePayment = async () => {
    setLoading(true);
    try {
      const orderRes = await paymentAPI.createReviewerOrder();
      const orderData = orderRes.data?.data;
      if (!orderData?.orderId) {
        toast.error('Failed to initialize payment order');
        return;
      }

      if (!window.Razorpay) {
        toast.error('Payment gateway is loading. Please try again.');
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'ADMITra',
        description: 'Reviewer Payment - ₹1',
        order_id: orderData.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await paymentAPI.verifyReviewerPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data?.success) {
              toast.success('Payment successful!');
            } else {
              toast.error('Payment verification failed');
            }
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: { email: REVIEWER_EMAIL, name: reviewerName },
        theme: { color: '#2959ba' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to start payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviewer Home</h1>
          <p className="text-gray-600 mb-8">Welcome, {reviewerName}</p>

          <button
            onClick={handleMakePayment}
            disabled={loading}
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : 'Make Payment (₹1)'}
          </button>
        </div>
      </div>
    </div>
  );
}
