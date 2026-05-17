import client from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  captchaToken: string;
  username?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
  emailVerified: boolean;
  balance: number;
  concurrency: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface CreateApiKeyRequest {
  name: string;
  groupId?: number;
}

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  status: string;
  groupId?: number;
  createdAt?: string;
}

export const authApi = {
  login: (data: LoginRequest) => client.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => client.post<RegisterResponse>('/auth/register', data),
  verifyEmail: (email: string, code: string) =>
    client.post<{ message: string }>('/auth/verify-email', { email, code }),
  resendVerificationCode: (email: string) =>
    client.post<{ message: string }>('/auth/resend-verification-code', { email }),
  updatePassword: (oldPassword: string, newPassword: string) =>
    client.put<{ message: string }>('/auth/password', { oldPassword, newPassword }),
  updateUsername: (username: string) =>
    client.put<{ message: string; username: string }>('/auth/username', { username }),
  me: () => client.get<User>('/auth/me'),
  listApiKeys: () => client.get<ApiKey[]>('/auth/api-keys'),
  createApiKey: (data: { name: string; groupId?: number }) =>
    client.post<ApiKey>('/auth/api-keys', data),
  deleteApiKey: (id: number) => client.delete(`/auth/api-keys/${id}`),
};
