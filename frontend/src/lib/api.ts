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

export const adminAPI = {
  getUsers: (params?: {
    role?: string;
    isVerified?: boolean;
    isActive?: boolean;
    search?: string;
  }) => api.get('/admin/users', { params }),
  
  getStats: () => api.get('/admin/stats'),
  
  getPendingApprovals: () => api.get('/admin/pending'),
  
  approveUser: (userId: string) => api.post(`/admin/users/${userId}/approve`),
  
  rejectUser: (userId: string, reason?: string) => 
    api.post(`/admin/users/${userId}/reject`, { reason }),
  
  toggleUserStatus: (userId: string) => 
    api.patch(`/admin/users/${userId}/toggle-status`),
  
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  createCounselor: (data: {
    name: string;
    email: string;
    phoneNumber?: string;
    specializations?: string[];
  }) => api.post('/admin/counselors', data),
  
  getCounselors: () => api.get('/admin/counselors'),
  
  assignCounselors: (registrationId: string, data: {
    primaryCounselorId?: string;
    secondaryCounselorId?: string;
  }) => api.post(`/admin/students/registrations/${registrationId}/assign-counselors`, data),
  
  switchActiveCounselor: (registrationId: string, activeCounselorId: string) =>
    api.post(`/admin/students/registrations/${registrationId}/switch-active-counselor`, { activeCounselorId }),
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
  getCounselorPrograms: () => api.get('/programs/counselor/programs'),
  createProgram: (data: any) => api.post('/programs/counselor/programs', data),
  uploadProgramsExcel: (file: File, studentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (studentId) {
      formData.append('studentId', studentId);
    }
    return api.post('/programs/counselor/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getCounselorStudentPrograms: (studentId: string) => api.get(`/programs/counselor/student/${studentId}/programs`),
  createCounselorStudentProgram: (studentId: string, data: any) => api.post(`/programs/counselor/student/${studentId}/programs`, data),
  uploadCounselorStudentProgramsExcel: (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post(`/programs/counselor/student/${studentId}/programs/upload-excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Admin functions
  getAdminStudentPrograms: (studentId: string, section?: string) => {
    const params = section ? { section } : {};
    return api.get(`/programs/admin/student/${studentId}/programs`, { params });
  },
  getStudentAppliedPrograms: (studentId: string) => api.get(`/programs/admin/student/${studentId}/applied-programs`),
  updateProgramSelection: (programId: string, data: { priority: number; intake: string; year: string }) => 
    api.put(`/programs/admin/programs/${programId}/selection`, data),
  createAdminProgram: (studentId: string, data: any) => api.post('/programs/admin/programs/create', { ...data, studentId }),
  uploadAdminProgramsExcel: (file: File, studentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);
    return api.post('/programs/admin/programs/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
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

