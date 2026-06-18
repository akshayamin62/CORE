'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { spDocumentAPI } from '@/lib/spDocumentAPI';
import { User, USER_ROLE, SPDocument, SPDocumentStatus } from '@/types';
import { SP_DOCUMENTS_CONFIG } from '@/config/spDocumentsConfig';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import AuthImage from '@/components/AuthImage';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import SuperAdminRoleDetailFrame, {
  DetailInfoCard,
  DetailPageHeader,
  ListPageStatGrid,
} from '@/components/SuperAdminRoleDetailFrame';
import PageStatCard from '@/components/PageStatCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

interface ServiceProviderDetail {
  _id: string;
  userId: string;
  email: string;
  mobileNumber?: string;
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  gstNumber?: string;
  businessPan?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  website?: string;
  companyLogo?: string;
  servicesOffered?: string[];
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankAccountType?: string;
  bankSwiftCode?: string;
  bankUpiId?: string;
  createdAt: string;
}

export default function ServiceProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [serviceProvider, setServiceProvider] = useState<ServiceProviderDetail | null>(null);
  const [documents, setDocuments] = useState<SPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<SPDocument | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin privileges required.');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
      await fetchServiceProviderDetail();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceProviderDetail = async () => {
    try {
      const response = await superAdminAPI.getServiceProviderDetail(providerId);
      const data = response.data.data;

      setUser(data.user);
      setServiceProvider(data.serviceProvider);

      // Fetch documents
      if (data.serviceProvider?._id) {
        fetchDocuments(data.serviceProvider._id);
      }
    } catch (error: any) {
      console.error('Error fetching service provider detail:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch service provider details');
      router.push('/super-admin/roles/service-provider');
    }
  };

  const fetchDocuments = async (spId: string) => {
    try {
      const response = await spDocumentAPI.getDocuments(spId);
      setDocuments(response.data.data.documents || []);
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleApproveDocument = async (docId: string) => {
    setActionLoading(docId);
    try {
      await spDocumentAPI.approveDocument(docId);
      toast.success('Document approved');
      if (serviceProvider?._id) {
        await fetchDocuments(serviceProvider._id);
      }
    } catch (error: any) {
      toast.error('Failed to approve document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    if (!rejectionMessage.trim()) {
      toast.error('Rejection message is required');
      return;
    }
    setActionLoading(docId);
    try {
      await spDocumentAPI.rejectDocument(docId, rejectionMessage);
      toast.success('Document rejected');
      setRejectingDocId(null);
      setRejectionMessage('');
      if (serviceProvider?._id) {
        await fetchDocuments(serviceProvider._id);
      }
    } catch (error: any) {
      toast.error('Failed to reject document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async () => {
    setVerifyLoading(true);
    try {
      await superAdminAPI.approveUser(providerId);
      toast.success('Service Provider verified successfully!');
      await fetchServiceProviderDetail();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleViewDocument = async (doc: SPDocument) => {
    try {
      const response = await spDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([response.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      setViewBlobUrl(url);
      setViewingDoc(doc);
    } catch (error: any) {
      toast.error('Failed to view document');
    }
  };

  const closeViewer = () => {
    if (viewBlobUrl) {
      URL.revokeObjectURL(viewBlobUrl);
    }
    setViewBlobUrl(null);
    setViewingDoc(null);
  };

  const getDocumentForKey = (key: string): SPDocument | undefined => {
    return documents.find((doc) => doc.documentKey === key);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading || !currentUser || !user || !serviceProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const fullName = getFullName(user);

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <SuperAdminRoleDetailFrame
          backLabel="Back to Service Providers"
          onBack={() => router.push('/super-admin/roles/service-provider')}
        >
          <DetailPageHeader
            avatar={
              serviceProvider.companyLogo ? (
                <AuthImage
                  path={serviceProvider.companyLogo}
                  alt="Company Logo"
                  className="h-12 w-12 shrink-0 rounded-full border-2 border-blue-200 object-cover sm:h-14 sm:w-14"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:h-14 sm:w-14">
                  <span className="text-lg font-bold text-blue-600">{fullName.charAt(0) || 'S'}</span>
                </div>
              )
            }
            title={fullName}
            subtitle={serviceProvider.companyName || 'Service Provider Details'}
          />

          <DetailInfoCard>
            <div className="flex w-full flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {user.isVerified ? 'Verified' : 'Unverified'}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user.isActive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {!user.isVerified && (
                <button
                  type="button"
                  onClick={handleVerifyUser}
                  disabled={verifyLoading}
                  className="ml-auto rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify User'}
                </button>
              )}
            </div>
          </DetailInfoCard>

          <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
            <button
              type="button"
              onClick={() => router.push(`/super-admin/roles/service-provider/${providerId}/services`)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:flex-none sm:px-5"
            >
              Services
            </button>
            <button
              type="button"
              onClick={() => router.push(`/super-admin/roles/service-provider/${providerId}/enquiries`)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 sm:flex-none sm:px-5"
            >
              Enquiries
            </button>
          </div>

          {/* Account Information */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="Full Name" value={fullName} />
              <InfoField label="Email" value={user.email} />
              <InfoField label="Mobile Number" value={serviceProvider.mobileNumber || 'N/A'} />
              <InfoField label="Account Created" value={new Date(user.createdAt || '').toLocaleDateString('en-GB')} />
              <InfoField label="Role" value="Service Provider" />

              {serviceProvider.servicesOffered && serviceProvider.servicesOffered.length > 0 && (
                <div className=" border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Services Offered</label>
                  <div className="flex flex-wrap gap-2">
                    {serviceProvider.servicesOffered.map((service, index) => (
                      <span key={`service-${index}-${service}`} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company Information (includes address) */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Company Information</h2>
              {serviceProvider.companyLogo && (
                <AuthImage path={serviceProvider.companyLogo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="Company Name" value={serviceProvider.companyName || 'N/A'} />
              <InfoField label="Business Type" value={serviceProvider.businessType || 'N/A'} />
              <InfoField label="Registration Number" value={serviceProvider.registrationNumber || 'N/A'} />
              <InfoField label="Website" value={serviceProvider.website || 'N/A'} link={serviceProvider.website} />
              <InfoField label="Address" value={serviceProvider.address || 'N/A'} />
              <InfoField label="City" value={serviceProvider.city || 'N/A'} />
              <InfoField label="State" value={serviceProvider.state || 'N/A'} />
              <InfoField label="Country" value={serviceProvider.country || 'N/A'} />
              <InfoField label="Pincode" value={serviceProvider.pincode || 'N/A'} />
            </div>
          </div>

          {/* Bank & Tax Details */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">Bank & Tax Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="GST Number" value={serviceProvider.gstNumber || 'N/A'} />
              <InfoField label="Business PAN" value={serviceProvider.businessPan || 'N/A'} />
              <InfoField label="Bank Name" value={serviceProvider.bankName || 'N/A'} />
              <InfoField label="Account Number" value={serviceProvider.bankAccountNumber || 'N/A'} />
              <InfoField label="IFSC Code" value={serviceProvider.bankIfscCode || 'N/A'} />
              <InfoField label="Account Type" value={serviceProvider.bankAccountType || 'N/A'} />
              <InfoField label="Swift Code" value={serviceProvider.bankSwiftCode || 'N/A'} />
              <InfoField label="UPI ID" value={serviceProvider.bankUpiId || 'N/A'} />
            </div>
          </div>

          {/* Documents Section */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
            <h2 className="mb-1 text-lg font-bold text-gray-900 sm:text-xl">Documents</h2>
            <p className="mb-4 text-sm text-gray-500">Review and approve/reject uploaded documents.</p>

            <ListPageStatGrid columns={3}>
              <PageStatCard
                compact
                title="Required"
                mobileTitle="Required"
                value={SP_DOCUMENTS_CONFIG.length}
                color="gray"
              />
              <PageStatCard
                compact
                title="Approved"
                mobileTitle="Approved"
                value={documents.filter((d) => d.status === 'APPROVED').length}
                color="green"
              />
              <PageStatCard
                compact
                title="Pending"
                mobileTitle="Pending"
                value={documents.filter((d) => d.status === 'PENDING').length}
                color="amber"
              />
            </ListPageStatGrid>

            <div className="space-y-3 sm:space-y-4">
              {SP_DOCUMENTS_CONFIG.map((field) => {
                const doc = getDocumentForKey(field.documentKey);

                return (
                  <div
                    key={field.documentKey}
                    className={`rounded-xl border-2 bg-gradient-to-br from-white to-gray-50 p-4 transition-all duration-200 hover:shadow-md sm:p-5 ${
                      doc
                        ? doc.status === 'APPROVED'
                          ? 'border-green-300'
                          : doc.status === 'PENDING'
                            ? 'border-yellow-300'
                            : 'border-red-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-medium text-gray-900">{field.documentName}</h3>
                            {field.required && <span className="text-sm text-red-500 font-bold">*</span>}
                          </div>
                          {field.helpText && (
                            <p className="text-sm text-gray-500 mt-0.5">{field.helpText}</p>
                          )}
                          {!doc && (
                            <p className="text-xs text-gray-400 mt-0.5">Not uploaded yet</p>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        {doc && (
                          <div className="flex-shrink-0 self-start sm:self-auto">
                            {getStatusBadge(doc.status)}
                          </div>
                        )}
                        {doc && (
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:from-blue-100 hover:to-blue-200 sm:w-auto"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View
                          </button>
                        )}
                        {doc && doc.status === 'PENDING' && (
                          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleApproveDocument(doc._id)}
                              disabled={actionLoading === doc._id}
                              className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDocId(doc._id);
                                setRejectionMessage('');
                              }}
                              disabled={actionLoading === doc._id}
                              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-red-600 hover:to-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rejection message input */}
                    {rejectingDocId === doc?._id && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <textarea
                            value={rejectionMessage}
                            onChange={(e) => setRejectionMessage(e.target.value)}
                            placeholder="Enter reason for rejection..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2 sm:shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRejectDocument(doc!._id)}
                            disabled={actionLoading === doc!._id}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50 sm:flex-none"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingDocId(null);
                              setRejectionMessage('');
                            }}
                            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 sm:flex-none"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verify User Button (bottom) */}
          {!user.isVerified && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-6">
              <h2 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">Verification</h2>
              <p className="mb-4 text-sm text-gray-500">
                After reviewing all documents & information, click below to verify this service provider.
              </p>
              <button
                type="button"
                onClick={handleVerifyUser}
                disabled={verifyLoading}
                className="w-full rounded-lg bg-green-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50 sm:w-auto"
              >
                {verifyLoading ? 'Verifying...' : 'Verify Service Provider'}
              </button>
            </div>
          )}
        </SuperAdminRoleDetailFrame>
      </SuperAdminLayout>

      {/* Document Viewer Modal */}
      {viewingDoc && viewBlobUrl && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="app-modal-panel flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-t-2xl bg-white sm:max-h-[90vh] sm:rounded-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{viewingDoc.documentName}</h3>
                <p className="text-sm text-gray-500">{viewingDoc.fileName}</p>
              </div>
              <button
                onClick={closeViewer}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDoc.mimeType.startsWith('image/') ? (
                <img src={viewBlobUrl} alt={viewingDoc.documentName} className="max-w-full mx-auto" />
              ) : viewingDoc.mimeType === 'application/pdf' ? (
                <iframe src={viewBlobUrl} className="w-full h-[70vh]" title={viewingDoc.documentName} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">This file type cannot be previewed. Please download to view.</p>
                  <a href={viewBlobUrl} download={viewingDoc.fileName} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// Helper component for displaying info fields
function InfoField({ label, value, link, fullWidth }: { label: string; value: string; link?: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-gray-900">{value}</p>
      )}
    </div>
  );
}
