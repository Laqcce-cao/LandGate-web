import client from './client';

export interface RewardRule {
  day: number;
  reward: number;
}

export interface CheckinRecord {
  id: number;
  signDate: string;
  streakDays: number;
  rewardAmount: number;
  status: string;
  balanceTransactionId?: number;
  createdAt?: string;
}

export interface CheckinStatusResponse {
  today: string;
  signedToday: boolean;
  canCheckin: boolean;
  todayStatus: string;
  streakDays: number;
  todayReward: number;
  nextReward: number;
  rewardRules: RewardRule[];
  todayRecord?: CheckinRecord | null;
}

export interface CheckinResultResponse {
  alreadySigned: boolean;
  record: CheckinRecord;
}

export interface CheckinRecordListResponse {
  items: CheckinRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export const checkinApi = {
  getStatus: () => client.get<CheckinStatusResponse>('/checkin/status'),
  checkin: () => client.post<CheckinResultResponse>('/checkin'),
  listRecords: (params?: { page?: number; size?: number }) =>
    client.get<CheckinRecordListResponse>('/checkin/records', { params }),
};
