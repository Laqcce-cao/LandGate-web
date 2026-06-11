import { useCallback, useEffect, useState } from 'react';
import {
  adminBalanceTransactionsApi,
  type AdminBalanceTransaction,
} from '../../api/admin/balance-transactions';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToastStore } from '../../stores/toastStore';

const PAGE_SIZE = 20;

const TRANSACTION_TYPE_OPTIONS = [
  { value: '', label: '全部业务类型' },
  { value: 'RECHARGE', label: '在线充值' },
  { value: 'ADMIN_RECHARGE', label: '线下充值' },
  { value: 'ADMIN_GRANT', label: '赠送补偿' },
  { value: 'CHECKIN_REWARD', label: '签到奖励' },
  { value: 'REFUND', label: '退款返还' },
  { value: 'ADMIN_DEDUCT', label: '管理员扣减' },
  { value: 'ADJUSTMENT', label: '系统调整' },
];

const FUNDING_TYPE_OPTIONS = [
  { value: '', label: '全部资金性质' },
  { value: 'PAID', label: '付费余额' },
  { value: 'GIFT', label: '赠送余额' },
  { value: 'REFUND', label: '退款返还' },
  { value: 'DEDUCT', label: '扣减' },
  { value: 'ADJUSTMENT', label: '系统调整' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '处理中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
];

function formatMoney(value: unknown): string {
  const amount = Number(value ?? 0);
  const absAmount = Math.abs(amount);
  const precision = absAmount !== 0 && absAmount < 0.01 ? 8 : 2;
  return `$${absAmount.toFixed(precision)}`;
}

function formatSignedAmount(value: unknown): string {
  const amount = Number(value ?? 0);
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatMoney(amount)}`;
}

function amountClass(value: unknown): string {
  const amount = Number(value ?? 0);
  if (amount < 0) return 'font-semibold text-red-600 dark:text-red-400';
  if (amount > 0) return 'font-semibold text-emerald-600 dark:text-emerald-400';
  return 'font-semibold text-gray-500 dark:text-dark-400';
}

function formatBalance(value: unknown): string {
  if (value == null) return '—';
  return formatMoney(value);
}

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

function labelOf(options: { value: string; label: string }[], value?: string): string {
  return options.find((item) => item.value === value)?.label || value || '—';
}

function transactionBadgeVariant(type?: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' {
  const normalized = type?.toUpperCase();
  if (normalized === 'RECHARGE' || normalized === 'ADMIN_RECHARGE') return 'success';
  if (normalized === 'ADMIN_GRANT' || normalized === 'CHECKIN_REWARD') return 'purple';
  if (normalized === 'ADMIN_DEDUCT') return 'danger';
  if (normalized === 'REFUND') return 'warning';
  if (normalized === 'ADJUSTMENT') return 'primary';
  return 'gray';
}

function fundingBadgeVariant(type?: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' {
  const normalized = type?.toUpperCase();
  if (normalized === 'PAID') return 'success';
  if (normalized === 'GIFT') return 'purple';
  if (normalized === 'REFUND') return 'warning';
  if (normalized === 'DEDUCT') return 'danger';
  if (normalized === 'ADJUSTMENT') return 'primary';
  return 'gray';
}

function statusLabel(status?: string): string {
  const normalized = status?.toUpperCase();
  if (normalized === 'COMPLETED') return '已完成';
  if (normalized === 'PENDING') return '处理中';
  if (normalized === 'FAILED') return '失败';
  return status || '—';
}

export default function BalanceTransactionsAdminPage() {
  const [records, setRecords] = useState<AdminBalanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [fundingType, setFundingType] = useState('');
  const [status, setStatus] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: PAGE_SIZE,
        ...(keyword ? { keyword } : {}),
        ...(transactionType ? { transactionType } : {}),
        ...(fundingType ? { fundingType } : {}),
        ...(status ? { status } : {}),
      };
      const { data } = await adminBalanceTransactionsApi.list(params);
      setRecords(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载余额流水失败' });
    } finally {
      setLoading(false);
    }
  }, [page, keyword, transactionType, fundingType, status, addToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(0);
  }, [transactionType, fundingType, status]);

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setTransactionType('');
    setFundingType('');
    setStatus('');
    setPage(0);
  };

  const columns = [
    {
      key: 'createdAt',
      label: '时间',
      className: 'whitespace-nowrap text-xs text-gray-500 dark:text-dark-400',
      formatter: (_: unknown, row: AdminBalanceTransaction) => formatTime(row.completedAt || row.createdAt),
    },
    {
      key: 'userId',
      label: '用户',
      className: 'min-w-[180px]',
      formatter: (_: unknown, row: AdminBalanceTransaction) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900 dark:text-white">ID: {row.userId}</div>
          <div className="text-xs text-gray-500 dark:text-dark-400">{row.userEmail || '—'}</div>
        </div>
      ),
    },
    {
      key: 'transactionType',
      label: '业务类型',
      className: 'whitespace-nowrap',
      formatter: (value: unknown) => {
        const type = String(value || '');
        return <Badge variant={transactionBadgeVariant(type)}>{labelOf(TRANSACTION_TYPE_OPTIONS, type)}</Badge>;
      },
    },
    {
      key: 'fundingType',
      label: '资金性质',
      className: 'whitespace-nowrap',
      formatter: (value: unknown) => {
        const type = String(value || '');
        return <Badge variant={fundingBadgeVariant(type)}>{labelOf(FUNDING_TYPE_OPTIONS, type)}</Badge>;
      },
    },
    {
      key: 'amount',
      label: '余额变动',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      formatter: (value: unknown) => <span className={amountClass(value)}>{formatSignedAmount(value)}</span>,
    },
    {
      key: 'cashIncomeAmount',
      label: '真实收款',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      formatter: (value: unknown) => <span className={amountClass(value)}>{formatSignedAmount(value)}</span>,
    },
    {
      key: 'balanceAfter',
      label: '余额变化',
      className: 'whitespace-nowrap text-xs text-gray-500 dark:text-dark-400',
      formatter: (_: unknown, row: AdminBalanceTransaction) => (
        <span>{formatBalance(row.balanceBefore)} → {formatBalance(row.balanceAfter)}</span>
      ),
    },
    {
      key: 'operatorId',
      label: '操作人',
      className: 'whitespace-nowrap text-xs text-gray-500 dark:text-dark-400',
      formatter: (_: unknown, row: AdminBalanceTransaction) => (
        <span>{row.operatorType || '—'}{row.operatorId ? ` / ${row.operatorId}` : ''}</span>
      ),
    },
    {
      key: 'remark',
      label: '备注',
      className: 'min-w-[160px] max-w-[260px] text-sm text-gray-600 dark:text-dark-300',
      formatter: (_: unknown, row: AdminBalanceTransaction) => row.failureReason || row.remark || '—',
    },
    {
      key: 'status',
      label: '状态',
      className: 'whitespace-nowrap',
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
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">管理员余额流水</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-dark-400">
              查看全站低频余额变动来源，并区分余额增加与真实现金收入。
            </p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px_auto]">
          <Input
            placeholder="搜索用户ID / 邮箱"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Select options={TRANSACTION_TYPE_OPTIONS} value={transactionType} onChange={setTransactionType} />
          <Select options={FUNDING_TYPE_OPTIONS} value={fundingType} onChange={setFundingType} />
          <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Icon name="search" size="sm" />
              查询
            </Button>
            <Button variant="secondary" onClick={clearFilters}>重置</Button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Icon name="dollar" size="xl" />}
              title="暂无余额流水"
              description="管理员充值、赠送、扣减或用户签到奖励发生后会在这里展示。"
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
