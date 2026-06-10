import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { checkinApi, type CheckinRecord, type CheckinStatusResponse } from '../api/checkin';
import { useToastStore } from '../stores/toastStore';

const PAGE_SIZE = 10;

function formatAmount(value: unknown): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN');
}

function statusLabel(status?: string): string {
  const normalized = status?.toUpperCase();
  if (normalized === 'COMPLETED') return '已完成';
  if (normalized === 'PENDING') return '处理中';
  if (normalized === 'FAILED') return '失败';
  return status || '—';
}

function buttonLabel(status: CheckinStatusResponse | null, checking: boolean): string {
  if (checking) return '签到中...';
  if (!status) return '立即签到';
  if (status.todayStatus === 'COMPLETED') return '今日已签到';
  if (status.todayStatus === 'PENDING') return '处理中...';
  if (status.todayStatus === 'FAILED') return '重试签到';
  return '立即签到';
}

export default function CheckinPage() {
  const [status, setStatus] = useState<CheckinStatusResponse | null>(null);
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchStatus = useCallback(async () => {
    const { data } = await checkinApi.getStatus();
    setStatus(data);
  }, []);

  const fetchRecords = useCallback(async () => {
    const { data } = await checkinApi.listRecords({ page, size: PAGE_SIZE });
    setRecords(data.items ?? []);
    setTotal(data.total ?? 0);
  }, [page]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStatus(), fetchRecords()]);
    } catch {
      addToast({ type: 'error', message: '加载签到信息失败' });
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, fetchRecords, addToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCheckin = async () => {
    if (!status?.canCheckin || checking) return;
    setChecking(true);
    try {
      const { data } = await checkinApi.checkin();
      addToast({
        type: 'success',
        message: data.alreadySigned
          ? '今日已签到'
          : `签到成功，获得 ${formatAmount(data.record.rewardAmount)}`,
      });
      await Promise.all([fetchStatus(), fetchRecords()]);
    } catch {
      addToast({ type: 'error', message: '签到失败，请稍后重试' });
      fetchStatus().catch(() => undefined);
    } finally {
      setChecking(false);
    }
  };

  const columns = [
    { key: 'signDate', label: '日期' },
    {
      key: 'streakDays',
      label: '连续天数',
      formatter: (value: unknown) => `第 ${Number(value ?? 0)} 天`,
    },
    {
      key: 'rewardAmount',
      label: '奖励',
      formatter: (value: unknown) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatAmount(value)}</span>,
    },
    {
      key: 'status',
      label: '状态',
      formatter: (value: unknown) => <StatusBadge status={String(value || 'PENDING')} label={statusLabel(String(value || ''))} />,
    },
    {
      key: 'createdAt',
      label: '签到时间',
      formatter: (value: unknown) => formatTime(String(value || '')),
    },
  ];

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeDay = Math.min(status?.streakDays || 0, 7);
  const canCheckin = Boolean(status?.canCheckin) && !checking;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-900/40 dark:from-violet-900/10 dark:to-indigo-900/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20">
              <Icon name="gift" size="md" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {status?.todayStatus === 'COMPLETED' ? '今日已签到' : status?.todayStatus === 'FAILED' ? '签到失败' : '每日签到'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-dark-400">
                已连续签到 <span className="font-semibold text-violet-600 dark:text-violet-300">{status?.streakDays ?? 0}</span> 天
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge variant="success">今日奖励 {formatAmount(status?.todayReward ?? 0)}</Badge>
                <Badge variant="purple">明日继续 {formatAmount(status?.nextReward ?? 0)}</Badge>
              </div>
            </div>
          </div>
          <Button onClick={handleCheckin} disabled={!canCheckin} loading={checking} size="lg">
            {buttonLabel(status, checking)}
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">7 天奖励进度</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">连续第 7 天起每日保持最高奖励。</p>
          </div>
          {activeDay >= 7 && <Badge variant="purple">已达最高奖励</Badge>}
        </div>
        <div className="grid gap-3 sm:grid-cols-7">
          {(status?.rewardRules ?? []).map((rule) => {
            const active = activeDay >= rule.day;
            return (
              <div
                key={rule.day}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  active
                    ? 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20'
                    : 'border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800'
                }`}
              >
                <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-dark-700'}`}>
                  {rule.day}
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-400">第 {rule.day} 天</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(rule.reward)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Icon name="gift" size="xl" />}
              title="暂无签到记录"
              description="完成每日签到后会在这里展示记录。"
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
