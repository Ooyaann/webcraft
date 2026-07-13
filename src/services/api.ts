import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useStore } from '../store/useStore';

// Klien API. Otentikasi lewat cookie httpOnly (di-set server) — token tidak
// pernah disentuh JS, jadi aman dari pencurian XSS. withCredentials wajib
// agar cookie ikut terkirim (same-origin).
const API_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Refresh otomatis saat 401 (cookie-based) ------------------------------
type QueueEntry = {
  resolve: () => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
let pendingQueue: QueueEntry[] = [];

const flushQueue = (error: unknown) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(),
  );
  pendingQueue = [];
};

const forceLogout = () => {
  // Bersihkan sisa penanda lama (token tidak lagi disimpan di sini).
  try {
    localStorage.removeItem('webcraft_token');
    localStorage.removeItem('webcraft_refresh');
  } catch { /* SSR / storage tak tersedia */ }
  // Reset store state (logout) secara lokal tanpa hard redirect
  try {
    useStore.getState().logout();
  } catch { /* SSR / store tak tersedia */ }
};

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/register') ||
  url.includes('/auth/refresh') || url.includes('/auth/logout');

// Bentuk error validasi FastAPI/zod: {detail: [{loc, msg, type}]}
type ValidationItem = { loc?: (string | number)[]; msg: string; type?: string };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: unknown }>) => {
    // Normalize FastAPI 422 validation array errors to a clean string
    if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
      const formattedErrors = (error.response.data.detail as ValidationItem[]).map(d => {
        const fieldName = d.loc && d.loc.length > 0 ? d.loc[d.loc.length - 1] : '';
        let message = d.msg;
        if (fieldName === 'password' && d.type === 'string_too_short') {
          message = 'minimal 8 karakter';
        } else if (fieldName === 'email' && d.type === 'value_error') {
          message = 'format email tidak valid';
        }
        return fieldName ? `${fieldName}: ${message}` : message;
      });
      error.response.data.detail = formattedErrors.join(', ');
    }

    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    // Sebuah refresh sedang berjalan — antre sampai selesai lalu ulangi.
    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => api(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Cookie refresh dikirim otomatis; server memutar & men-set cookie baru.
      await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      flushQueue(null);
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
