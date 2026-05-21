import client from '../client';

export interface AdminApiKey {
  id: number;
  userId: number;
  key: string;
  name: string;
  groupId: number | null;
  status: string;
  lastUsedAt: string | null;
  ipWhitelist: string | null;
  ipBlacklist: string | null;
  quota: number;
  quotaUsed: number;
  expiresAt: string | null;
  rateLimit5h: number;
  usage5h: number;
  window5hStart: string | null;
  rateLimit1d: number;
  usage1d: number;
  window1dStart: string | null;
  rateLimit7d: number;
  usage7d: number;
  window7dStart: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyAdminRequest {
  name: string;
  groupId?: number;
  quota?: number;
  rateLimit5h?: number;
  rateLimit1d?: number;
  rateLimit7d?: number;
  ipWhitelist?: string;
  ipBlacklist?: string;
  expiresAt?: string;
  status?: string;
}

export interface UpdateApiKeyAdminRequest {
  name?: string;
  groupId?: number;
  quota?: number;
  rateLimit5h?: number;
  rateLimit1d?: number;
  rateLimit7d?: number;
  ipWhitelist?: string;
  ipBlacklist?: string;
  expiresAt?: string;
  status?: string;
}

export const adminApiKeysApi = {
  list: () => client.get<AdminApiKey[]>('/admin/api-keys'),

  create: (data: CreateApiKeyAdminRequest) =>
    client.post<AdminApiKey>('/admin/api-keys', data),

  update: (id: number, data: UpdateApiKeyAdminRequest) =>
    client.put<AdminApiKey>(`/admin/api-keys/${id}`, data),

  delete: (id: number) => client.delete(`/admin/api-keys/${id}`),
};
