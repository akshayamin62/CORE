'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getBackendUrl } from '@/lib/apiConfig';

async function fetchFileBlob(path: string, responseType: 'blob' | 'arraybuffer' = 'blob') {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return axios.get(path, {
    baseURL: getBackendUrl(),
    timeout: 60000,
    responseType,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** Axios instance for file fetches — baseURL resolved at request time for mobile/Capacitor */
export const fileApi = axios.create({ timeout: 60000 });

fileApi.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Fetches a file from the backend as an authenticated blob and returns a local object URL.
 */
export function useBlobUrl(path: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    const fetchBlob = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetchFileBlob(path);
        if (!cancelled) {
          const url = URL.createObjectURL(res.data);
          objectUrls.push(url);
          setBlobUrl(url);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlob();

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [path]);

  return { blobUrl, loading, error };
}

export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await fetchFileBlob(path);
  return URL.createObjectURL(res.data);
}
