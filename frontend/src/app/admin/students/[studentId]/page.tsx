'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentDetails {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  createdAt: string;
}

interface Counselor {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  email: string;
  mobileNumber?: string;
  specializations?: string[];
}

interface Registration {
  _id: string;
  serviceId: {
    _id: string;
    name: string;
    slug: string;
    shortDescription: string;
  };
  primaryCounselorId?: Counselor;
  secondaryCounselorId?: Counselor;
  activeCounselorId?: Counselor;
  status: string;
  createdAt: string;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [assigningCounselor, setAssigningCounselor] = useState<string | null>(null);
  const [switchingActive, setSwitchingActive] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.ADMIN && userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudentDetails();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudentDetails = async () => {
    // ⏱️ Start frontend timer
    const frontendStartTime = performance.now();
    console.log('🔵 [FRONTEND] Starting fetchStudentDetails...');
    
    try {
      const token = localStorage.getItem('token');
      
      // ⏱️ Timer 1: Network request to get student details
      const studentApiStart = performance.now();
      const response = await axios.get(`${API_URL}/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentApiEnd = performance.now();
      const studentApiTime = studentApiEnd - studentApiStart;
      
      console.log(`   └─ Student API Request: ${studentApiTime.toFixed(2)}ms`);
      console.log(`   └─ Backend Processing (from response): ${response.data.performance?.totalServerTime || 'N/A'}`);
      
      // ⏱️ Timer 2: State updates
      const stateUpdateStart = performance.now();
      setStudent(response.data.data.student);
      setRegistrations(response.data.data.registrations);
      const stateUpdateEnd = performance.now();
      const stateUpdateTime = stateUpdateEnd - stateUpdateStart;
      
      console.log(`   └─ State Update: ${stateUpdateTime.toFixed(2)}ms`);
      
      // ⏱️ Timer 3: Fetch counselors (separate API call)
      const counselorsApiStart = performance.now();
      try {
        const counselorsResponse = await axios.get(`${API_URL}/admin/counselors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const counselorsApiEnd = performance.now();
        const counselorsApiTime = counselorsApiEnd - counselorsApiStart;
        console.log(`   └─ Counselors API Request: ${counselorsApiTime.toFixed(2)}ms`);
        
        setCounselors(counselorsResponse.data.data.counselors || []);
      } catch (err) {
        console.error('Failed to fetch counselors:', err);
        setCounselors([]);
      }
      
      // ⏱️ Calculate total frontend time
      const frontendEndTime = performance.now();
      const totalFrontendTime = frontendEndTime - frontendStartTime;
      
      console.log(`\n📊 [FRONTEND] Performance Summary:`);
      console.log(`   └─ Total Frontend Time: ${totalFrontendTime.toFixed(2)}ms`);
      console.log(`   └─ Network Latency: ${(studentApiTime + (performance.now() - counselorsApiStart)).toFixed(2)}ms`);
      console.log(`   └─ User Experience: Click → Display = ~${totalFrontendTime.toFixed(0)}ms\n`);
      
    } catch (error: any) {
      const frontendEndTime = performance.now();
      const totalFrontendTime = frontendEndTime - frontendStartTime;
      console.log(`❌ [FRONTEND] Error after ${totalFrontendTime.toFixed(2)}ms`);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You are not the active counselor for this student.');
        router.push('/counselor/students');
      } else {
        toast.error('Failed to fetch student details');
      }
      console.error('Fetch student details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCounselors = async (
    registrationId: string, 
    primaryId: string, 
    secondaryId: string
  ) => {
    if (!primaryId && !secondaryId) {
      toast.error('Please select at least one counselor');
      return;
    }

    setAssigningCounselor(registrationId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/students/registrations/${registrationId}/assign-counselors`,
        { 
          primaryCounselorId: primaryId || undefined,
          secondaryCounselorId: secondaryId || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Counselors assigned successfully');
      fetchStudentDetails(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign counselors');
      console.error('Assign counselors error:', error);
    } finally {
      setAssigningCounselor(null);
    }
  };

  const handleSwitchActiveCounselor = async (registrationId: string, counselorId: string) => {
    if (!counselorId) {
      toast.error('Please select a counselor');
      return;
    }

    setSwitchingActive(registrationId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/students/registrations/${registrationId}/switch-active-counselor`,
        { activeCounselorId: counselorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Active counselor switched successfully');
      fetchStudentDetails(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to switch active counselor');
      console.error('Switch active counselor error:', error);
    } finally {
      setSwitchingActive(null);
    }
  };

  const handleViewFormData = (registrationId: string) => {
    router.push(`/admin/students/${studentId}/registration/${registrationId}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <AdminLayout user={user}>
        <div className="p-8 text-center">
          <p className="text-red-600">Student not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Students
          </button>

          {/* Student Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-xl">
                    {student.userId.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.userId.name}</h1>
                  <p className="text-gray-600">{student.userId.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    student.userId.isVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {student.userId.isVerified ? 'Verified' : 'Unverified'}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    student.userId.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {student.userId.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mobile Number</p>
                <p className="font-medium text-gray-900">
                  {student.mobileNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Role</p>
                <p className="font-medium text-gray-900">{student.userId.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Joined Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(student.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Service Registrations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Service Registrations ({registrations.length})
            </h2>

            {registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.map((registration) => (
                  <div
                    key={registration._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {registration.serviceId.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {registration.serviceId.shortDescription}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Registered: {new Date(registration.createdAt).toLocaleDateString()}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {registration.status}
                          </span>
                        </div>
                        {user?.role === USER_ROLE.ADMIN && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Primary Counselor */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Primary Counselor
                                </label>
                                <select
                                  id={`primary-${registration._id}`}
                                  value={registration.primaryCounselorId?._id || ''}
                                  onChange={(e) => {
                                    const secondarySelect = document.getElementById(`secondary-${registration._id}`) as HTMLSelectElement;
                                    handleAssignCounselors(registration._id, e.target.value, secondarySelect?.value || '');
                                  }}
                                  disabled={assigningCounselor === registration._id}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                >
                                  <option value="">Select Primary Counselor</option>
                                  {counselors.map((counselor) => (
                                    <option key={counselor._id} value={counselor._id}>
                                      {counselor.userId?.name || counselor.email}
                                      {counselor.specializations && counselor.specializations.length > 0 && 
                                        ` (${counselor.specializations.join(', ')})`
                                      }
                                    </option>
                                  ))}
                                </select>
                                {registration.primaryCounselorId && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    {registration.primaryCounselorId.userId?.name || registration.primaryCounselorId.email}
                                  </p>
                                )}
                              </div>

                              {/* Secondary Counselor */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Secondary Counselor
                                </label>
                                <select
                                  id={`secondary-${registration._id}`}
                                  value={registration.secondaryCounselorId?._id || ''}
                                  onChange={(e) => {
                                    const primarySelect = document.getElementById(`primary-${registration._id}`) as HTMLSelectElement;
                                    handleAssignCounselors(registration._id, primarySelect?.value || '', e.target.value);
                                  }}
                                  disabled={assigningCounselor === registration._id}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                >
                                  <option value="">Select Secondary Counselor</option>
                                  {counselors.map((counselor) => (
                                    <option key={counselor._id} value={counselor._id}>
                                      {counselor.userId?.name || counselor.email}
                                      {counselor.specializations && counselor.specializations.length > 0 && 
                                        ` (${counselor.specializations.join(', ')})`
                                      }
                                    </option>
                                  ))}
                                </select>
                                {registration.secondaryCounselorId && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    {registration.secondaryCounselorId.userId?.name || registration.secondaryCounselorId.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Active Counselor Switcher */}
                            {(registration.primaryCounselorId || registration.secondaryCounselorId) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-blue-900 mb-2">
                                  🎯 Active Counselor (Has Access)
                                </label>
                                <div className="flex items-center gap-3">
                                  <select
                                    value={registration.activeCounselorId?._id || ''}
                                    onChange={(e) => handleSwitchActiveCounselor(registration._id, e.target.value)}
                                    disabled={switchingActive === registration._id}
                                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm font-medium"
                                  >
                                    <option value="">Select Active Counselor</option>
                                    {registration.primaryCounselorId && (
                                      <option value={registration.primaryCounselorId._id}>
                                        Primary: {registration.primaryCounselorId.userId?.name || registration.primaryCounselorId.email}
                                      </option>
                                    )}
                                    {registration.secondaryCounselorId && (
                                      <option value={registration.secondaryCounselorId._id}>
                                        Secondary: {registration.secondaryCounselorId.userId?.name || registration.secondaryCounselorId.email}
                                      </option>
                                    )}
                                  </select>
                                  {switchingActive === registration._id && (
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                  )}
                                </div>
                                {registration.activeCounselorId && (
                                  <div className="mt-2 flex items-center text-sm">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Active
                                    </span>
                                    <span className="ml-2 text-gray-700">
                                      {registration.activeCounselorId.userId?.name || registration.activeCounselorId.email}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {assigningCounselor === registration._id && (
                              <div className="flex items-center justify-center py-2">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span className="text-sm text-gray-600">Updating counselors...</span>
                              </div>
                            )}
                          </div>
                        )}
                        {user?.role === USER_ROLE.COUNSELOR && (registration.primaryCounselorId || registration.secondaryCounselorId) && (
                          <div className="mt-3 space-y-2">
                            {registration.primaryCounselorId && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Primary:</span> {registration.primaryCounselorId.userId?.name || registration.primaryCounselorId.email}
                              </p>
                            )}
                            {registration.secondaryCounselorId && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Secondary:</span> {registration.secondaryCounselorId.userId?.name || registration.secondaryCounselorId.email}
                              </p>
                            )}
                            {registration.activeCounselorId && (
                              <p className="text-xs font-medium text-green-600">
                                ✓ Active: {registration.activeCounselorId.userId?.name || registration.activeCounselorId.email}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewFormData(registration._id)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View/Edit Form
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-gray-500">No service registrations yet</p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

