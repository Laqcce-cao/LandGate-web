import client from '../client';

export interface UsageLog {
  id: number;
  userId?: number;
  apiKeyId?: number;
  accountId?: number;
  groupId?: number;
  subscriptionId?: number;
  requestId?: string;
  model?: string;
  platform?: string;
  requestedModel?: string;
  upstreamModel?: string;
  billingMode?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  inputCost?: number;
  outputCost?: number;
  cacheCreationCost?: number;
  cacheReadCost?: number;
  totalCost?: number;
  actualCost?: number;
  rateMultiplier?: number;
  accountRateMultiplier?: number;
  stream?: boolean;
  durationMs?: number;
  firstTokenMs?: number;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: string;
}

export interface UsageListResponse {
  logs: UsageLog[];
  total: number;
  page: number;
  size: number;
}

/** 按天聚合的用量统计 */
export interface DailyUsageStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  callCount: number;
}

export const usageApi = {
  list: (page = 0, size = 20) =>
    client.get<UsageListResponse>('/admin/usage', { params: { page, size } }),
  myUsage: (page = 0, size = 20, start?: string, end?: string) =>
    client.get<UsageListResponse>('/user/usage/my', {
      params: { page, size, ...(start ? { start } : {}), ...(end ? { end } : {}) },
    }),
  byUser: (userId: number, page = 0, size = 20) =>
    client.get<UsageListResponse>(`/admin/usage/user/${userId}`, { params: { page, size } }),
  byApiKey: (apiKeyId: number, page = 0, size = 20) =>
    client.get<UsageListResponse>(`/admin/usage/key/${apiKeyId}`, { params: { page, size } }),
  byAccount: (accountId: number, page = 0, size = 20) =>
    client.get<UsageListResponse>(`/admin/usage/account/${accountId}`, { params: { page, size } }),

  /** 按天聚合当前用户的 Token 用量统计（7d / 30d） */
  dailyStats: (start: string, end: string) =>
    client.get<DailyUsageStats[]>('/user/usage/my/stats', { params: { start, end } }),
};
