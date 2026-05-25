import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

const userNavItems = [
  { path: '/dashboard', label: '仪表盘', icon: 'grid' as const },
  { path: '/api-keys', label: 'API Keys', icon: 'key' as const },
  { path: '/usage', label: '用量统计', icon: 'chartBar' as const },
  { path: '/redeem', label: '兑换码', icon: 'gift' as const },
  { path: '/profile', label: '个人中心', icon: 'user' as const },
];

const adminNavItems = [
  { path: '/admin/dashboard', label: '仪表盘', icon: 'grid' as const },
  { path: '/admin/accounts', label: '上游账号', icon: 'server' as const },
  { path: '/admin/groups', label: '分组管理', icon: 'users' as const },
  { path: '/admin/model-prices', label: '模型价格', icon: 'dollar' as const },
  { path: '/admin/payments', label: '支付管理', icon: 'creditCard' as const },
  { path: '/admin/usage', label: '用量计费', icon: 'chartBar' as const },
  { path: '/admin/marketing', label: '营销管理', icon: 'gift' as const },
  { path: '/admin/users', label: '用户管理', icon: 'userCircle' as const },
  { path: '/admin/api-keys', label: 'API密钥', icon: 'key' as const },
];

const adminPersonalItems = [
  { path: '/profile', label: '个人中心', icon: 'user' as const },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggleCollapse }: SidebarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'sidebar',
          collapsed ? 'w-[64px]' : 'w-56',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className={clsx('sidebar-header', collapsed && 'justify-center px-0')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-emerald-500 shadow-lg shadow-violet-500/25">
            <span className="text-sm font-bold text-white">LG</span>
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">LandGate</span>
              <p className="text-xs text-slate-400">{isAdmin ? '管理后台' : '用户中心'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex flex-col">
          {isAdmin ? (
            <>
              <div className="sidebar-section">
                {!collapsed && <div className="sidebar-section-title">管理</div>}
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin/dashboard'}
                    className={({ isActive }) =>
                      clsx(
                        'sidebar-link',
                        collapsed && 'justify-center px-0',
                        isActive && 'sidebar-link-active'
                      )
                    }
                    onClick={onMobileClose}
                  >
                    <Icon name={item.icon} size="md" />
                    {!collapsed && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </div>
              <div className="sidebar-section">
                {!collapsed && <div className="sidebar-section-title">我的</div>}
                {adminPersonalItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'sidebar-link',
                        collapsed && 'justify-center px-0',
                        isActive && 'sidebar-link-active'
                      )
                    }
                    onClick={onMobileClose}
                  >
                    <Icon name={item.icon} size="md" />
                    {!collapsed && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </>
          ) : (
            <div className="sidebar-section">
              {!collapsed && <div className="sidebar-section-title">菜单</div>}
              {userNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    clsx(
                      'sidebar-link',
                      collapsed && 'justify-center px-0',
                      isActive && 'sidebar-link-active'
                    )
                  }
                  onClick={onMobileClose}
                >
                  <Icon name={item.icon} size="md" />
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: balance + actions */}
        <div className={clsx(
          'border-t border-gray-100 px-3 py-3 dark:border-dark-800',
          collapsed && 'px-1.5'
        )}>
          {user?.balance != null && !collapsed && (
            <div className="mb-2 px-2 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
              <span className="text-xs text-violet-600 dark:text-violet-400">余额</span>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                ${(Math.floor(Number(user.balance) * 100) / 100).toFixed(2)}
              </p>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className={clsx('sidebar-link w-full', collapsed && 'justify-center px-0')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size="md" />
            {!collapsed && <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>}
          </button>
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'sidebar-link mt-1 w-full hidden lg:flex',
              collapsed && 'justify-center px-0'
            )}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size="md" />
            {!collapsed && <span>收起菜单</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
