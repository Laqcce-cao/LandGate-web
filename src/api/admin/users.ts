import client from '../client';

export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  username: string;
  role: string;
  status: string;
  balance: number;
  concurrency: number;
  rpmLimit: number;
  notes?: string;
  signupSource: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export const usersApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string }) =>
    client.get<UserListResponse>('/admin/users', { params }),
  getById: (id: number) => client.get<User>(`/admin/users/${id}`),
  update: (id: number, data: Partial<User>) => client.put<User>(`/admin/users/${id}`, data),
  updateStatus: (id: number, status: string) =>
    client.post(`/admin/users/${id}/status`, { status }),
  recharge: (id: number, amount: number) =>
    client.post<User>(`/admin/users/${id}/recharge`, { amount }),
};
