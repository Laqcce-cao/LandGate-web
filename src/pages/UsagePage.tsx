import { useEffect, useState, useCallback, useMemo } from 'react';
import { usageApi, type UsageLog } from '../api/admin/usage';
import { DataTable } from '../components/ui/DataTable';
import { Icon } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

const platformConfig: Record<string, { label: string; color: string }> = {
  ANTHROPIC: { label: 'Anthropic', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  OPENAI: { label: 'OpenAI', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  GEMINI: { label: 'Gemini', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

function formatTokens(n: unknown): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString();
}

function formatCost(n: unknown): string {
  const v = Number(n ?? 0);
  if (v === 0) return '$0';
  if (v < 0.0001) return '<$0.0001';
  if (v < 0.01) return '$' + v.toFixed(6);
  return '$' + v.toFixed(4);
}

function formatDuration(ms: unknown): string {
  const v = Number(ms ?? 0);
  if (!v) return '—';
  if (v < 1000) return v + 'ms';
  return (v / 1000).toFixed(1) + 's';
}

function formatTime(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  let relative: string;
  if (diffMin < 1) relative = '刚刚';
  else if (diffMin < 60) relative = `${diffMin}分钟前`;
  else if (diffHr < 24) relative = `${diffHr}小时前`;
  else relative = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

  const full = d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  return `${full} (${relative})`;
}

type TimePreset = '7d' | '30d' | '90d' | 'custom';

const PRESETS: { key: TimePreset; label: string }[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近90天' },
  { key: 'custom', label: '自定义' },
];

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: TimePreset): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const start = new Date(end);
  start.setDate(end.getDate() - days);
  return { start: dateToStr(start), end: dateToStr(end) };
}

export default function UsagePage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statsLogs, setStatsLogs] = useState<UsageLog[]>([]);
  const [preset, setPreset] = useState<TimePreset>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  // Derive effective date range from preset or custom
  const dateRange = useMemo(() => {
    if (preset === 'custom') {
      let start = startDate || undefined;
      let end = endDate || undefined;
      // Adjust custom end date to be exclusive (matching preset behavior)
      // so the selected end date is included in results
      if (end) {
        const d = new Date(end + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        end = dateToStr(d);
      }
      return { start, end };
    }
    return getPresetRange(preset);
  }, [preset, startDate, endDate]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const size = 20;
      const res = await usageApi.myUsage(page, size, dateRange.start, dateRange.end);
      setLogs(res.data.logs ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载用量日志失败' });
    } finally {
      setLoading(false);
    }
  }, [page, dateRange, addToast]);

  // Fetch larger batch for summary stats
  useEffect(() => {
    usageApi.myUsage(0, 200, dateRange.start, dateRange.end)
      .then((res) => setStatsLogs(res.data.logs ?? []))
      .catch(() => {});
  }, [dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when date range changes
  useEffect(() => {
    setPage(0);
  }, [dateRange]);

  const stats = useMemo(() => {
    if (statsLogs.length === 0) return null;
    const totalTokens = statsLogs.reduce((s, l) => s + (l.inputTokens ?? 0) + (l.outputTokens ?? 0) + (l.cacheReadTokens ?? 0), 0);
    const totalCost = statsLogs.reduce((s, l) => s + (l.totalCost ?? 0), 0);
    const totalRequests = statsLogs.length;
    return { totalTokens, totalCost, totalRequests };
  }, [statsLogs]);

  const handlePresetChange = (p: TimePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const columns = [
    {
      key: 'createdAt',
      label: '时间',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center text-xs text-gray-500 dark:text-dark-400',
      formatter: (val: unknown) => formatTime(val),
    },
    {
      key: 'model',
      label: '模型',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center text-sm font-medium text-gray-800 dark:text-dark-200',
      formatter: (val: unknown) => {
        const s = String(val ?? '—');
        return s.length > 28 ? s.slice(0, 26) + '…' : s;
      },
    },
    {
      key: 'platform',
      label: '平台',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center',
      formatter: (val: unknown) => {
        const p = String(val ?? '');
        const cfg = platformConfig[p];
        return (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.color || 'bg-gray-100 text-gray-600 dark:bg-dark-800 dark:text-dark-400'}`}>
            {cfg?.label || p || '—'}
          </span>
        );
      },
    },
    {
      key: 'groupId',
      label: '分组',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center',
      formatter: (val: unknown) => {
        const v = val as number;
        return v ? <span className="text-sm text-gray-600 dark:text-dark-300">{v}</span> : <span className="text-gray-300 dark:text-dark-600">—</span>;
      },
    },
    {
      key: 'inputTokens',
      label: '输入',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm text-violet-600 dark:text-violet-400">{formatTokens(val)}</span>
      ),
    },
    {
      key: 'outputTokens',
      label: '输出',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm text-indigo-600 dark:text-indigo-400">{formatTokens(val)}</span>
      ),
    },
    {
      key: 'cacheReadTokens',
      label: '缓存命中',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm text-blue-600 dark:text-blue-400">{formatTokens(val)}</span>
      ),
    },
    {
      key: 'tokens',
      label: '总令牌',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center tabular-nums font-medium',
      formatter: (_: unknown, row: UsageLog) => {
        const total = (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadTokens ?? 0);
        return <span className="text-sm text-gray-700 dark:text-dark-200">{formatTokens(total)}</span>;
      },
    },
    {
      key: 'duration',
      label: '用时 / 首字',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center text-xs',
      formatter: (_: unknown, row: UsageLog) => {
        const dur = formatDuration(row.durationMs);
        const ttft = formatDuration(row.firstTokenMs);
        return (
          <span className="text-gray-500 dark:text-dark-400">
            {dur}<span className="mx-1 text-gray-300 dark:text-dark-600">/</span>{ttft}
          </span>
        );
      },
    },
    {
      key: 'totalCost',
      label: '花费',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{formatCost(val)}</span>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP',
      headerClassName: '!text-center',
      className: 'whitespace-nowrap text-center text-xs text-gray-400 dark:text-dark-500 font-mono',
      formatter: (val: unknown) => String(val ?? '—'),
    },
  ];

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Time range filter bar */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Preset buttons */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-dark-700 dark:bg-dark-800">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.key
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-auto text-xs"
              />
              <span className="text-xs text-gray-400">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-auto text-xs"
              />
            </div>
          )}

          {/* Active range indicator */}
          <span className="text-xs text-gray-400 dark:text-dark-500">
            {preset !== 'custom'
              ? PRESETS.find((p) => p.key === preset)?.label
              : (startDate || endDate ? `${startDate || '最早'} ~ ${endDate || '现在'}` : '全部')}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="card flex items-center gap-3 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Icon name="sparkles" size="sm" className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-dark-400">总令牌</p>
              <p className="text-base font-semibold text-gray-800 dark:text-dark-200">
                {formatTokens(stats.totalTokens)}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-3 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Icon name="dollar" size="sm" className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-dark-400">总花费</p>
              <p className="text-base font-semibold text-gray-800 dark:text-dark-200">
                {formatCost(stats.totalCost)}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-3 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Icon name="chartBar" size="sm" className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-dark-400">请求次数</p>
              <p className="text-base font-semibold text-gray-800 dark:text-dark-200">
                {stats.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-800">
                <Icon name="chart" size="xl" className="text-gray-300 dark:text-dark-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-dark-400">暂无使用记录</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">
                  发起 API 调用后将在此处显示用量明细
                </p>
              </div>
            </div>
          }
        />

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-dark-700">
          <span className="text-sm text-gray-500 dark:text-dark-400">
            共 {total.toLocaleString()} 条记录，第 {page + 1}/{totalPages || 1} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <Icon name="chevronLeft" size="sm" />
              上一页
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              下一页
              <Icon name="chevronRight" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
