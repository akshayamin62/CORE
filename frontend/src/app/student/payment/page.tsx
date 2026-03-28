'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
// import StudyAbroadLayout from '@/components/layouts/StudyAbroadLayout';
import toast, { Toaster } from 'react-hot-toast';

interface Registration {
  _id: string;
  serviceId: { _id: string; name: string; slug: string } | string;
  planTier?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  status?: string;
  createdAt?: string;
}

interface UserInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  profilePicture?: string;
  role?: string;
}

const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'study-abroad': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'education-planning': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'coaching-classes': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

function getStatusStyle(status?: string) {
  if (!status) return { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' };
  return PAYMENT_STATUS_STYLES[status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
}

export default function StudentPaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authAPI.getProfile();
        const userData = res.data.data.user;
        if (userData.role !== USER_ROLE.STUDENT) {
          router.push('/dashboard');
          return;
        }
        setUser(userData);

        try {
          const regRes = await serviceAPI.getMyServices();
          setRegistrations(regRes.data.data.registrations || []);
        } catch {
          // silent
        }
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Payment</h2>
            <p className="mt-1 text-gray-500 text-lg">View payment information for your registered services.</p>
          </div>

          {registrations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No registrations found</p>
              <p className="text-gray-400 text-sm mt-1">Register for a service to see payment details here.</p>
              <button
                onClick={() => router.push('/student/service-plans')}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Browse Services
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map((reg) => {
                const svc = typeof reg.serviceId === 'object' ? reg.serviceId : null;
                const slug = svc?.slug || '';
                const serviceName = svc?.name || 'Service';
                const colors = SERVICE_COLORS[slug] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                const statusStyle = getStatusStyle(reg.paymentStatus);

                return (
                  <div key={reg._id} className={`bg-white rounded-2xl border ${colors.border} overflow-hidden shadow-sm`}>
                    {/* Service Header */}
                    <div className={`${colors.bg} px-6 py-4 flex items-center justify-between`}>
                      <div>
                        <span className={`font-semibold text-base ${colors.text}`}>{serviceName}</span>
                        {reg.planTier && (
                          <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {reg.planTier}
                          </span>
                        )}
                      </div>
                      {reg.status && (
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{reg.status}</span>
                      )}
                    </div>

                    {/* Payment Details */}
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Payment Status */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Status</p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} border`}>
                            {reg.paymentStatus ? reg.paymentStatus.charAt(0).toUpperCase() + reg.paymentStatus.slice(1) : 'Not Available'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Amount */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                        {reg.paymentAmount != null ? (
                          <p className="text-xl font-bold text-gray-900">
                            ₹{reg.paymentAmount.toLocaleString('en-IN')}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>

                      {/* Payment Date */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Date</p>
                        {reg.paymentDate ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700">
                              {new Date(reg.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        ) : reg.createdAt ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700">
                              {new Date(reg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <span className="text-xs text-gray-400">(Registered)</span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>
                    </div>

                    {/* Footer note */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-400">For payment queries, please contact your counselor or support team.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
