import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AmbientScene } from './AmbientScene';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#EAF5FF] dark:bg-dark-950">
      <AmbientScene />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div
        className={collapsed ? 'relative z-10 transition-all duration-300 lg:ml-16' : 'relative z-10 transition-all duration-300 lg:ml-56'}
      >
        <Header
          onMenuClick={() => setMobileOpen(true)}
          pathname={location.pathname}
          collapsed={collapsed}
        />
        <main className="relative p-4 pt-20 md:p-6 md:pt-[5.5rem] lg:p-8 lg:pt-24">
          <div className="mx-auto w-full max-w-[1480px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
