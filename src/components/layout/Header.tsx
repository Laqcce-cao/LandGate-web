import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { Icon } from '../ui/Icon';

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/checkin': '每日签到',
  '/api-keys': 'API Keys',
  '/usage': '用量统计',
  '/balance-transactions': '余额明细',
  '/redeem': '兑换码',
  '/profile': '个人中心',
  '/admin/dashboard': '仪表盘',
  '/admin/channels': '渠道配置',
  '/admin/accounts': '上游账号',
  '/admin/oauth': 'OAuth 授权回调',
  '/admin/groups': '分组管理',
  '/admin/payments': '支付管理',
  '/admin/usage': '用量计费',
  '/admin/marketing': '营销管理',
  '/admin/model-prices': '模型价格',
  '/admin/users': '用户管理',
  '/admin/balance-transactions': '余额流水',
  '/admin/api-keys': 'API密钥',
};

interface HeaderProps {
  onMenuClick: () => void;
  pathname: string;
  collapsed: boolean;
}

export function Header({ onMenuClick, pathname, collapsed }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pageTitle = pageTitles[pathname] ?? pageTitles[`/${pathname.split('/')[1]}/${pathname.split('/')[2]}`] ?? 'LandGate';

  return (
    <header
      className={clsx(
        'glass fixed left-0 right-0 top-0 z-30 border-b border-gray-200/50 transition-[left] duration-300 dark:border-dark-700/50',
        collapsed ? 'lg:left-16' : 'lg:left-56'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900 dark:text-dark-300 dark:hover:bg-white/[0.06] dark:hover:text-white lg:hidden"
          >
            <Icon name="menu" size="md" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">{pageTitle}</h1>
            <div className="mt-0.5 hidden h-1 w-14 rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 sm:block" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Balance */}
          {user?.balance != null && (
            <span className="relative overflow-hidden rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-sky-300">
              <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60 animate-[signalSweep_3.8s_ease-in-out_infinite]" />
              <span className="relative">
              ${(Math.floor(Number(user.balance) * 100) / 100).toFixed(2)}
              </span>
            </span>
          )}

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-2xl border border-transparent p-1.5 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-white/[0.06]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-violet-400 to-pink-400 text-sm font-semibold text-white shadow-sm shadow-pink-400/20">
                {user?.username?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <span className="hidden max-w-[150px] truncate text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
                {user?.username ?? user?.email ?? 'Admin'}
              </span>
              <Icon name="chevronDown" size="sm" className="hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div className="dropdown right-0 mt-1 w-48">
                <div className="border-b border-gray-100 px-4 py-2 dark:border-dark-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username ?? 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-400">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="dropdown-item w-full text-left text-red-600 dark:text-red-400"
                >
                  <Icon name="login" size="sm" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
