import { useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import { dashboardApi, type DashboardStats, type RevenueSummary, type UserUsageSummary } from '../api/admin/dashboard';
import { paymentsApi, type PaymentOrder } from '../api/admin/payments';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { useToastStore } from '../stores/toastStore';

type SortBy = 'totalCost' | 'totalTokens';

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-orange-500 to-red-600',
];

function UserAvatar({ name, id, size }: { name: string; id: number; size?: 'sm' | 'md' }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const sizeClass = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs';
  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${AVATAR_COLORS[id % AVATAR_COLORS.length]} font-semibold text-white shadow-sm`}
    >
      {initial}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return <span className="text-lg">🥇</span>;
  if (rank === 1) return <span className="text-lg">🥈</span>;
  if (rank === 2) return <span className="text-lg">🥉</span>;
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-dark-700 dark:text-dark-400">
      {rank + 1}
    </span>
  );
}

interface LeaderboardProps {
  title: string;
  data: UserUsageSummary[];
  loading: boolean;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  valueFormatter: (item: UserUsageSummary) => string;
  emptyText: string;
}

function Leaderboard({ title, data, loading, sortBy, onSortChange, valueFormatter, emptyText }: LeaderboardProps) {
  const tabs: { key: SortBy; label: string }[] = [
    { key: 'totalCost', label: '消费金额' },
    { key: 'totalTokens', label: '使用 Token' },
  ];

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>

      <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-dark-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={clsx(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              sortBy === tab.key
                ? 'bg-white text-violet-600 shadow-sm dark:bg-dark-600 dark:text-violet-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200'
            )}
            onClick={() => onSortChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400 dark:text-dark-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((item, idx) => {
            const displayName = item.username || item.email || '未知用户';
            return (
              <div
                key={item.userId}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-dark-800',
                  idx < 3 && 'bg-amber-50/40 dark:bg-amber-900/10'
                )}
              >
                <div className="flex w-6 items-center justify-center">
                  <RankBadge rank={idx} />
                </div>
                <UserAvatar name={displayName} id={item.userId} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-500 truncate">{item.email}</p>
                </div>
                <span className={clsx(
                  'text-sm font-semibold tabular-nums shrink-0',
                  sortBy === 'totalCost'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-violet-600 dark:text-violet-400'
                )}>
                  {valueFormatter(item)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const [todayData, setTodayData] = useState<UserUsageSummary[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todaySortBy, setTodaySortBy] = useState<SortBy>('totalCost');

  const [monthData, setMonthData] = useState<UserUsageSummary[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthSortBy, setMonthSortBy] = useState<SortBy>('totalCost');

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      dashboardApi.revenue(),
      paymentsApi.list({ size: 5 }),
      dashboardApi.userUsage({ period: 'today', sortBy: 'totalCost' }),
      dashboardApi.userUsage({ period: 'month', sortBy: 'totalCost' }),
    ])
      .then(([statsRes, revRes, ordersRes, todayRes, monthRes]) => {
        setStats(statsRes.data);
        setRevenue(revRes.data);
        setRecentOrders(ordersRes.data.orders ?? []);
        setTodayData(todayRes.data);
        setMonthData(monthRes.data);
      })
      .catch(() => {
        addToast({ type: 'error', message: '加载仪表盘数据失败' });
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const fetchTodayUsage = (sortBy: SortBy) => {
    setTodaySortBy(sortBy);
    setTodayLoading(true);
    dashboardApi
      .userUsage({ period: 'today', sortBy })
      .then((res) => setTodayData(res.data))
      .catch(() => addToast({ type: 'error', message: '加载今日排行失败' }))
      .finally(() => setTodayLoading(false));
  };

  const fetchMonthUsage = (sortBy: SortBy) => {
    setMonthSortBy(sortBy);
    setMonthLoading(true);
    dashboardApi
      .userUsage({ period: 'month', sortBy })
      .then((res) => setMonthData(res.data))
      .catch(() => addToast({ type: 'error', message: '加载本月排行失败' }))
      .finally(() => setMonthLoading(false));
  };

  const formatCost = (item: UserUsageSummary) => `$${Number(item.totalCost).toFixed(4)}`;

  const formatTokens = (item: UserUsageSummary) => {
    const t = item.totalTokens;
    if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(2)}M`;
    if (t >= 1_000) return `${(t / 1_000).toFixed(1)}K`;
    return String(t);
  };

  const todaySummary = useMemo(() => {
    const totalCost = todayData.reduce((s, u) => s + Number(u.totalCost), 0);
    const totalTokens = todayData.reduce((s, u) => s + u.totalTokens, 0);
    return { totalCost, totalTokens };
  }, [todayData]);

  const monthSummary = useMemo(() => {
    const totalCost = monthData.reduce((s, u) => s + Number(u.totalCost), 0);
    const totalTokens = monthData.reduce((s, u) => s + u.totalTokens, 0);
    return { totalCost, totalTokens };
  }, [monthData]);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-6 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总用户数"
          value={(stats?.total_users ?? 0).toLocaleString()}
          icon={<Icon name="users" size="lg" />}
          iconVariant="primary"
        />
        <StatCard
          title="活跃用户"
          value={(stats?.active_users ?? 0).toLocaleString()}
          icon={<Icon name="user" size="lg" />}
          iconVariant="success"
        />
        <StatCard
          title="总订单"
          value={(stats?.total_orders ?? 0).toLocaleString()}
          icon={<Icon name="creditCard" size="lg" />}
          iconVariant="warning"
        />
        <StatCard
          title="已完成订单"
          value={(stats?.completed_orders ?? 0).toLocaleString()}
          icon={<Icon name="checkCircle" size="lg" />}
          iconVariant="danger"
        />
      </div>

      {/* Revenue + Recent orders */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">收入概览</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${Number(revenue?.total_revenue ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            {revenue?.completed_orders_count ?? 0} 笔已完成订单
          </p>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">最近订单</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-dark-400">暂无订单</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 dark:border-dark-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      #{order.id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-400">
                      ${Number(order.amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 用量排行榜 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Leaderboard
          title={`今日用量排行 · 合计 $${todaySummary.totalCost.toFixed(2)}`}
          data={todayData}
          loading={todayLoading}
          sortBy={todaySortBy}
          onSortChange={fetchTodayUsage}
          valueFormatter={todaySortBy === 'totalCost' ? formatCost : formatTokens}
          emptyText="今日暂无用量数据"
        />
        <Leaderboard
          title={`本月用量排行 · 合计 $${monthSummary.totalCost.toFixed(2)}`}
          data={monthData}
          loading={monthLoading}
          sortBy={monthSortBy}
          onSortChange={fetchMonthUsage}
          valueFormatter={monthSortBy === 'totalCost' ? formatCost : formatTokens}
          emptyText="本月暂无用量数据"
        />
      </div>
    </div>
  );
}
