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

export const dashboardApi = {
  stats: () => client.get<DashboardStats>('/admin/dashboard/stats'),
  revenue: () => client.get<RevenueSummary>('/admin/dashboard/revenue'),
  userUsage: (params: {
    period: 'today' | 'month';
    sortBy?: 'totalCost' | 'totalTokens';
  }) => client.get<UserUsageSummary[]>('/admin/dashboard/user-usage', { params }),
};
