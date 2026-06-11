import client from '../client';

export interface PaymentOrder {
  id: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  userNotes?: string;
  amount: number;
  payAmount?: number;
  feeRate?: number;
  rechargeCode?: string;
  outTradeNo?: string;
  paymentType: string;
  paymentTradeNo?: string;
  payUrl?: string;
  qrCode?: string;
  qrCodeImg?: string;
  orderType: string;
  planId?: number;
  subscriptionGroupId?: number;
  subscriptionDays?: number;
  providerInstanceId?: number;
  providerKey?: string;
  providerSnapshot?: Record<string, unknown>;
  status: string;
  refundAmount?: number;
  refundReason?: string;
  refundAt?: string;
  forceRefund?: boolean;
  refundRequestedAt?: string;
  refundRequestReason?: string;
  refundRequestedBy?: number;
  expiresAt?: string;
  paidAt?: string;
  completedAt?: string;
  failedAt?: string;
  failedReason?: string;
  clientIp?: string;
  srcHost?: string;
  srcUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentListResponse {
  orders: PaymentOrder[];
  total: number;
  page: number;
  size: number;
}

export interface PaymentDetailResponse {
  order: PaymentOrder;
  audit_logs: unknown[];
}

export const paymentsApi = {
  list: (params?: { status?: string; page?: number; size?: number }) =>
    client.get<PaymentListResponse>('/admin/payments', { params }),
  getById: (orderId: number) =>
    client.get<PaymentDetailResponse>(`/admin/payments/${orderId}`),
  confirm: (orderId: number, tradeNo: string, payAmount: number) =>
    client.post(`/admin/payments/${orderId}/confirm`, { tradeNo, payAmount }),
  refund: (orderId: number, reason: string, forceRefund?: boolean) =>
    client.post(`/admin/payments/${orderId}/refund`, { reason, forceRefund }),
  getPendingRefunds: () =>
    client.get<PaymentListResponse>('/admin/payments/refunds/pending'),
  getLogs: (orderId: number) =>
    client.get(`/admin/payments/${orderId}/logs`),
};
