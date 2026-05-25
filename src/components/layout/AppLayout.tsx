import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-950">
      {/* Mesh gradient background */}
      <div className="pointer-events-none fixed inset-0 bg-mesh-gradient" />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div
        className="transition-all duration-300"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
            ? collapsed ? '64px' : '224px'
            : 0,
        }}
      >
        <Header
          onMenuClick={() => setMobileOpen(true)}
          pathname={location.pathname}
        />
        <main className="p-4 md:p-6 lg:p-8 relative">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
