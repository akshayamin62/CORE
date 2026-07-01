'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { referrerDocumentAPI } from '@/lib/referrerDocumentAPI';
import { ReferrerDocument, ReferrerDocumentField, ReferrerDocumentStatus } from '@/types';
import { REFERRER_DOCUMENTS_CONFIG } from '@/config/referrerDocumentsConfig';
import ReferrerDocumentViewModal from '@/components/ReferrerDocumentViewModal';
import ReferrerDocumentRejectModal from '@/components/ReferrerDocumentRejectModal';
import toast from 'react-hot-toast';

interface ReferrerDocumentsPanelProps {
  /** When set, fetches docs for admin/super-admin review. Omit for referrer self-service. */
  referrerId?: string;
  readOnly?: boolean;
  canReview?: boolean;
  /** Admin/super-admin can upload on behalf of referrer (auto-approved) */
  canUpload?: boolean;
  /** When verified, only missing/rejected docs can be uploaded */
  allowUploadMissingOrRejectedOnly?: boolean;
  /** Render inside B2BProfileForm tab without outer card wrapper */
  embedded?: boolean;
}

export default function ReferrerDocumentsPanel({
  referrerId,
  readOnly = false,
  canReview = false,
  canUpload = false,
  allowUploadMissingOrRejectedOnly = false,
  embedded = false,
}: ReferrerDocumentsPanelProps) {
  const [fields, setFields] = useState<ReferrerDocumentField[]>([]);
  const [documents, setDocuments] = useState<ReferrerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<ReferrerDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<ReferrerDocument | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      if (referrerId) {
        const [fr, dr] = await Promise.all([
          referrerDocumentAPI.getFieldsByReferrer(referrerId),
          referrerDocumentAPI.getDocsByReferrer(referrerId),
        ]);
        setFields(fr.data.data.fields || []);
        setDocuments(dr.data.data.documents || []);
      } else {
        try {
          await referrerDocumentAPI.seedDefaults();
        } catch {
          /* may already be seeded */
        }
        const [fr, dr] = await Promise.all([
          referrerDocumentAPI.getMyFields(),
          referrerDocumentAPI.getMyDocuments(),
        ]);
        setFields(fr.data.data.fields || []);
        setDocuments(dr.data.data.documents || []);
      }
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [referrerId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const getDocByKey = (key: string) => documents.find((d) => d.documentKey === key);

  const getFieldForConfig = (documentKey: string) =>
    fields.find((f) => f.documentKey === documentKey);

  const canUploadDoc = (doc: ReferrerDocument | undefined) => {
    if (canUpload) return true;
    if (readOnly) return false;
    if (!allowUploadMissingOrRejectedOnly) return true;
    return !doc || doc.status === ReferrerDocumentStatus.REJECTED;
  };

  const handleUpload = async (
    field: Pick<ReferrerDocumentField, '_id' | 'documentKey' | 'documentName'>,
    file: File
  ) => {
    setUploadingKey(field.documentKey);
    try {
      if (canUpload && referrerId) {
        await referrerDocumentAPI.uploadDocumentForReferrer(
          referrerId,
          field._id || '',
          field.documentKey,
          field.documentName,
          file
        );
        toast.success(`${field.documentName} uploaded and approved`);
      } else {
        await referrerDocumentAPI.uploadDocument(field._id, field.documentKey, field.documentName, file);
        toast.success(`${field.documentName} uploaded`);
      }
      await loadDocs();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleApprove = async (docId: string) => {
    setReviewingId(docId);
    try {
      await referrerDocumentAPI.approveDocument(docId);
      toast.success('Document approved');
      await loadDocs();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to approve');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async (message: string) => {
    if (!rejectDoc) return;
    setReviewingId(rejectDoc._id);
    try {
      await referrerDocumentAPI.rejectDocument(rejectDoc._id, message);
      toast.success('Document rejected');
      setRejectDoc(null);
      await loadDocs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to reject');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDownload = async (doc: ReferrerDocument) => {
    try {
      const res = await referrerDocumentAPI.viewDocument(doc._id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const statusBadge = (status: ReferrerDocumentStatus) => {
    const styles =
      status === ReferrerDocumentStatus.APPROVED
        ? 'bg-green-100 text-green-800'
        : status === ReferrerDocumentStatus.REJECTED
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800';
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{status}</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const documentCards = (
    <div className={embedded ? 'space-y-4' : 'space-y-4 p-5'}>
      {embedded && (
        <p className="text-sm text-gray-500">
          {canUpload
            ? 'Upload documents on behalf of the referrer. Admin uploads are approved immediately.'
            : 'Upload PAN, Aadhaar, bank proof, photograph, and signed undertakings as required.'}
        </p>
      )}
      {REFERRER_DOCUMENTS_CONFIG.map((config) => {
            const field = getFieldForConfig(config.documentKey);
            const doc = getDocByKey(config.documentKey);
            const cardKey = field?._id || config.documentKey;
            const isUploading = uploadingKey === config.documentKey;
            const isReviewing = reviewingId === doc?._id;
            const borderColor = !doc
              ? 'border-gray-200'
              : doc.status === ReferrerDocumentStatus.APPROVED
              ? 'border-green-400'
              : doc.status === ReferrerDocumentStatus.REJECTED
              ? 'border-red-400'
              : 'border-yellow-400';

            return (
              <div key={config.documentKey} className={`rounded-xl border-2 ${borderColor} bg-white p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-semibold text-gray-900">{config.documentName}</span>
                      {config.required && <span className="text-base font-bold text-red-500">*</span>}
                    </div>
                    {config.helpText && <p className="mt-0.5 text-sm text-gray-500">{config.helpText}</p>}
                    {doc?.status === ReferrerDocumentStatus.REJECTED && doc.rejectionMessage && (
                      <p className="mt-1 text-sm text-red-600">Rejected: {doc.rejectionMessage}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {doc && statusBadge(doc.status)}

                    {doc && (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewDoc(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Download
                        </button>
                      </>
                    )}

                    {canReview && doc && doc.status === ReferrerDocumentStatus.PENDING && (
                      <>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => handleApprove(doc._id)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => setRejectDoc(doc)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {(field || canUpload) && canUploadDoc(doc) && (
                      <>
                        <input
                          type="file"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[cardKey] = el;
                          }}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const uploadField = field ?? {
                              _id: '',
                              documentKey: config.documentKey,
                              documentName: config.documentName,
                            };
                            void handleUpload(uploadField, f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => fileInputRefs.current[cardKey]?.click()}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUploading ? 'Uploading...' : doc ? 'Re-upload' : 'Upload'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
    </div>
  );

  return (
    <>
      {embedded ? (
        documentCards
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <p className="mt-0.5 text-sm text-gray-500">Upload PAN, Aadhaar, bank proof, photograph, and signed undertakings as required.</p>
          </div>
          {documentCards}
        </div>
      )}

      <ReferrerDocumentViewModal
        open={!!viewDoc}
        documentId={viewDoc?._id || null}
        documentName={viewDoc?.documentName}
        onClose={() => setViewDoc(null)}
        onFetch={async (id) => {
          const res = await referrerDocumentAPI.viewDocument(id);
          return res.data;
        }}
      />

      <ReferrerDocumentRejectModal
        open={!!rejectDoc}
        documentName={rejectDoc?.documentName}
        submitting={!!reviewingId}
        onClose={() => setRejectDoc(null)}
        onConfirm={handleReject}
      />
    </>
  );
}
