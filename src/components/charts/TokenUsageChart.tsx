import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { UsageLog, UsageListResponse } from '../../api/admin/usage';
import { Select } from '../ui/Select';
import { Tabs } from '../ui/Tabs';
import { Skeleton } from '../ui/Skeleton';
import { Icon } from '../ui/Icon';
import { useThemeStore } from '../../stores/themeStore';
import { useToastStore } from '../../stores/toastStore';

interface TokenUsageData {
  label: string;       // display label on X axis (e.g. "5/15", "3月")
  timestamp: number;   // for sorting
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
}

interface TokenUsageChartProps {
  fetchLogs: (page: number, size: number) => Promise<{ data: UsageListResponse }>;
  title?: string;
}

type TimeMode = '7d' | '30d' | '3m' | '6m';

const MODES: { key: TimeMode; label: string }[] = [
  { key: '7d',  label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '3m',  label: '近3月' },
  { key: '6m',  label: '近6月' },
];

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Aggregate logs into day buckets (for 7d / 30d).
 * Zeros are filled for days with no data.
 */
function aggregateByDay(logs: UsageLog[], days: number, selectedModel: string): TokenUsageData[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);

  // Create empty buckets for every day
  const buckets: TokenUsageData[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    buckets.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      timestamp: d.getTime(),
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  for (const log of logs) {
    if (!log.createdAt) continue;
    const logDate = new Date(log.createdAt);
    if (logDate < cutoff) continue;
    if (selectedModel !== '__all__' && (log.model || 'unknown') !== selectedModel) continue;

    const idx = Math.floor((logDate.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
    if (idx < 0 || idx >= days) continue;

    buckets[idx].inputTokens     += log.inputTokens ?? 0;
    buckets[idx].outputTokens    += log.outputTokens ?? 0;
    buckets[idx].cacheReadTokens += log.cacheReadTokens ?? 0;
  }

  return buckets;
}

/**
 * Aggregate logs into month buckets (for 3m / 6m).
 * Zeros are filled for months with no data.
 */
function aggregateByMonth(logs: UsageLog[], months: number, selectedModel: string): TokenUsageData[] {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  cutoff.setHours(0, 0, 0, 0);

  const buckets: TokenUsageData[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(cutoff.getFullYear(), cutoff.getMonth() + i, 1);
    buckets.push({
      label: `${d.getMonth() + 1}月`,
      timestamp: d.getTime(),
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  for (const log of logs) {
    if (!log.createdAt) continue;
    const logDate = new Date(log.createdAt);
    if (logDate < cutoff) continue;
    if (selectedModel !== '__all__' && (log.model || 'unknown') !== selectedModel) continue;

    const idx =
      (logDate.getFullYear() - cutoff.getFullYear()) * 12 +
      (logDate.getMonth() - cutoff.getMonth());
    if (idx < 0 || idx >= months) continue;

    buckets[idx].inputTokens     += log.inputTokens ?? 0;
    buckets[idx].outputTokens    += log.outputTokens ?? 0;
    buckets[idx].cacheReadTokens += log.cacheReadTokens ?? 0;
  }

  return buckets;
}

function CustomTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const nameMap: Record<string, string> = {
    cacheReadTokens: '缓存命中',
    inputTokens: '输入令牌',
    outputTokens: '输出令牌',
  };

  const colors: Record<string, string> = {
    cacheReadTokens: isDark ? '#93c5fd' : '#60a5fa',
    inputTokens:     isDark ? '#3b82f6' : '#2563eb',
    outputTokens:    isDark ? '#60a5fa' : '#3b82f6',
  };

  return (
    <div className="card rounded-lg px-3 py-2 text-xs shadow-lg border border-gray-100 dark:border-dark-700">
      <p className="mb-1 font-medium text-gray-800 dark:text-dark-200">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-gray-600 dark:text-dark-400">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colors[entry.dataKey] || '#888' }}
          />
          <span>{nameMap[entry.dataKey] || entry.dataKey}:</span>
          <span className="tabular-nums font-medium text-gray-800 dark:text-dark-200">
            {formatCompactNumber(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TokenUsageChart({ fetchLogs, title = 'Token 用量' }: TokenUsageChartProps) {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeMode, setTimeMode] = useState<TimeMode>('7d');
  const [selectedModel, setSelectedModel] = useState('__all__');
  const theme = useThemeStore((s) => s.theme);
  const addToast = useToastStore((s) => s.addToast);
  const isDark = theme === 'dark';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchLogs(0, 200);
      setLogs(res.data.logs ?? []);
    } catch {
      setError(true);
      addToast({ type: 'error', message: '加载用量数据失败' });
    } finally {
      setLoading(false);
    }
  }, [fetchLogs, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Determine if we're in day mode or month mode
  const isDayMode = timeMode === '7d' || timeMode === '30d';
  const days = timeMode === '7d' ? 7 : timeMode === '30d' ? 30 : 0;
  const months = timeMode === '3m' ? 3 : timeMode === '6m' ? 6 : 0;

  const chartData = useMemo(() => {
    if (isDayMode) {
      return aggregateByDay(logs, days, selectedModel);
    }
    return aggregateByMonth(logs, months, selectedModel);
  }, [logs, isDayMode, days, months, selectedModel]);

  // Build model options for the dropdown
  const modelOptions = useMemo(() => {
    const modelSet = new Set<string>();
    for (const l of logs) {
      const m = (l.model || 'unknown').trim();
      if (m) modelSet.add(m);
    }
    const options = [{ value: '__all__', label: '全部模型' }];
    for (const m of Array.from(modelSet).sort()) {
      options.push({ value: m, label: m.length > 22 ? m.slice(0, 20) + '…' : m });
    }
    return options;
  }, [logs]);

  const colors = {
    cacheReadTokens: isDark ? '#93c5fd' : '#60a5fa',
    inputTokens:     isDark ? '#3b82f6' : '#2563eb',
    outputTokens:    isDark ? '#60a5fa' : '#3b82f6',
  };

  // Total tokens from ALL fetched logs (not time-filtered), matches UsagePage stats
  const totalTokens = useMemo(() => {
    let total = 0;
    for (const l of logs) {
      if (selectedModel !== '__all__' && (l.model || 'unknown') !== selectedModel) continue;
      total += (l.inputTokens ?? 0) + (l.outputTokens ?? 0) + (l.cacheReadTokens ?? 0);
    }
    return total;
  }, [logs, selectedModel]);

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const timeTabs = MODES.map((m) => ({ key: m.key, label: m.label }));
  const timeLabel = MODES.find((m) => m.key === timeMode)?.label || '';

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Skeleton className="mb-1 h-6 w-44" />
          <Skeleton className="mb-6 h-4 w-64" />
          <div className="mb-4 flex items-center gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <div className="ml-auto">
              <Skeleton className="h-8 w-36" />
            </div>
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <Icon name="xCircle" size="xl" className="text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-dark-400">加载图表数据失败</p>
          <button className="btn btn-secondary btn-sm mt-1" onClick={fetchData}>
            重试
          </button>
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-800">
            <Icon name="chart" size="xl" className="text-gray-300 dark:text-dark-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-dark-400">暂无 Token 使用记录</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-500">
              发起 API 调用后将在此处展示用量图表
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Controls row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs items={timeTabs} activeKey={timeMode} onChange={(k) => setTimeMode(k as TimeMode)} />
          <Select
            options={modelOptions}
            value={selectedModel}
            onChange={setSelectedModel}
            className="w-44"
          />
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactNumber}
              width={50}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  cacheReadTokens: '缓存命中',
                  inputTokens: '输入令牌',
                  outputTokens: '输出令牌',
                };
                return <span style={{ color: axisColor }}>{map[value] || value}</span>;
              }}
            />
            <Bar dataKey="inputTokens"     stackId="tokens" fill={colors.inputTokens}     name="inputTokens"     barSize={isDayMode ? 24 : 32} />
            <Bar dataKey="outputTokens"    stackId="tokens" fill={colors.outputTokens}    name="outputTokens"    barSize={isDayMode ? 24 : 32} />
            <Bar dataKey="cacheReadTokens" stackId="tokens" fill={colors.cacheReadTokens} name="cacheReadTokens" barSize={isDayMode ? 24 : 32} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  };

  return (
    <div className="card p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-dark-400">
        {loading || error || logs.length === 0
          ? '各时段 Token 消耗分布'
          : `共 ${formatCompactNumber(totalTokens)} tokens（${timeLabel}）`}
      </p>
      {renderContent()}
    </div>
  );
}
