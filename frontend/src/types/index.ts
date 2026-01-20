export enum USER_ROLE {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  COUNSELOR = 'COUNSELOR',
  ALUMNI = 'ALUMNI',
  ADMIN = 'ADMIN',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: USER_ROLE | string;
  isVerified: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  _id: string;
  userId: string;
  mobileNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
}

// Service Types
export interface Service {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon?: string;
  isActive: boolean;
  order: number;
}

export interface Counselor {
  _id: string;
  userId: string;
  email: string;
  mobileNumber?: string;
  specializations?: string[];
}

export interface StudentServiceRegistration {
  _id: string;
  studentId: string;
  serviceId: Service | string;
  primaryCounselorId?: Counselor | string;
  secondaryCounselorId?: Counselor | string;
  activeCounselorId?: Counselor | string;
  status: 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  registeredAt: string;
  completedAt?: string;
  cancelledAt?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  notes?: string;
}

// Form Types
export enum FormPartKey {
  PROFILE = 'PROFILE',
  APPLICATION = 'APPLICATION',
  DOCUMENT = 'DOCUMENT',
  PAYMENT = 'PAYMENT',
}

export enum FieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  PHONE = 'PHONE',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  CITY = 'CITY',
}

export interface FormField {
  _id: string;
  subSectionId: string;
  label: string;
  key: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  isActive: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{
    label: string;
    value: string;
  }>;
  defaultValue?: any;
}

export interface FormSubSection {
  _id: string;
  sectionId: string;
  title: string;
  description?: string;
  order: number;
  isRepeatable: boolean;
  isActive: boolean;
  maxRepeat?: number;
  fields: FormField[];
}

export interface FormSection {
  _id: string;
  serviceId: string;
  partId: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  subSections: FormSubSection[];
}

export interface FormPart {
  _id: string;
  key: FormPartKey;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface FormStructure {
  part: FormPart;
  order: number;
  sections: FormSection[];
}

export interface StudentFormAnswer {
  _id: string;
  studentServiceId: string;
  partKey: string;
  sectionId?: string;
  answers: any;
  completed: boolean;
  lastSavedAt: string;
  completedAt?: string;
}

