import api from './api';
import { DocumentCategory } from '@/types';

export const coreDocumentAPI = {
  // Get CORE document fields for a specific student
  getCOREDocumentFields: (registrationId: string) => {
    return api.get(`/core-documents/${registrationId}`);
  },

  // Add new CORE document field (Admin/OPS only)
  addCOREDocumentField: (
    registrationId: string,
    documentName: string,
    category: DocumentCategory,
    required: boolean = false,
    helpText?: string,
    allowMultiple?: boolean
  ) => {
    return api.post('/core-documents/add', {
      registrationId,
      documentName,
      category,
      required,
      helpText,
      allowMultiple,
    });
  },

  // Delete CORE document field (Admin/OPS only)
  deleteCOREDocumentField: (fieldId: string) => {
    return api.delete(`/core-documents/${fieldId}`);
  },
};

