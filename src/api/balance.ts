import client from './client';

/** 用户侧余额明细，来源于 balance_transactions 中当前用户的低频余额变动记录。 */
export interface BalanceTransaction {
  id: number;
  transactionType: string;
  fundingType?: string;
  amount: number;
  balanceAfter?: number;
  remark?: string;
  status: string;
  completedAt?: string;
  createdAt?: string;
}

/** 后端通用分页响应，items 为当前页余额明细。 */
export interface BalanceTransactionListResponse {
  items: BalanceTransaction[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export const balanceApi = {
  /** 查询当前登录用户的余额明细。 */
  listTransactions: (params?: { page?: number; size?: number }) =>
    client.get<BalanceTransactionListResponse>('/balance/transactions', { params }),
};
