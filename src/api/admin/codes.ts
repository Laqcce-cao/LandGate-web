import client from '../client';

export interface RedeemCode {
  id: number;
  code: string;
  type: string;
  amount: number;
  groupId?: number;
  subscriptionDays?: number;
  maxUses?: number;
  usedCount: number;
  boundUserId?: number;
  enabled: boolean;
  expiresAt?: string;
  createdBy?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoCode {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  usedCount: number;
  maxUsesPerUser?: number;
  enabled: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdBy?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CodeListResponse<T> {
  codes: T[];
  total: number;
}

export const codesApi = {
  // Redeem codes
  listRedeem: () => client.get<CodeListResponse<RedeemCode>>('/admin/codes/redeem'),
  createRedeem: (data: Partial<RedeemCode>) =>
    client.post<RedeemCode>('/admin/codes/redeem', data),
  updateRedeem: (id: number, data: Partial<RedeemCode>) =>
    client.put(`/admin/codes/redeem/${id}`, data),
  deleteRedeem: (id: number) => client.delete(`/admin/codes/redeem/${id}`),

  // Promo codes
  listPromo: () => client.get<CodeListResponse<PromoCode>>('/admin/codes/promo'),
  createPromo: (data: Partial<PromoCode>) =>
    client.post<PromoCode>('/admin/codes/promo', data),
  updatePromo: (id: number, data: Partial<PromoCode>) =>
    client.put(`/admin/codes/promo/${id}`, data),
  deletePromo: (id: number) => client.delete(`/admin/codes/promo/${id}`),
};
