import { useCallback, useEffect, useState } from 'react';
import { paymentApi, type RechargeRecord } from '../api/payment';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToastStore } from '../stores/toastStore';

const PAGE_SIZE = 20;

function formatAmount(value: unknown): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

function paymentTypeLabel(type?: string): string {
  const normalized = type?.toUpperCase();
  if (normalized === 'MANUAL') return '管理员充值';
  if (normalized === 'ALIPAY') return '支付宝';
  if (normalized === 'WXPAY') return '微信支付';
  if (normalized === 'STRIPE') return 'Stripe';
  if (normalized === 'EASYPAY') return 'EasyPay';
  if (normalized === 'AIRWALLEX') return 'Airwallex';
  return type || '—';
}

function statusLabel(status?: string): string {
  const normalized = status?.toUpperCase();
  if (normalized === 'COMPLETED') return '已到账';
  if (normalized === 'PAID') return '已支付';
  if (normalized === 'PENDING') return '待支付';
  if (normalized === 'REFUNDING') return '退款中';
  if (normalized === 'REFUNDED') return '已退款';
  if (normalized === 'EXPIRED') return '已过期';
  if (normalized === 'CANCELLED') return '已取消';
  return status || '—';
}

export default function RechargeRecordsPage() {
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentApi.listRechargeRecords({ page, size: PAGE_SIZE });
      setRecords(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载充值记录失败' });
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
      formatter: (_: unknown, row: RechargeRecord) => formatTime(row.completedAt || row.paidAt || row.createdAt),
    },
    {
      key: 'amount',
      label: '金额',
      formatter: formatAmount,
      className: 'font-semibold text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'paymentType',
      label: '类型',
      formatter: (value: unknown) => <Badge variant="gray">{paymentTypeLabel(String(value || ''))}</Badge>,
    },
    {
      key: 'status',
      label: '状态',
      formatter: (value: unknown) => <StatusBadge status={String(value || 'PENDING')} label={statusLabel(String(value || ''))} />,
    },
    {
      key: 'outTradeNo',
      label: '订单号',
      formatter: (value: unknown) => <span className="font-mono text-xs">{String(value || '—')}</span>,
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
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">充值记录</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-dark-400">
              查看你的余额充值订单，包括在线充值和管理员手动充值到账记录。
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
              title="暂无充值记录"
              description="充值到账后会在这里展示记录。"
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
