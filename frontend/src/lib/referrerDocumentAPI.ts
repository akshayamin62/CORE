import api from './api';

export const referrerDocumentAPI = {
  seedDefaults: () => api.post('/referrer-documents/seed-defaults'),

  getMyFields: () => api.get('/referrer-documents/my-fields'),

  getMyDocuments: () => api.get('/referrer-documents/my-documents'),

  getFieldsByReferrer: (referrerId: string) =>
    api.get(`/referrer-documents/fields/by-referrer/${referrerId}`),

  getDocsByReferrer: (referrerId: string) =>
    api.get(`/referrer-documents/by-referrer/${referrerId}`),

  uploadDocument: (
    documentFieldId: string,
    documentKey: string,
    documentName: string,
    file: File
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentFieldId', documentFieldId);
    formData.append('documentKey', documentKey);
    formData.append('documentName', documentName);
    return api.post('/referrer-documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadDocumentForReferrer: (
    referrerId: string,
    documentFieldId: string,
    documentKey: string,
    documentName: string,
    file: File
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentFieldId', documentFieldId);
    formData.append('documentKey', documentKey);
    formData.append('documentName', documentName);
    return api.post(`/referrer-documents/upload/by-referrer/${referrerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  viewDocument: (documentId: string) =>
    api.get(`/referrer-documents/${documentId}/view`, {
      responseType: 'blob',
      timeout: 60000,
    }),

  approveDocument: (documentId: string) =>
    api.put(`/referrer-documents/${documentId}/approve`),

  rejectDocument: (documentId: string, rejectionMessage: string) =>
    api.put(`/referrer-documents/${documentId}/reject`, { rejectionMessage }),
};
