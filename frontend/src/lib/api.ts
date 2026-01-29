import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const customError = new Error('Unable to connect to server. Please check if the backend is running.');
      customError.name = 'NetworkError';
      (customError as any).isNetworkError = true;
      return Promise.reject(customError);
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const customError = new Error('Request timeout. The server is taking too long to respond.');
      customError.name = 'TimeoutError';
      (customError as any).isTimeout = true;
      return Promise.reject(customError);
    }
    
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  signup: (data: { name: string; email: string; role: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/signup', data),
  
  verifySignupOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-signup-otp', data),
  
  login: (data: { email: string; captcha: string; captchaInput: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  getProfile: () =>
    api.get('/auth/profile'),
};

export const superAdminAPI = {
  getUsers: (params?: {
    role?: string;
    isVerified?: boolean;
    isActive?: boolean;
    search?: string;
  }) => api.get('/super-admin/users', { params }),
  
  getStats: () => api.get('/super-admin/stats'),
  
  getPendingApprovals: () => api.get('/super-admin/pending'),
  
  approveUser: (userId: string) => api.post(`/super-admin/users/${userId}/approve`),
  
  rejectUser: (userId: string, reason?: string) => 
    api.post(`/super-admin/users/${userId}/reject`, { reason }),
  
  toggleUserStatus: (userId: string) => 
    api.patch(`/super-admin/users/${userId}/toggle-status`),
  
  deleteUser: (userId: string) => api.delete(`/super-admin/users/${userId}`),
  
  createOps: (data: {
    name: string;
    email: string;
    phoneNumber?: string;
  }) => api.post('/super-admin/ops', data),
  
  createAdmin: (data: {
    name: string;
    email: string;
    phoneNumber?: string;
  }) => api.post('/super-admin/admin', data),
  
  createUserByRole: (data: {
    name: string;
    email: string;
    phoneNumber?: string;
    role: string;
    adminId?: string;
    customSlug?: string;
  }) => api.post('/super-admin/user', data),
  
  getOps: () => api.get('/super-admin/ops'),
  
  getAdmins: () => api.get('/super-admin/admins'),
  
  assignOps: (registrationId: string, data: {
    primaryOpsId?: string;
    secondaryOpsId?: string;
  }) => api.post(`/super-admin/students/registrations/${registrationId}/assign-ops`, data),
  
  switchActiveOps: (registrationId: string, activeOpsId: string) =>
    api.post(`/super-admin/students/registrations/${registrationId}/switch-active-ops`, { activeOpsId }),
};

// Service API
export const serviceAPI = {
  getAllServices: () => api.get('/services/services'),
  
  getMyServices: () => api.get('/services/my-services'),
  
  registerForService: (serviceId: string) => 
    api.post('/services/register', { serviceId }),
  
  getServiceForm: (serviceId: string) => 
    api.get(`/services/services/${serviceId}/form`),
  
  getRegistrationDetails: (registrationId: string) => 
    api.get(`/services/registrations/${registrationId}`),
};

// Form Answer API
export const formAnswerAPI = {
  saveFormAnswers: (data: {
    registrationId: string;
    partKey: string;
    sectionId?: string;
    answers: any;
    completed?: boolean;
  }) => api.post('/forms/save', data),
  
  getFormAnswers: (registrationId: string, partKey?: string) => 
    api.get(`/forms/registrations/${registrationId}/answers`, { 
      params: partKey ? { partKey } : undefined 
    }),
  
  getProgress: (registrationId: string) => 
    api.get(`/forms/registrations/${registrationId}/progress`),
  
  deleteFormAnswers: (answerId: string) => 
    api.delete(`/forms/answers/${answerId}`),
};

// Student API
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  
  updateProfile: (data: any) => api.put('/student/profile', data),
  
  deleteProfile: () => api.delete('/student/profile'),
};

// Program API
export const programAPI = {
  getStudentPrograms: () => api.get('/programs/student/programs'),
  selectProgram: (data: { programId: string; priority: number; intake: string; year: string }) =>
    api.post('/programs/student/programs/select', data),
  removeProgram: (programId: string) => api.delete(`/programs/student/programs/${programId}`),
  createStudentProgram: (data: any) => api.post('/programs/student/programs/create', data),
  getOpsPrograms: () => api.get('/programs/ops/programs'),
  createProgram: (data: any) => api.post('/programs/ops/programs', data),
  uploadProgramsExcel: (file: File, studentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (studentId) {
      formData.append('studentId', studentId);
    }
    return api.post('/programs/ops/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getOpsStudentPrograms: (studentId: string) => api.get(`/programs/ops/student/${studentId}/programs`),
  createOpsStudentProgram: (studentId: string, data: any) => api.post(`/programs/ops/student/${studentId}/programs`, data),
  uploadOpsStudentProgramsExcel: (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post(`/programs/ops/student/${studentId}/programs/upload-excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Super Admin functions
  getSuperAdminStudentPrograms: (studentId: string, section?: string) => {
    const params = section ? { section } : {};
    return api.get(`/programs/super-admin/student/${studentId}/programs`, { params });
  },
  getStudentAppliedPrograms: (studentId: string) => api.get(`/programs/super-admin/student/${studentId}/applied-programs`),
  updateProgramSelection: (programId: string, data: { priority: number; intake: string; year: string }) => 
    api.put(`/programs/super-admin/programs/${programId}/selection`, data),
  createSuperAdminProgram: (studentId: string, data: any) => api.post('/programs/super-admin/programs/create', { ...data, studentId }),
  uploadSuperAdminProgramsExcel: (file: File, studentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post('/programs/super-admin/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Admin API (for ADMIN role)
export const adminAPI = {
  createCounselor: (data: {
    name: string;
    email: string;
    mobileNumber?: string;
  }) => api.post('/admin/counselor', data),
  
  getCounselors: () => api.get('/admin/counselors'),
  
  toggleCounselorStatus: (counselorId: string) => 
    api.patch(`/admin/counselor/${counselorId}/toggle-status`),
};

// Lead API
export const leadAPI = {
  // Public endpoints (no auth required)
  getAdminInfoBySlug: (adminSlug: string) => 
    api.get(`/public/enquiry/${adminSlug}/info`),
  
  submitEnquiry: (adminSlug: string, data: {
    name: string;
    email: string;
    mobileNumber: string;
    serviceType: string;
  }) => api.post(`/public/enquiry/${adminSlug}/submit`, data),
  
  // Admin endpoints
  getAdminLeads: (params?: {
    stage?: string;
    serviceType?: string;
    assignedCounselorId?: string;
  }) => api.get('/admin/leads', { params }),
  
  getEnquiryFormUrl: () => api.get('/admin/enquiry-form-url'),
  
  getAdminCounselors: () => api.get('/admin/counselors'),
  
  assignLeadToCounselor: (leadId: string, counselorId: string | null) => 
    api.post(`/admin/leads/${leadId}/assign`, { counselorId }),
  
  // Counselor endpoints
  getCounselorLeads: (params?: {
    stage?: string;
    serviceType?: string;
  }) => api.get('/counselor/leads', { params }),
  
  getCounselorEnquiryFormUrl: () => api.get('/counselor/enquiry-form-url'),
  
  // Shared endpoints (admin and counselor)
  getLeadDetail: (leadId: string) => api.get(`/leads/${leadId}`),
  
  updateLeadStage: (leadId: string, stage: string) => 
    api.patch(`/leads/${leadId}/stage`, { stage }),
  
  addLeadNote: (leadId: string, text: string) => 
    api.post(`/leads/${leadId}/notes`, { text }),
  
  // Super Admin endpoints
  getAllLeads: (params?: {
    status?: string;
    serviceType?: string;
    adminId?: string;
  }) => api.get('/super-admin/leads', { params }),
};

// Follow-Up API
export const followUpAPI = {
  // Create a new follow-up
  createFollowUp: (data: {
    leadId: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    notes?: string;
  }) => api.post('/follow-ups', data),

  // Get all follow-ups (for calendar)
  getFollowUps: (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => api.get('/follow-ups', { params }),

  // Get follow-up summary (today, missed, upcoming)
  getFollowUpSummary: () => api.get('/follow-ups/summary'),

  // Get single follow-up by ID
  getFollowUpById: (followUpId: string) => api.get(`/follow-ups/${followUpId}`),

  // Update follow-up (complete/reschedule)
  updateFollowUp: (followUpId: string, data: {
    status?: string;
    stageChangedTo?: string;
    notes?: string;
    nextFollowUp?: {
      scheduledDate: string;
      scheduledTime: string;
      duration: number;
    };
  }) => api.patch(`/follow-ups/${followUpId}`, data),

  // Get follow-up history for a lead
  getLeadFollowUpHistory: (leadId: string) => api.get(`/follow-ups/lead/${leadId}/history`),

  // Check time slot availability
  checkTimeSlotAvailability: (params: {
    date: string;
    time: string;
    duration: number;
    excludeFollowUpId?: string;
  }) => api.get('/follow-ups/check-availability', { params }),
};

export const chatAPI = {
  // Get or create chat for a program
  getOrCreateChat: (programId: string) => api.get(`/chat/program/${programId}/chat`),
  
  // Get all messages for a program
  getMessages: (programId: string) => api.get(`/chat/program/${programId}/messages`),
  
  // Send a message
  sendMessage: (programId: string, message: string) => 
    api.post(`/chat/program/${programId}/messages`, { message }),
  
  // Get all chats for current user
  getMyChatsList: () => api.get('/chat/my-chats'),
};

export default api;


