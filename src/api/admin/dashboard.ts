import client from '../client';

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_orders: number;
  completed_orders: number;
}

export interface RevenueSummary {
  total_revenue: number;
  completed_orders_count: number;
}

export interface UserUsageSummary {
  userId: number;
  username: string;
  email: string;
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

export interface DashboardOverview {
  totalApiKeys: number;
  activeApiKeys: number;
  totalAccounts: number;
  normalAccounts: number;
  errorAccounts: number;
  todayRequests: number;
  totalRequests: number;
  newUsersToday: number;
  totalUsers: number;
  todayTokens: number;
  todayCost: number;
  totalTokens: number;
  totalCost: number;
  avgDurationMs: number;
  rpm: number;
}

export interface ModelStats {
  model: string;
  totalTokens: number;
  totalCost: number;
  callCount: number;
}

export interface PlatformDailyStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  callCount: number;
}

export interface UserDailyStats {
  userId: number;
  date: string;
  totalTokens: number;
}

export const dashboardApi = {
  stats: () => client.get<DashboardStats>('/admin/dashboard/stats'),
  revenue: () => client.get<RevenueSummary>('/admin/dashboard/revenue'),
  userUsage: (params: {
    period: 'today' | 'month';
    sortBy?: 'totalCost' | 'totalTokens';
  }) => client.get<UserUsageSummary[]>('/admin/dashboard/user-usage', { params }),
  overview: () => client.get<DashboardOverview>('/admin/dashboard/overview'),
  modelDistribution: (params?: { days?: number }) =>
    client.get<ModelStats[]>('/admin/dashboard/model-distribution', { params }),
  tokenTrend: (params?: { days?: number }) =>
    client.get<PlatformDailyStats[]>('/admin/dashboard/token-trend', { params }),
  userTrend: (params?: { days?: number; topN?: number }) =>
    client.get<UserDailyStats[]>('/admin/dashboard/user-trend', { params }),
};
