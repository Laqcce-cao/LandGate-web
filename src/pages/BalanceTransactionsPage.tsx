import { useCallback, useEffect, useState } from 'react';
import { balanceApi, type BalanceTransaction } from '../api/balance';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToastStore } from '../stores/toastStore';

const PAGE_SIZE = 20;

function formatAmount(value: unknown): string {
  const amount = Number(value ?? 0);
  const sign = amount > 0 ? '+' : '';
  return `${sign}$${amount.toFixed(2)}`;
}

function amountClass(value: unknown): string {
  const amount = Number(value ?? 0);
  if (amount < 0) return 'font-semibold text-red-600 dark:text-red-400';
  return 'font-semibold text-emerald-600 dark:text-emerald-400';
}

function formatBalance(value: unknown): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

function transactionTypeLabel(type?: string): string {
  const normalized = type?.toUpperCase();
  if (normalized === 'RECHARGE') return '在线充值';
  if (normalized === 'ADMIN_RECHARGE') return '线下充值';
  if (normalized === 'ADMIN_GRANT') return '赠送补偿';
  if (normalized === 'CHECKIN_REWARD') return '签到奖励';
  if (normalized === 'REFUND') return '退款返还';
  if (normalized === 'ADMIN_DEDUCT') return '管理员扣减';
  if (normalized === 'ADJUSTMENT') return '系统调整';
  return type || '—';
}

function statusLabel(status?: string): string {
  const normalized = status?.toUpperCase();
  if (normalized === 'COMPLETED') return '已完成';
  if (normalized === 'PENDING') return '处理中';
  if (normalized === 'FAILED') return '失败';
  return status || '—';
}

export default function BalanceTransactionsPage() {
  const [records, setRecords] = useState<BalanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await balanceApi.listTransactions({ page, size: PAGE_SIZE });
      setRecords(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载余额明细失败' });
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const columns = [
    {
      key: 'createdAt',
      label: '时间',
      formatter: (_: unknown, row: BalanceTransaction) => formatTime(row.completedAt || row.createdAt),
    },
    {
      key: 'transactionType',
      label: '类型',
      formatter: (value: unknown) => <Badge variant="gray">{transactionTypeLabel(String(value || ''))}</Badge>,
    },
    {
      key: 'amount',
      label: '变动金额',
      formatter: (value: unknown) => <span className={amountClass(value)}>{formatAmount(value)}</span>,
    },
    {
      key: 'balanceAfter',
      label: '变动后余额',
      formatter: formatBalance,
    },
    {
      key: 'remark',
      label: '备注',
      formatter: (value: unknown) => String(value || '—'),
    },
    {
      key: 'status',
      label: '状态',
      formatter: (value: unknown) => <StatusBadge status={String(value || 'PENDING')} label={statusLabel(String(value || ''))} />,
    },
  ];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-900/40 dark:from-violet-900/10 dark:to-indigo-900/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20">
            <Icon name="dollar" size="md" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">余额明细</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-dark-400">
              查看你的低频余额变动来源，包括充值到账、赠送补偿、签到奖励、退款返还和余额调整。
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Icon name="dollar" size="xl" />}
              title="暂无余额明细"
              description="余额发生充值、赠送或调整后会在这里展示。"
            />
          }
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-dark-700">
            <span className="text-sm text-gray-500 dark:text-dark-400">
              共 {total} 条记录，第 {page + 1}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
