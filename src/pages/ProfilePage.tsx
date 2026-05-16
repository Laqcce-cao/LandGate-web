import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Icon } from '../components/ui/Icon';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  if (!user) return null;

  return (
    <div>
      <PageHeader title="个人中心" description="查看和管理您的账号信息" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-emerald-500 text-2xl font-bold text-white shadow-lg shadow-violet-500/25">
              {user.username?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.username ?? '用户'}
              </h3>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Icon name="user" size="md" />
                <span className="text-sm text-gray-600 dark:text-dark-400">用户 ID</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{user.id}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Icon name="creditCard" size="md" />
                <span className="text-sm text-gray-600 dark:text-dark-400">余额</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ${(Math.floor(Number(user.balance ?? 0) * 100) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Icon name="server" size="md" />
                <span className="text-sm text-gray-600 dark:text-dark-400">并发限制</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{user.concurrency}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Icon name="grid" size="md" />
                <span className="text-sm text-gray-600 dark:text-dark-400">角色</span>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                {(user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin') ? '管理员' : '用户'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Icon name="checkCircle" size="md" />
                <span className="text-sm text-gray-600 dark:text-dark-400">状态</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {user.status === 'active' ? '正常' : (user.status ?? '未知')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions card */}
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">操作</h3>
          <div className="space-y-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl border border-red-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Icon name="login" size="md" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
