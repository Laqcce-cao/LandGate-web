import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatUsageLogTime } from '../utils/time';
import clsx from 'clsx';
import { usageApi, type UsageLog } from '../api/admin/usage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DataTable } from '../components/ui/DataTable';
import { DatePicker } from '../components/ui/DatePicker';
import { Icon, type IconName } from '../components/ui/Icon';
import { useToastStore } from '../stores/toastStore';

type FilterType = 'all' | 'user' | 'key' | 'account';
type TimePreset = '7d' | '30d' | '90d' | 'custom';

const PRESETS: { key: TimePreset; label: string }[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近90天' },
  { key: 'custom', label: '自定义' },
];

const platformConfig: Record<string, { label: string; color: string }> = {
  ANTHROPIC: { label: 'Anthropic', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  OPENAI: { label: 'OpenAI', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  GEMINI: { label: 'Gemini', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ANTIGRAVITY: { label: 'Antigravity', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
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

function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: TimePreset): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);
  return { start: dateToStr(start), end: dateToStr(end) };
}

export default function AdminUsagePage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterId, setFilterId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [preset, setPreset] = useState<TimePreset>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const PAGE_SIZE = 20;

  const dateRange = useMemo(() => {
    if (preset === 'custom') {
      return { start: startDate || undefined, end: endDate || undefined };
    }
    return getPresetRange(preset);
  }, [preset, startDate, endDate]);

  const fetchUsagePage = useCallback((p: number, size: number) => {
    const id = Number(filterId);
    switch (filterType) {
      case 'user':
        return id ? usageApi.byUser(id, p, size, dateRange.start, dateRange.end) : usageApi.list(p, size, dateRange.start, dateRange.end);
      case 'key':
        return id ? usageApi.byApiKey(id, p, size, dateRange.start, dateRange.end) : usageApi.list(p, size, dateRange.start, dateRange.end);
      case 'account':
        return id ? usageApi.byAccount(id, p, size, dateRange.start, dateRange.end) : usageApi.list(p, size, dateRange.start, dateRange.end);
      default:
        return usageApi.list(p, size, dateRange.start, dateRange.end);
    }
  }, [filterType, filterId, dateRange]);

  const fetchAllUsageLogs = useCallback(async (size = 500) => {
    const allLogs: UsageLog[] = [];
    let p = 0;
    let totalFromApi = 0;

    while (true) {
      const res = await fetchUsagePage(p, size);
      const batch = res.data.logs ?? [];
      totalFromApi = res.data.total ?? 0;
      allLogs.push(...batch);
      if (batch.length < size || allLogs.length >= totalFromApi) break;
      p++;
    }

    return allLogs;
  }, [fetchUsagePage]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsagePage(page, PAGE_SIZE);
      setLogs(res.data.logs ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      addToast({ type: 'error', message: '加载用量日志失败' });
    } finally {
      setLoading(false);
    }
  }, [page, fetchUsagePage, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(0);
  }, [dateRange]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const allLogs = await fetchAllUsageLogs();

      const header = ['时间', '用户ID', 'API Key ID', '模型', '平台', '分组', '计费模式', '输入Token', '缓存读Token', '输出Token', '总Token', '费用(USD)', '倍率', '耗时(ms)', '首字耗时(ms)', 'IP地址'];
      const rows = allLogs.map((l) => [
        formatUsageLogTime(l.createdAt) ?? '',
        l.userId ?? '',
        l.apiKeyId ?? '',
        l.model ?? '',
        l.platform ?? '',
        l.groupId ?? '',
        l.billingMode ?? '',
        l.inputTokens ?? 0,
        l.cacheReadTokens ?? 0,
        l.outputTokens ?? 0,
        (l.inputTokens ?? 0) + (l.outputTokens ?? 0) + (l.cacheReadTokens ?? 0) + (l.cacheCreationTokens ?? 0),
        (l.totalCost ?? 0).toFixed(6),
        ((l.rateMultiplier ?? 1) * (l.accountRateMultiplier ?? 1)).toFixed(2),
        l.durationMs ?? 0,
        l.firstTokenMs ?? 0,
        l.ipAddress ?? '',
      ]);

      const csvContent = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `已导出 ${allLogs.length} 条记录` });
    } catch {
      addToast({ type: 'error', message: '导出失败' });
    } finally {
      setExporting(false);
    }
  };

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
      className: 'whitespace-nowrap text-xs text-gray-500 dark:text-dark-400',
      formatter: (val: unknown) => formatUsageLogTime(val),
    },
    {
      key: 'userId',
      label: '用户',
      className: 'whitespace-nowrap text-center',
      formatter: (val: unknown) => {
        const v = val as number;
        return v ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600 dark:bg-dark-800 dark:text-dark-300">
            <Icon name="user" size="sm" className="text-gray-400 dark:text-dark-500" />
            {v}
          </span>
        ) : <span className="text-gray-300 dark:text-dark-600">—</span>;
      },
    },
    {
      key: 'model',
      label: '模型',
      className: 'whitespace-nowrap text-sm font-medium text-gray-800 dark:text-dark-200',
      formatter: (val: unknown) => {
        const s = String(val ?? '—');
        return s.length > 32 ? s.slice(0, 30) + '…' : s;
      },
    },
    {
      key: 'platform',
      label: '平台',
      className: 'whitespace-nowrap',
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
      className: 'whitespace-nowrap text-center',
      formatter: (val: unknown) => {
        const v = val as number;
        return v ? <span className="text-sm text-gray-600 dark:text-dark-300">{v}</span> : <span className="text-gray-300 dark:text-dark-600">—</span>;
      },
    },
    {
      key: 'billingMode',
      label: '计费',
      className: 'whitespace-nowrap text-center',
      formatter: (val: unknown) => {
        const mode = String(val ?? '');
        if (!mode) return <span className="text-gray-300 dark:text-dark-600">—</span>;
        const isByToken = mode.toLowerCase().includes('token');
        return (
          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
            isByToken
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
              : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
          }`}>
            {mode}
          </span>
        );
      },
    },
    {
      key: 'inputTokens',
      label: '输入',
      className: 'whitespace-nowrap text-right tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm text-violet-600 dark:text-violet-400">{formatTokens(val)}</span>
      ),
    },
    {
      key: 'cacheReadTokens',
      label: '缓存读',
      className: 'whitespace-nowrap text-right tabular-nums',
      formatter: (val: unknown) => {
        const v = Number(val ?? 0);
        return v > 0
          ? <span className="text-sm text-purple-500 dark:text-purple-400">{formatTokens(v)}</span>
          : <span className="text-gray-300 dark:text-dark-600">—</span>;
      },
    },
    {
      key: 'outputTokens',
      label: '输出',
      className: 'whitespace-nowrap text-right tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm text-indigo-600 dark:text-indigo-400">{formatTokens(val)}</span>
      ),
    },
    {
      key: 'tokens',
      label: '合计',
      className: 'whitespace-nowrap text-right tabular-nums font-medium',
      formatter: (_: unknown, row: UsageLog) => {
        const total = (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadTokens ?? 0) + (row.cacheCreationTokens ?? 0);
        return <span className="text-sm text-gray-700 dark:text-dark-200">{formatTokens(total)}</span>;
      },
    },
    {
      key: 'duration',
      label: '耗时/首字',
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
      label: '费用',
      className: 'whitespace-nowrap text-right tabular-nums',
      formatter: (val: unknown) => (
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{formatCost(val)}</span>
      ),
    },
    {
      key: 'rateMultiplier',
      label: '倍率',
      className: 'whitespace-nowrap text-center',
      formatter: (_: unknown, row: UsageLog) => {
        const rate = Number(row.rateMultiplier ?? 1);
        const acctRate = Number(row.accountRateMultiplier ?? 1);
        const combined = rate * acctRate;
        if (combined === 1) return <span className="text-gray-300 dark:text-dark-600">—</span>;
        return (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
            combined > 1
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {combined.toFixed(1)}×
          </span>
        );
      },
    },
    {
      key: 'ipAddress',
      label: 'IP',
      className: 'whitespace-nowrap text-xs text-gray-400 dark:text-dark-500 font-mono',
      formatter: (val: unknown) => String(val ?? '—'),
    },
  ];

  const filterOptions: { value: FilterType; label: string; icon: IconName; placeholder: string }[] = [
    { value: 'all', label: '全部', icon: 'menu', placeholder: '' },
    { value: 'user', label: '用户', icon: 'user', placeholder: '输入用户 ID' },
    { value: 'key', label: 'API Key', icon: 'key', placeholder: '输入 API Key ID' },
    { value: 'account', label: '账号', icon: 'server', placeholder: '输入账号 ID' },
  ];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key)}
                className={clsx(
                  'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
                  preset === p.key
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && <div className="h-5 w-px bg-gray-200 dark:bg-dark-600" />}

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <DatePicker value={startDate} onChange={setStartDate} max={endDate || undefined} />
              <span className="text-xs text-gray-400 dark:text-dark-500">至</span>
              <DatePicker value={endDate} onChange={setEndDate} min={startDate || undefined} />
            </div>
          )}

          <div className="h-5 w-px bg-gray-200 dark:bg-dark-600" />

          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  filterType === opt.value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-dark-400 dark:hover:text-white'
                }`}
                onClick={() => { setFilterType(opt.value); setFilterId(''); setPage(0); }}
              >
                <Icon name={opt.icon} size="sm" />
                {opt.label}
              </button>
            ))}
          </div>

          {filterType !== 'all' && (
            <div className="flex items-center gap-2">
              <Input
                placeholder={filterOptions.find((o) => o.value === filterType)?.placeholder}
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-44"
              />
              <Button onClick={handleSearch} size="sm">
                <Icon name="search" size="sm" />
                查询
              </Button>
              {filterId && (
                <button
                  className="text-sm text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200"
                  onClick={() => { setFilterId(''); setPage(0); }}
                >
                  清除
                </button>
              )}
            </div>
          )}

          <div className="ml-auto">
            <Button variant="secondary" size="sm" onClick={handleExportCsv} loading={exporting}>
              <Icon name="download" size="xs" />
              导出 CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="card overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
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
                    {filterType === 'all' ? 'API 调用记录将在此处显示' : '未找到匹配的用量记录'}
                  </p>
                </div>
              </div>
            }
          />
        </div>

        {/* 分页 */}
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
