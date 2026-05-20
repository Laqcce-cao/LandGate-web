import client from '../client';

export interface Account {
  id: number;
  name: string;
  notes?: string;
  platform: string;
  type: string;
  credentials?: string;
  extra?: string;
  proxyId?: number;
  concurrency?: number;
  loadFactor?: number;
  priority?: number;
  rateMultiplier?: number;
  status: string;
  errorMessage?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  autoPauseOnExpired?: boolean;
  schedulable: boolean;
  rateLimitedAt?: string;
  rateLimitResetAt?: string;
  overloadUntil?: string;
  tempUnschedulableUntil?: string;
  tempUnschedulableReason?: string;
  sessionWindowStart?: string;
  sessionWindowEnd?: string;
  sessionWindowStatus?: string;
  supportedModels?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface AccountListResponse {
  accounts: Account[];
  total: number;
}

export const accountsApi = {
  list: () => client.get<AccountListResponse>('/admin/accounts'),
  getById: (id: number) => client.get<Account>(`/admin/accounts/${id}`),
  create: (data: Partial<Account>) => client.post<Account>('/admin/accounts', data),
  update: (id: number, data: Partial<Account>) => client.put<Account>(`/admin/accounts/${id}`, data),
  delete: (id: number) => client.delete(`/admin/accounts/${id}`),
  listByPlatform: (platform: string) =>
    client.get<AccountListResponse>(`/admin/accounts/platform/${platform}`),
  updateStatus: (id: number, status: string, errorMessage?: string) =>
    client.post(`/admin/accounts/${id}/status`, { status, errorMessage }),
  setSchedulable: (id: number, schedulable: boolean) =>
    client.post(`/admin/accounts/${id}/schedulable`, { schedulable }),
};
