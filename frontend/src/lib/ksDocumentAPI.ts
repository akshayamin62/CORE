import api from './api';
import { DocumentCategory } from '@/types';

export const ksDocumentAPI = {
  // Get KS document fields for a specific student
  getKSDocumentFields: (registrationId: string) => {
    return api.get(`/ks-documents/${registrationId}`);
  },

  // Add new KS document field (Admin/OPS only)
  addKSDocumentField: (
    registrationId: string,
    documentName: string,
    category: DocumentCategory,
    required: boolean = false,
    helpText?: string,
    allowMultiple?: boolean
  ) => {
    return api.post('/ks-documents/add', {
      registrationId,
      documentName,
      category,
      required,
      helpText,
      allowMultiple,
    });
  },

  // Delete KS document field (Admin/OPS only)
  deleteKSDocumentField: (fieldId: string) => {
    return api.delete(`/ks-documents/${fieldId}`);
  },
};

