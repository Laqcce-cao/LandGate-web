import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { StatCard } from '../components/ui/StatCard';
import { Icon } from '../components/ui/Icon';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="账户余额"
          value={`$${(Math.floor(Number(user?.balance ?? 0) * 100) / 100).toFixed(2)}`}
          icon={<Icon name="creditCard" size="lg" />}
          iconVariant="primary"
        />
        <StatCard
          title="并发限制"
          value={String(user?.concurrency ?? 0)}
          icon={<Icon name="server" size="lg" />}
          iconVariant="success"
        />
        <StatCard
          title="账号状态"
          value={user?.status === 'active' ? '正常' : (user?.status ?? '未知')}
          icon={<Icon name="user" size="lg" />}
          iconVariant="warning"
        />
        <StatCard
          title="账号角色"
          value={user?.role === 'admin' || user?.role === 'super_admin' ? '管理员' : '用户'}
          icon={<Icon name="grid" size="lg" />}
          iconVariant="danger"
        />
      </div>

      {/* Quick start guide */}
      <div className="card p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">快速开始</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 p-4 dark:border-dark-700">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Icon name="key" size="md" />
            </div>
            <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-white">创建 API Key</h4>
            <p className="text-xs text-gray-500 dark:text-dark-400">前往 API Keys 页面创建您的第一个密钥</p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4 dark:border-dark-700">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="chartBar" size="md" />
            </div>
            <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-white">查看用量</h4>
            <p className="text-xs text-gray-500 dark:text-dark-400">在用量统计页面实时查看 API 调用情况</p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4 dark:border-dark-700">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Icon name="gift" size="md" />
            </div>
            <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-white">兑换充值</h4>
            <p className="text-xs text-gray-500 dark:text-dark-400">使用兑换码为账户充值余额</p>
          </div>
        </div>
      </div>
    </div>
  );
}
