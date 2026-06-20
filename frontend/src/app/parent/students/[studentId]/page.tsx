'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import ParentLayout from '@/components/ParentLayout';
import StudentProfileModal from '@/components/StudentProfileModal';
import AuthImage from '@/components/AuthImage';
import { studentHeaderRowClass, studentPagePadding, parentMetaGridClass, parentMetaItemClass, parentMetaLabelClass, parentMetaValueClass, registrationCardClass, registrationCardRowClass, registrationMetaRowClass, registrationActionBtnClass, roleListBackBtnClass, roleListTitleClass } from '@/components/studentDetailResponsive';

interface StudentDetails {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  adminId?: {
    _id: string;
    companyName?: string;
    mobileNumber?: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    profilePicture?: string;
    };
  };
  counselorId?: {
    _id: string;
    mobileNumber?: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    profilePicture?: string;
    };
  };
  advisorId?: {
    _id: string;
    companyName?: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  intake?: string;
  year?: string;
  createdAt: string;
}

interface Registration {
  _id: string;
  serviceId: {
    _id: string;
    name: string;
    slug: string;
    shortDescription: string;
  };
  primaryOpsId?: {
    _id: string;
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  secondaryOpsId?: {
    _id: string;
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  activeOpsId?: {
    _id: string;
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  status: string;
  createdAt: string;
  registeredViaAdvisorId?: {
    _id: string;
    companyName?: string;
    userId?: { firstName?: string; middleName?: string; lastName?: string };
  };
  registeredViaAdminId?: {
    _id: string;
    companyName?: string;
    userId?: { firstName?: string; middleName?: string; lastName?: string };
  };
}

export default function ParentStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [transferInterestedServices, setTransferInterestedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.PARENT) {
        toast.error('Access denied. Parent only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudent();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudent = async () => {
    try {
      const response = await parentAPI.getStudentDetails(studentId);
      setStudent(response.data.data.student);
      setRegistrations(response.data.data.registrations);
      setTransferInterestedServices(response.data.data.transferInterestedServices || []);
    } catch (error: any) {
      console.error('Error fetching student:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Student not found or access denied');
        router.push('/parent/dashboard');
      } else {
        toast.error('Failed to fetch student details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewFormData = (registrationId: string, serviceName?: string) => {
    if (serviceName === 'Ivy League Preparation' && student?.userId?._id) {
      router.push(`/ivy-league/student?studentId=${student.userId._id}&readOnly=true`);
      return;
    }
    router.push(`/parent/students/${studentId}/registration/${registrationId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <ParentLayout user={user}>
        <div className={studentPagePadding}>
          {/* Back Button */}
          <button
            onClick={() => router.push('/parent/dashboard')}
            className={roleListBackBtnClass}
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : student ? (
            <>
              {/* Header */}
              <div className={`${studentHeaderRowClass} mb-6 sm:mb-8`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className={roleListTitleClass}>{getFullName(student.userId)}</h1>
                    <span className={`inline-flex shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full sm:px-3 sm:py-1 sm:text-sm ${
                      student.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.userId.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Student Details</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start rounded-lg bg-purple-50 px-2.5 py-1.5 text-purple-700 sm:px-3">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-medium sm:text-sm">Read-only access</span>
                </div>
              </div>

              {/* Student Info Card */}
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
                <div className={studentHeaderRowClass}>
                  <div className="flex items-center">
                    <AuthImage
                  path={student.userId.profilePicture}
                  alt={getFullName(student.userId)}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                  fallback={
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold text-xl">
                        {getInitials(student.userId)}
                      </span>
                    </div>
                  }
                />
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{getFullName(student.userId)}</h1>
                      <p className="text-gray-600">{student.userId.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                <div className={parentMetaGridClass}>
                  <div className={parentMetaItemClass}>
                    <p className={parentMetaLabelClass}>Mobile Number</p>
                    <p className={parentMetaValueClass}>
                      {student.mobileNumber || 'Not provided'}
                    </p>
                  </div>
                  {student.adminId && (
                  <div className={parentMetaItemClass}>
                    <p className={parentMetaLabelClass}>Admin</p>
                    <p className={parentMetaValueClass}>
                      {student.adminId?.companyName || getFullName(student.adminId?.userId) || 'Not assigned'}
                    </p>
                    {student.adminId?.userId?.email && (
                      <p className="truncate text-xs text-gray-500">{student.adminId.userId.email}</p>
                    )}
                    {student.adminId?.mobileNumber && (
                      <p className="text-xs text-gray-500">{student.adminId.mobileNumber}</p>
                    )}
                  </div>
                  )}
                  {student.adminId && (
                  <div className={parentMetaItemClass}>
                    <p className={parentMetaLabelClass}>Counselor</p>
                    <p className={parentMetaValueClass}>
                      {getFullName(student.counselorId?.userId) || 'Not assigned'}
                    </p>
                    {student.counselorId?.userId?.email && (
                      <p className="truncate text-xs text-gray-500">{student.counselorId.userId.email}</p>
                    )}
                    {student.counselorId?.mobileNumber && (
                      <p className="text-xs text-gray-500">{student.counselorId.mobileNumber}</p>
                    )}
                  </div>
                  )}
                  {student.advisorId && (
                  <div className={parentMetaItemClass}>
                    <p className={parentMetaLabelClass}>Advisor</p>
                    <p className={parentMetaValueClass}>
                      {student.advisorId?.companyName || 'N/A'}
                    </p>
                    {student.advisorId.userId?.email && (
                      <p className="truncate text-xs text-gray-500">{student.advisorId.userId.email}</p>
                    )}
                  </div>
                  )}
                  <div className={parentMetaItemClass}>
                    <p className={parentMetaLabelClass}>Joined Date</p>
                    <p className={parentMetaValueClass}>
                      {new Date(student.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>

                {/* Source / Intake / Year / Transfer */}
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 sm:mt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:pt-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Source</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${(student as any).referrerId ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {(student as any).referrerId ? 'Referral' : 'Enquiry Form'}
                    </span>
                  </div>
                  {student.intake && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Intake</p>
                      <p className="font-medium text-blue-600">{student.intake}</p>
                    </div>
                  )}
                  {student.year && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Year</p>
                      <p className="font-medium text-blue-600">{student.year}</p>
                    </div>
                  )}
                  {student.advisorId && transferInterestedServices.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Transfer For</p>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        {transferInterestedServices.map(s => ({ 'study-abroad': 'Study Abroad', 'ivy-league': 'Ivy League', 'education-planning': 'Education Planning', 'coaching-classes': 'Coaching Classes' }[s] || s)).join(', ')}
                      </span>
                    </div>
                  )}
                  {(student as any).referrerId && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Referred By</p>
                      <p className="font-medium text-purple-700">
                        {[(student as any).referrerId?.userId?.firstName, (student as any).referrerId?.userId?.middleName, (student as any).referrerId?.userId?.lastName].filter(Boolean).join(' ') || 'Referrer'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Registrations */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Service Registrations</h2>

                {registrations && registrations.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {registrations.map((registration) => (
                      <div key={registration._id} className={`${registrationCardClass} bg-gray-50`}>
                        <div className={registrationCardRowClass}>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {registration.serviceId.name}
                            </h3>
                            {registration.registeredViaAdvisorId && (
                              <p className="text-xs text-blue-600 mb-1">
                                Via Advisor: {registration.registeredViaAdvisorId.companyName || [registration.registeredViaAdvisorId.userId?.firstName, registration.registeredViaAdvisorId.userId?.middleName, registration.registeredViaAdvisorId.userId?.lastName].filter(Boolean).join(' ')}
                              </p>
                            )}
                            {registration.registeredViaAdminId && (
                              <p className="text-xs text-indigo-600 mb-1">
                                Via Admin: {registration.registeredViaAdminId.companyName || [registration.registeredViaAdminId.userId?.firstName, registration.registeredViaAdminId.userId?.middleName, registration.registeredViaAdminId.userId?.lastName].filter(Boolean).join(' ')}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mb-2">
                              {registration.serviceId.shortDescription}
                            </p>
                            <div className={registrationMetaRowClass}>
                              <span>Registered: {new Date(registration.createdAt).toLocaleDateString('en-GB')}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {registration.status}
                              </span>
                            </div>

                            {/* OPS Info (Read-only) */}
                            {(registration.primaryOpsId || registration.secondaryOpsId) && (
                              <div className="mt-3 space-y-1">
                                {registration.primaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Primary OPS:</span>{' '}
                                    {getFullName(registration.primaryOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                                {registration.secondaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Secondary OPS:</span>{' '}
                                    {getFullName(registration.secondaryOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                                {registration.activeOpsId && (
                                  <p className="text-xs font-medium text-blue-600">
                                    ✓ Active: {getFullName(registration.activeOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleViewFormData(registration._id, registration.serviceId?.name)}
                            className={`${registrationActionBtnClass} inline-flex items-center justify-center gap-2`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No service registrations found</p>
                  </div>
                )}
              </div>

            {/* Student Service Enquiry */}
            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => router.push(`/parent/students/${studentId}/enquiries`)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 sm:w-auto sm:px-5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Student Service Enquiry
              </button>
              {(student.adminId?._id || student.advisorId?._id) && (
                <button
                  onClick={() => router.push('/service-plans/view?studentId=' + studentId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto sm:px-5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Service Plans
                </button>
              )}
            </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Student not found</p>
            </div>
          )}
        </div>
      </ParentLayout>
      {showProfileModal && (
        <StudentProfileModal studentId={studentId} onClose={() => setShowProfileModal(false)} viewerRole="PARENT" />
      )}
    </>
  );
}
