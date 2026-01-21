'use client';

import { useEffect, useState } from 'react';
import { documentAPI } from '@/lib/documentAPI';
import { ksDocumentAPI } from '@/lib/ksDocumentAPI';
import { YOUR_DOCUMENTS_CONFIG } from '@/config/yourDocumentsConfig';
import { StudentDocument, DocumentCategory, DocumentStatus } from '@/types';
import toast from 'react-hot-toast';
import { Upload, Download, Check, X, Plus, FileText, AlertCircle, Trash2 } from 'lucide-react';

interface DocumentUploadSectionProps {
  registrationId: string;
  studentId: string;
  userRole: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  sectionTitle: string;
}

interface KSDocumentField {
  _id: string;
  documentKey: string;
  documentName: string;
  category: 'PRIMARY' | 'SECONDARY';
  required: boolean;
  helpText?: string;
  allowMultiple: boolean;
  order: number;
}

export default function DocumentUploadSection({
  registrationId,
  studentId,
  userRole,
  sectionTitle,
}: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [ksDocumentFields, setKSDocumentFields] = useState<KSDocumentField[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');
  const [newFieldAllowMultiple, setNewFieldAllowMultiple] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{docId: string, fieldKey: string} | null>(null);
  const [documentBlobUrls, setDocumentBlobUrls] = useState<{[key: string]: string}>({});

  const isYourDocumentsSection = sectionTitle.toLowerCase().includes('your');
  const isKSDocumentsSection = sectionTitle.toLowerCase().includes('ks');

  useEffect(() => {
    fetchData();
    
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(documentBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [registrationId, sectionTitle]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isKSDocumentsSection) {
        await Promise.all([fetchKSDocumentFields(), fetchDocuments()]);
      } else {
        await fetchDocuments();
      }
    } catch (error: any) {
      console.warn('Failed to fetch data:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchKSDocumentFields = async () => {
    try {
      const response = await ksDocumentAPI.getKSDocumentFields(registrationId);
      const fields = response.data.data.fields || [];
      setKSDocumentFields(fields);
    } catch (error: any) {
      console.error('Failed to fetch KS document fields:', error);
      throw error;
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getDocuments(registrationId);
      const docs = response.data.data.documents || [];
      setDocuments(docs);
    } catch (error: any) {
      console.warn('Failed to fetch documents:', error);
      throw error;
    }
  };

  const handleFileSelect = async (
    documentKey: string,
    documentName: string,
    category: 'PRIMARY' | 'SECONDARY',
    file: File,
    allowMultiple: boolean = false
  ) => {
    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(documentKey);
      await documentAPI.uploadDocument(
        registrationId,
        studentId,
        documentKey,
        documentName,
        category as DocumentCategory,
        file,
        false,
        allowMultiple
      );
      toast.success('Document uploaded successfully');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Upload error:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload document');
      }
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (doc: StudentDocument) => {
    try {
      const response = await documentAPI.downloadDocument(doc._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.warn('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleApprove = async (doc: StudentDocument) => {
    try {
      await documentAPI.approveDocument(doc._id);
      toast.success('Document approved');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Approve error:', error);
      toast.error('Failed to approve document');
    }
  };

  const handleRejectClick = (doc: StudentDocument) => {
    setSelectedDocument(doc);
    setRejectionMessage('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionMessage.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await documentAPI.rejectDocument(selectedDocument!._id, rejectionMessage);
      toast.success('Document rejected');
      setShowRejectModal(false);
      setSelectedDocument(null);
      setRejectionMessage('');
      await fetchDocuments();
    } catch (error: any) {
      console.warn('Reject error:', error);
      toast.error('Failed to reject document');
    }
  };

  const handleAddKSDocumentField = async () => {
    if (!newFieldName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      // Always set category as SECONDARY and required as false
      await ksDocumentAPI.addKSDocumentField(
        registrationId,
        newFieldName,
        DocumentCategory.SECONDARY,
        false, // required is always false
        newFieldHelpText || undefined,
        newFieldAllowMultiple
      );
      toast.success('KS document field added successfully');
      setShowAddFieldModal(false);
      setNewFieldName('');
      setNewFieldHelpText('');
      setNewFieldAllowMultiple(false);
      await fetchKSDocumentFields();
    } catch (error: any) {
      console.warn('Add field error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to add KS document field');
      }
    }
  };

  const getDocumentsForField = (documentKey: string): StudentDocument[] => {
    return documents.filter((doc) => doc.documentKey === documentKey);
  };


  const handleViewDocument = async (documentId: string, fieldKey: string) => {
    // Toggle view
    if (viewingDocument?.docId === documentId) {
      setViewingDocument(null);
      return;
    }

    // Check if we already have the blob URL
    if (documentBlobUrls[documentId]) {
      setViewingDocument({ docId: documentId, fieldKey });
      return;
    }

    // Fetch the document as blob
    try {
      const response = await documentAPI.viewDocument(documentId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const blobUrl = URL.createObjectURL(blob);
      
      setDocumentBlobUrls(prev => ({ ...prev, [documentId]: blobUrl }));
      setViewingDocument({ docId: documentId, fieldKey });
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document preview');
    }
  };

  const renderDocumentField = (
    documentKey: string,
    documentName: string,
    category: 'PRIMARY' | 'SECONDARY',
    required: boolean,
    allowMultiple: boolean,
    helpText?: string
  ) => {
    const fieldDocuments = getDocumentsForField(documentKey);
    const isUploading = uploading === documentKey;
    const canUpload = userRole === 'STUDENT' || userRole === 'COUNSELOR' || userRole === 'ADMIN';
    
    return (
      <div
        key={documentKey}
        className="border border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors bg-white"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">{documentName}</h4>
              {required && (
                <span className="text-xs text-red-500 font-semibold">*Required</span>
              )}
              {allowMultiple && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Multiple</span>
              )}
            </div>
            {helpText && (
              <p className="text-sm text-gray-700 mt-1">{helpText}</p>
            )}

            {/* Show all uploaded documents for this field */}
            {fieldDocuments.length > 0 && (
              <div className="mt-3 space-y-2">
                {fieldDocuments.map((document) => (
                  <div key={document._id} className="border border-gray-200 rounded p-3 bg-gray-50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700 font-medium">File:</span>
                      <span className="text-gray-900 flex-1">{document.fileName}</span>
                      
                      {/* Status Badge */}
                      {document.status === DocumentStatus.PENDING && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                      {document.status === DocumentStatus.APPROVED && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Approved
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons for each document */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleViewDocument(document._id, documentKey)}
                        className={`px-3 py-1.5 rounded transition-colors text-xs font-medium flex items-center gap-1 ${
                          viewingDocument?.docId === document._id
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        {viewingDocument?.docId === document._id ? 'Hide' : 'View'}
                      </button>
                      
                      <button
                        onClick={() => handleDownload(document)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition-colors text-xs font-medium flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                      
                      {(userRole === 'COUNSELOR' || userRole === 'ADMIN') && document.status === DocumentStatus.PENDING && (
                        <>
                          <button
                            onClick={() => handleApprove(document)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectClick(document)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>

                    {/* Inline Document Viewer */}
                    {viewingDocument?.docId === document._id && documentBlobUrls[document._id] && (
                      <div className="mt-3 border-t pt-3">
                        <div className="bg-white rounded border border-gray-300 overflow-hidden">
                          {document.mimeType === 'application/pdf' ? (
                            <iframe
                              src={documentBlobUrls[document._id]}
                              className="w-full h-[600px] border-0"
                              title={document.fileName}
                            />
                          ) : document.mimeType.startsWith('image/') ? (
                            <img
                              src={documentBlobUrls[document._id]}
                              alt={document.fileName}
                              className="w-full h-auto max-h-[600px] object-contain"
                            />
                          ) : document.mimeType === 'application/msword' || document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                            <div className="p-8 text-center">
                              <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                              <p className="text-gray-900 font-medium mb-2">Word Document Preview Not Available</p>
                              <p className="text-sm text-gray-600 mb-4">This file type cannot be previewed in the browser.</p>
                              <button
                                onClick={() => handleDownload(document)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download to View
                              </button>
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-900 font-medium mb-2">Preview Not Available</p>
                              <p className="text-sm text-gray-600 mb-4">This file type cannot be previewed in the browser.</p>
                              <button
                                onClick={() => handleDownload(document)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download to View
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          {canUpload && (allowMultiple || fieldDocuments.length === 0) && (
            <div className="ml-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(documentKey, documentName, category, file, allowMultiple);
                    e.target.value = '';
                  }}
                  disabled={isUploading}
                />
                <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : allowMultiple && fieldDocuments.length > 0 ? 'Add More' : 'Upload'}
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-900">Loading documents...</p>
        </div>
      </div>
    );
  }

  // Render Your Documents Section
  if (isYourDocumentsSection) {
    const primaryFields = YOUR_DOCUMENTS_CONFIG.filter((f) => f.category === 'PRIMARY');
    const secondaryFields = YOUR_DOCUMENTS_CONFIG.filter((f) => f.category === 'SECONDARY');

    return (
      <>
        <div className="space-y-6">
          {/* Primary Documents */}
          {primaryFields.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
              <div className="bg-blue-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">Primary Documents</h3>
                <p className="text-blue-50 text-sm mt-1">Required documents for your application</p>
              </div>
              <div className="p-6 space-y-4">
                {primaryFields.map((field) =>
                  renderDocumentField(
                    field.documentKey,
                    field.documentName,
                    field.category,
                    field.required,
                    field.allowMultiple,
                    field.helpText
                  )
                )}
              </div>
            </div>
          )}

          {/* Secondary Documents */}
          {secondaryFields.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
              <div className="bg-green-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">Secondary Documents</h3>
                <p className="text-green-50 text-sm mt-1">Optional supporting documents</p>
              </div>
              <div className="p-6 space-y-4">
                {secondaryFields.map((field) =>
                  renderDocumentField(
                    field.documentKey,
                    field.documentName,
                    field.category,
                    field.required,
                    field.allowMultiple,
                    field.helpText
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Document</h3>
              <p className="text-sm text-gray-700 mb-4">
                Please provide a reason for rejecting <strong className="text-gray-900">{selectedDocument.documentName}</strong>
              </p>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 text-gray-900"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDocument(null);
                    setRejectionMessage('');
                  }}
                  className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject Document
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Render KS Documents Section
  if (isKSDocumentsSection) {
    return (
      <>
        <div className="space-y-6">
        {/* Add Document Button - Only for Admin/Counselor */}
        {(userRole === 'ADMIN' || userRole === 'COUNSELOR') && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddFieldModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Document Field
            </button>
          </div>
        )}

        {/* KS Document Fields */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading KS documents...</p>
          </div>
        ) : ksDocumentFields.length > 0 ? (
          <div className="space-y-4">
            {ksDocumentFields.map((field) =>
              renderDocumentField(
                field.documentKey,
                field.documentName,
                field.category,
                field.required,
                field.allowMultiple,
                field.helpText
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No KS Document Fields</h3>
            <p className="text-gray-700">
              {userRole === 'ADMIN' || userRole === 'COUNSELOR'
                ? 'Click "Add Document Field" to create personalized document requirements for this student.'
                : 'No KS document fields have been configured for you yet.'}
            </p>
          </div>
        )}

        {/* Add Field Modal */}
        {showAddFieldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add KS Document Field</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Birth Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newFieldHelpText}
                    onChange={(e) => setNewFieldHelpText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Upload a certified copy"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowMultiple"
                    checked={newFieldAllowMultiple}
                    onChange={(e) => setNewFieldAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultiple" className="ml-2 text-sm text-gray-900">
                    Allow multiple uploads
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldName('');
                    setNewFieldHelpText('');
                    setNewFieldAllowMultiple(false);
                  }}
                  className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddKSDocumentField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Document</h3>
              <p className="text-sm text-gray-700 mb-4">
                Please provide a reason for rejecting <strong className="text-gray-900">{selectedDocument.documentName}</strong>
              </p>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 text-gray-900"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDocument(null);
                    setRejectionMessage('');
                  }}
                  className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject Document
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

