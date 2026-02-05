'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { superAdminAPI, authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface AdminDetails {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  mobileNumber?: string;
  companyName?: string;
  address?: string;
  companyLogo?: string;
  enquiryFormSlug: string;
}

export default function AdminDetailPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchAdminDetails();
    }
  }, [currentUser, adminId]);

  const checkAdminAccess = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin privileges required.');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchAdminDetails = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getAdminDetails(adminId);
      setAdmin(response.data.data);
    } catch (error: any) {
      console.error('Fetch admin details error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch admin details');
      router.push('/super-admin/roles/admin');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/super-admin/roles/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Details</h1>
              <p className="text-gray-600 mt-1">View admin account information</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : admin ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col items-center text-center">
                    {admin.companyLogo ? (
                      <img
                        src={`http://localhost:5000${admin.companyLogo}`}
                        alt={admin.companyName || 'Company Logo'}
                        className="w-24 h-24 rounded-xl object-cover mb-4 border border-gray-200"
                        onError={(e) => {
                          // Fallback to default avatar if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-24 h-24 rounded-xl bg-blue-100 flex items-center justify-center mb-4 ${admin.companyLogo ? 'hidden' : ''}`}>
                      <span className="text-3xl font-bold text-blue-600">
                        {admin.companyName?.charAt(0) || admin.name.charAt(0)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{admin.name}</h2>
                    <p className="text-gray-500 mb-3">{admin.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        admin.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {admin.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Card */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Full Name (Owner)</label>
                      <p className="text-gray-900 font-medium">{admin.name || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                      <p className="text-gray-900 font-medium">{admin.companyName || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                      <p className="text-gray-900 font-medium">{admin.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number</label>
                      <p className="text-gray-900 font-medium">{admin.mobileNumber || 'N/A'}</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                      <p className="text-gray-900 font-medium">{admin.address || 'N/A'}</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Enquiry Form URL</label>
                      <div className="flex items-center gap-2">
                        <p className="text-blue-600 font-medium font-mono">/enquiry/{admin.enquiryFormSlug}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/enquiry/${admin.enquiryFormSlug}`);
                            toast.success('URL copied to clipboard');
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy URL"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <Link
                          href={`/enquiry/${admin.enquiryFormSlug}`}
                          target="_blank"
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Open in new tab"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {admin.companyLogo && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Company Logo URL</label>
                        <p className="text-gray-900 font-medium text-sm break-all">{admin.companyLogo}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                      <p className="text-gray-900 font-medium">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Admin not found</p>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
