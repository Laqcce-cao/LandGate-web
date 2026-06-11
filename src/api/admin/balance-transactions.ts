import client from '../client';

/** 管理员侧余额流水，包含用户信息和真实收款金额。 */
export interface AdminBalanceTransaction {
  id: number;
  userId: number;
  userEmail?: string;
  transactionType?: string;
  fundingType?: string;
  amount: number;
  cashIncomeAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  operatorType?: string;
  operatorId?: string;
  remark?: string;
  status?: string;
  failureReason?: string;
  completedAt?: string;
  createdAt?: string;
}

/** 管理员余额流水分页响应。 */
export interface AdminBalanceTransactionListResponse {
  items: AdminBalanceTransaction[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AdminBalanceTransactionQuery {
  page?: number;
  size?: number;
  keyword?: string;
  transactionType?: string;
  fundingType?: string;
  status?: string;
}

export const adminBalanceTransactionsApi = {
  /** 查询全站用户余额流水。 */
  list: (params?: AdminBalanceTransactionQuery) =>
    client.get<AdminBalanceTransactionListResponse>('/admin/balance-transactions', { params }),
};
