import client from './client';

/** 用户侧充值记录，来源于 payment_orders 中当前用户的余额订单。 */
export interface RechargeRecord {
  id: number;
  amount: number;
  payAmount?: number;
  paymentType?: string;
  status: string;
  outTradeNo?: string;
  paymentTradeNo?: string;
  providerKey?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt?: string;
}

/** 后端通用分页响应，items 为当前页充值记录。 */
export interface RechargeRecordListResponse {
  items: RechargeRecord[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export const paymentApi = {
  /** 查询当前登录用户的充值记录。 */
  listRechargeRecords: (params?: { page?: number; size?: number }) =>
    client.get<RechargeRecordListResponse>('/payment/recharge-records', { params }),
};
