import getEnvVars from '@/constants/config';
import { store } from '@/store';
import { auth } from '@/config/firebase';
import { ApiResponseError } from '@/services/apiResponse';
import axios from 'axios';

const { apiUrl } = getEnvVars();

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  async (config) => {
    const state = store.getState();
    const token = auth.currentUser
      ? await auth.currentUser.getIdToken()
      : state.auth.token;
    // Keep an explicitly supplied fresh token (for example, immediately after
    // Firebase phone linking) instead of replacing it with the Redux snapshot.
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// The backend wraps successful and failed JSON responses in ApiResponse.
// Unwrap successful payloads for existing service methods and reject logical
// failures even when the server returns a 2xx status.
api.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && typeof body.success === 'boolean' && 'data' in body) {
    if (!body.success) {
      return Promise.reject(new ApiResponseError(
        typeof body.msg === 'string' ? body.msg : 'The request could not be completed.',
        response.status,
        body,
      ));
    }
    response.data = body.data;
  }
  return response;
});

export default api;
