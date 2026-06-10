import { useState, useRef, useEffect } from 'react';
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
  '/admin/accounts': '上游账号',
  '/admin/oauth': 'OAuth 授权回调',
  '/admin/groups': '分组管理',
  '/admin/payments': '支付管理',
  '/admin/usage': '用量计费',
  '/admin/marketing': '营销管理',
  '/admin/model-prices': '模型价格',
  '/admin/users': '用户管理',
  '/admin/api-keys': 'API密钥',
};

interface HeaderProps {
  onMenuClick: () => void;
  pathname: string;
}

export function Header({ onMenuClick, pathname }: HeaderProps) {
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

  const pageTitle = pageTitles[pathname.split('/').slice(0, 2).join('/')] ?? 'LandGate';

  return (
    <header className="glass sticky top-0 z-30 border-b border-gray-200/50 dark:border-dark-700/50">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-dark-800 lg:hidden"
          >
            <Icon name="menu" size="md" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Balance */}
          {user?.balance != null && (
            <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
              ${(Math.floor(Number(user.balance) * 100) / 100).toFixed(2)}
            </span>
          )}

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-medium text-white">
                {user?.username?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
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
