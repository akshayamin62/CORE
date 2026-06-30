import type { AxiosError } from 'axios';

export async function blobErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  const ax = error as AxiosError<Blob | { message?: string }>;
  const data = ax.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as { message?: string; success?: boolean };
      if (json.message) return json.message;
    } catch {
      /* not JSON */
    }
  }

  if (data && typeof data === 'object' && 'message' in data && data.message) {
    return String(data.message);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
