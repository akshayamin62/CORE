'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: USER_ROLE.STUDENT,
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'signup' | 'verify-otp'>('signup');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.signup(formData);
      const message = response.data.message || 'OTP sent to your email!';
      toast.success(message, { duration: 4000 });
      setUserEmail(formData.email);
      setStep('verify-otp');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.verifySignupOTP({ email: userEmail, otp });
      const message = response.data.message || 'OTP verified! Check your email for verification link.';
      toast.success(message, { duration: 4000 });
      
      // If student, redirect to dashboard (auto-verified)
      // Otherwise, show pending approval message
      if (response.data.data.user?.isVerified) {
        // Store token if provided
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Show pending approval message
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: USER_ROLE.STUDENT, label: 'Student', icon: '🎓', color: 'from-blue-500 to-cyan-500' },
    { value: USER_ROLE.ALUMNI, label: 'Alumni', icon: '🎖️', color: 'from-purple-500 to-pink-500' },
    { value: USER_ROLE.SERVICE_PROVIDER, label: 'Service Provider', icon: '💼', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl shadow-2xl mb-5 transform hover:scale-105 transition-transform">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-gray-700 text-lg">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors underline decoration-2 underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 animate-scale-in backdrop-blur-sm bg-opacity-95">
          {step === 'signup' ? (
            <>
            <form onSubmit={handleSignup} className="space-y-5">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>


            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-4">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: option.value })}
                    className={`relative p-5 border-2 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      formData.role === option.value
                        ? `border-transparent bg-gradient-to-br ${option.color} text-white shadow-xl scale-105`
                        : 'border-gray-200 bg-white text-gray-900 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-4xl mb-2">{option.icon}</div>
                      <div className="text-sm font-bold">{option.label}</div>
                    </div>
                    {formData.role === option.value && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>

            </>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-xl mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h3>
                <p className="text-gray-600">
                  Enter the 4-digit code sent to <span className="font-semibold">{userEmail}</span>
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-center text-2xl font-bold tracking-widest"
                    placeholder="0000"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Check your email for the 4-digit code</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 4}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP'
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setStep('signup');
                  setOtp('');
                }}
                className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 font-medium rounded-xl transition-colors"
              >
                ← Back to Signup
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
