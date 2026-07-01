import type { B2BDocumentConfigField } from './b2bDocumentsConfig';

export const REFERRER_DOCUMENTS_CONFIG: B2BDocumentConfigField[] = [
  {
    documentKey: 'pan_card',
    documentName: 'PAN Copy',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload a clear copy of your PAN card',
    order: 1,
  },
  {
    documentKey: 'aadhar_card',
    documentName: 'Aadhaar Copy',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload a clear copy of your Aadhaar card',
    order: 2,
  },
  {
    documentKey: 'cancelled_cheque',
    documentName: 'Cancelled Cheque / Bank Proof',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload cancelled cheque or bank account proof',
    order: 3,
  },
  {
    documentKey: 'passport_photo',
    documentName: 'Passport-size Photograph',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload a recent passport-size photograph',
    order: 4,
  },
  {
    documentKey: 'gst_certificate',
    documentName: 'GST Certificate (if applicable)',
    section: 'KYC Documents',
    required: false,
    helpText: 'Upload GST registration certificate if applicable',
    order: 5,
  },
  {
    documentKey: 'signed_code_of_conduct',
    documentName: 'Signed Code of Conduct',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload the signed code of conduct document',
    order: 6,
  },
  {
    documentKey: 'signed_confidentiality',
    documentName: 'Signed Confidentiality Undertaking',
    section: 'KYC Documents',
    required: true,
    helpText: 'Upload the signed confidentiality undertaking',
    order: 7,
  },
];

export const REFERRER_DOC_SECTION_ORDER: B2BDocumentConfigField['section'][] = ['KYC Documents'];

export const REFERRER_PREDEFINED_DOC_KEYS = new Set(
  REFERRER_DOCUMENTS_CONFIG.map((d) => d.documentKey)
);
