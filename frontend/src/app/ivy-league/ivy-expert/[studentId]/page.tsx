'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { superAdminAPI } from '@/lib/api';
import StudentProfileModal from '@/components/StudentProfileModal';
import AuthImage from '@/components/AuthImage';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import {
  roleListPagePadding,
  roleListBackBtnClass,
  studentCardClass,
  studentHeaderRowClass,
  studentIdentityRowClass,
  studentAvatarClass,
  studentAvatarFallbackClass,
  studentTitleClass,
  studentBadgeRowClass,
  studentMetaGridClass,
  registrationCardClass,
  registrationCardRowClass,
  registrationMetaRowClass,
  registrationActionBtnClass,
} from '@/components/studentDetailResponsive';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  status: string;
  createdAt: string;
}

export default function IvyExpertStudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <IvyExpertStudentDetail params={params} />
    </Suspense>
  );
}

function IvyExpertStudentDetail({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const { studentId } = resolvedParams;
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId') || '';

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/super-admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudent(response.data.data.student);
      const allRegs: Registration[] = response.data.data.registrations || [];
      setRegistrations(allRegs.filter((r) => r.serviceId.slug === 'ivy-league' || r.serviceId.name === 'Ivy League Admissions'));
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Access denied. You are not assigned as the active Ivy Expert for this student.');
        router.push('/ivy-league/ivy-expert/students');
      } else {
        toast.error('Failed to fetch student details');
        console.error('Fetch student details error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewService = (registration: Registration) => {
    if (registration.serviceId.name === 'Ivy League Admissions' || registration.serviceId.slug === 'ivy-league') {
      router.push(`/ivy-league/ivy-expert?studentId=${studentId}&studentIvyServiceId=${serviceId || registration._id}&userId=${student?.userId?._id || ''}`);
    }
  };

  const handleStatusChange = async (registrationId: string, newStatus: string) => {
    setUpdatingStatus(registrationId);
    try {
      await superAdminAPI.updateRegistrationStatus(registrationId, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      setRegistrations(prev =>
        prev.map(r =>
          r._id === registrationId ? { ...r, status: newStatus } : r
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
      console.error('Update status error:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Student not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className={`${roleListPagePadding} min-w-0 max-w-full overflow-x-hidden`}>
        <button
          type="button"
          onClick={() => router.push('/ivy-league/ivy-expert/students')}
          className={roleListBackBtnClass}
        >
          <svg className="mr-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
        </button>

        <div className={studentCardClass}>
          <div className={studentHeaderRowClass}>
            <div className={studentIdentityRowClass}>
              <AuthImage
                  path={student.userId.profilePicture}
                  alt={getFullName(student.userId)}
                  className={studentAvatarClass}
                  fallback={
                    <div className={studentAvatarFallbackClass}>
                      <span className="text-xl font-bold text-blue-600">
                        {getInitials(student.userId)}
                      </span>
                    </div>
                  }
                />
              <div className="min-w-0">
                <h1 className={studentTitleClass}>{getFullName(student.userId)}</h1>
                <p className="truncate text-sm text-gray-600 sm:text-base">{student.userId.email}</p>
              </div>
            </div>
            <div className={studentBadgeRowClass}>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  student.userId.isVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {student.userId.isVerified ? 'Verified' : 'Unverified'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  student.userId.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {student.userId.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                View Profile
              </button>
            </div>
          </div>

          <div className={studentMetaGridClass}>
            <div>
              <p className="text-sm text-gray-600 mb-1">Mobile Number</p>
              <p className="font-medium text-gray-900">
                {student.mobileNumber || 'Not provided'}
              </p>
            </div>
            {student.adminId && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Admin</p>
              <p className="font-medium text-gray-900">
                {student.adminId?.companyName || 'Not assigned'}
              </p>
              {student.adminId?.userId?.email && (
                <p className="text-sm text-gray-500">{student.adminId.userId.email}</p>
              )}
            </div>
            )}
            {student.adminId && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Counselor</p>
              <p className="font-medium text-gray-900">
                {getFullName(student.counselorId?.userId) || 'Not assigned'}
              </p>
              {student.counselorId?.userId?.email && (
                <p className="text-sm text-gray-500">{student.counselorId.userId.email}</p>
              )}
            </div>
            )}
            {student.advisorId && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Advisor</p>
              <p className="font-medium text-gray-900">
                {student.advisorId?.companyName || 'N/A'}
              </p>
              {student.advisorId?.userId?.email && (
                <p className="text-sm text-gray-500">{student.advisorId.userId.email}</p>
              )}
            </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">Joined Date</p>
              <p className="font-medium text-gray-900">
                {new Date(student.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
            {(student.intake || student.year) && (
              <div>
                {student.intake && (
                  <div className="mb-2">
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
              </div>
            )}
          </div>
        </div>

        <div className={studentCardClass}>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
            Ivy League Service ({registrations.length})
          </h2>

          {registrations.length > 0 ? (
            <div className="space-y-4">
              {registrations.map((registration) => (
                <div
                  key={registration._id}
                  className={registrationCardClass}
                >
                  <div className={registrationCardRowClass}>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-semibold text-gray-900">
                        {registration.serviceId.name}
                      </h3>
                      <p className="mb-2 text-sm text-gray-600">
                        {registration.serviceId.shortDescription}
                      </p>
                      <div className={registrationMetaRowClass}>
                        <span>Registered: {new Date(registration.createdAt).toLocaleDateString('en-GB')}</span>
                        <select
                          value={registration.status}
                          onChange={(e) => handleStatusChange(registration._id, e.target.value)}
                          disabled={updatingStatus === registration._id}
                          className={`cursor-pointer rounded border px-2 py-1 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                            registration.status === 'COMPLETED' ? 'border-green-300 bg-green-100 text-green-800' :
                            registration.status === 'CANCELLED' ? 'border-red-300 bg-red-100 text-red-800' :
                            registration.status === 'IN_PROGRESS' ? 'border-yellow-300 bg-yellow-100 text-yellow-800' :
                            'border-blue-300 bg-blue-100 text-blue-800'
                          }`}
                        >
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        {updatingStatus === registration._id && (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewService(registration)}
                      className={registrationActionBtnClass}
                    >
                      View Details
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

        {(student.adminId?._id || student.advisorId?._id) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push('/service-plans/view?studentId=' + studentId)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Service Plans
            </button>
          </div>
        )}
      </div>
      {showProfileModal && (
        <StudentProfileModal studentId={studentId} onClose={() => setShowProfileModal(false)} viewerRole="IVY_EXPERT" />
      )}
    </>
  );
}
