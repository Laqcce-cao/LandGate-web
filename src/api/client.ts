import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification-code',
  '/auth/password-reset-code',
  '/auth/password-reset',
];

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => err.config?.url?.includes(ep));

    if (err.response?.status === 401 && !err.config._retry && !isAuthEndpoint) {
      err.config._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken,
          });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          err.config.headers.Authorization = `Bearer ${data.access_token}`;
          return client(err.config);
        } catch {
          // Refresh failed — clear and redirect
        }
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
