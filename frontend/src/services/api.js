import axios from 'axios';

// Create Axios instance
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('webcraft_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Real API without mock
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if unauthorized and token exists, meaning token is expired/invalid
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('webcraft_token');
      // Dispatch event or just let UI handle it
    }
    return Promise.reject(error);
  }
);

export default api;
