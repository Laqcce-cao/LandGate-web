import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardStats, type RevenueSummary } from '../api/admin/dashboard';
import { paymentsApi, type PaymentOrder } from '../api/admin/payments';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { useToastStore } from '../stores/toastStore';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      dashboardApi.revenue(),
      paymentsApi.list({ size: 5 }),
    ])
      .then(([statsRes, revRes, ordersRes]) => {
        setStats(statsRes.data);
        setRevenue(revRes.data);
        setRecentOrders(ordersRes.data.orders ?? []);
      })
      .catch(() => {
        addToast({ type: 'error', message: '加载仪表盘数据失败' });
      })
      .finally(() => setLoading(false));
  }, [addToast]);

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
      <PageHeader
        title="仪表盘"
        description="系统概览"
      />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue card */}
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">收入概览</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${Number(revenue?.total_revenue ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            {revenue?.completed_orders_count ?? 0} 笔已完成订单
          </p>
        </div>

        {/* Recent orders */}
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">最近订单</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-dark-400">暂无订单</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700"
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
    </div>
  );
}
