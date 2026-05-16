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

export const dashboardApi = {
  stats: () => client.get<DashboardStats>('/admin/dashboard/stats'),
  revenue: () => client.get<RevenueSummary>('/admin/dashboard/revenue'),
};
