import client from '../client';

export interface UserDashboardOverview {
  totalRequests: number;
  todayRequests: number;
  totalTokens: number;
  totalCost: number;
  todayTokens: number;
  todayCost: number;
  avgDailyTokens: number;
  avgDailyRequests: number;
  avgDurationMs: number;
  rpm: number;
}

export interface UserModelStats {
  model: string;
  totalTokens: number;
  totalCost: number;
  callCount: number;
}

export interface UserTokenTrend {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  callCount: number;
}

export type TimeRangeParams =
  | { days: number }
  | { start: string; end: string };

export const userDashboardApi = {
  overview: () => client.get<UserDashboardOverview>('/user/dashboard/overview'),
  modelDistribution: (params: TimeRangeParams) =>
    client.get<UserModelStats[]>('/user/dashboard/model-distribution', { params }),
  tokenTrend: (params: TimeRangeParams) =>
    client.get<UserTokenTrend[]>('/user/dashboard/token-trend', { params }),
};
