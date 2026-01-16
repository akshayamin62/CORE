import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// API functions
export const authAPI = {
  signup: (data: { name: string; email: string; role: string }) =>
    api.post('/auth/signup', data),
  
  verifySignupOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-signup-otp', data),
  
  login: (data: { email: string }) =>
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

export default api;

