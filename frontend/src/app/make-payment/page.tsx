'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { paymentAPI } from '@/lib/api';
import { User } from '@/types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MakePaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);

      if (userData.role !== 'REVIEWER') {
        toast.error('Only reviewers can access this page');
        router.push('/');
        return;
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error('Payment gateway is not loaded. Please refresh the page.');
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const orderResponse = await paymentAPI.createReviewerOrder();
      const { orderId, amount, currency } = orderResponse.data.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        order_id: orderId,
        name: 'CORE',
        description: 'Payment for reviewer service',
        prefill: {
          email: user?.email,
          name: `${user?.firstName} ${user?.lastName}`,
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await paymentAPI.verifyReviewerPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.data.success) {
              toast.success('Payment successful!');
              setTimeout(() => {
                router.push('/');
              }, 1500);
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          }
        },
        theme: {
          color: '#0876b8',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create payment order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0e5080] mb-2">Make Payment</h1>
          <p className="text-slate-600">Complete your payment to proceed</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-700 font-medium">Amount to Pay:</span>
            <span className="text-2xl font-bold text-[#0876b8]">₹1.00</span>
          </div>
          <div className="text-sm text-slate-500">
            <p className="mb-2">
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </p>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-gradient-to-r from-[#0e5080] to-[#0876b8] text-white font-bold py-3 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Proceed to Payment'}
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-4 text-slate-600 border border-slate-300 font-medium py-3 rounded-lg hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
