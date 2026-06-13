import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

const userNavItems = [
  { path: '/dashboard', label: '仪表盘', icon: 'grid' as const },
  { path: '/checkin', label: '每日签到', icon: 'gift' as const },
  { path: '/api-keys', label: 'API Keys', icon: 'key' as const },
  { path: '/usage', label: '用量统计', icon: 'chartBar' as const },
  { path: '/balance-transactions', label: '余额明细', icon: 'dollar' as const },
  { path: '/profile', label: '个人中心', icon: 'user' as const },
];

const adminNavItems = [
  { path: '/admin/dashboard', label: '仪表盘', icon: 'grid' as const },
  { path: '/admin/channels', label: '渠道配置', icon: 'globe' as const },
  { path: '/admin/usage', label: '用量计费', icon: 'chartBar' as const },
  { path: '/admin/users', label: '用户管理', icon: 'userCircle' as const },
  { path: '/admin/balance-transactions', label: '余额流水', icon: 'dollar' as const },
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
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
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
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#101418] shadow-lg shadow-black/10 dark:bg-[#E8E2D8]">
            <span className="absolute inset-[3px] rounded-lg border border-[#A77A45]/45" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#A77A45] dark:border-[#0B1120]" />
            <span className="relative text-sm font-bold text-white dark:text-[#101418]">LG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-gray-950 dark:text-white">LandGate</span>
              <p className="text-[11px] font-medium text-slate-400 dark:text-dark-400">{isAdmin ? '管理控制台' : '用量控制台'}</p>
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
          'border-t border-white/70 px-3 py-3 dark:border-white/10',
          collapsed && 'px-1.5'
        )}>
          {user?.balance != null && !collapsed && (
            <div className="relative mb-2 overflow-hidden rounded-xl border border-[#D9C8AF] bg-[#FAF8F2] p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
              <div className="absolute inset-x-0 top-0 h-px bg-[#A77A45]/45" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F512D] dark:text-[#D8BE96]">余额</span>
              <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
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
