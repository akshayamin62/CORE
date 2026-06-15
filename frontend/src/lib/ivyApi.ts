import axios from 'axios';

// Base URL for the Ivy League API endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const IVY_API_URL = `${API_URL}/ivy`;

// Backend base URL for static file serving (uploads, documents)
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '')
  : 'http://localhost:5000';

const ivyApi = axios.create({
  baseURL: IVY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const IVY_UPLOAD_TIMEOUT_MS = 120000;

// Add auth token to requests; fix multipart uploads for large PDFs
ivyApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Let the browser set multipart boundary — manual Content-Type breaks large uploads
    if (config.headers) {
      delete config.headers['Content-Type'];
    }
    if (!config.timeout || config.timeout <= 30000) {
      config.timeout = IVY_UPLOAD_TIMEOUT_MS;
    }
  }

  return config;
});

// Helper to construct full file URLs
export const getFileUrl = (path: string) => `${BACKEND_URL}${path}`;

export default ivyApi;
