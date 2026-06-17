/**
 * API base URL for axios calls.
 * Use NEXT_PUBLIC_API_URL=/api with ngrok (single tunnel + Next.js rewrites).
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
}

/**
 * Backend origin for /uploads and static assets.
 * When API is relative (/api), uses the current browser origin (ngrok URL on mobile).
 */
export function getBackendUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) return 'http://localhost:5000';
  if (apiUrl.startsWith('http')) return apiUrl.replace(/\/api$/, '');
  if (typeof window !== 'undefined') return window.location.origin;

  return 'http://localhost:3000';
}
