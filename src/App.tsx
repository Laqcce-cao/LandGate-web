import { useEffect } from 'react';
import AppRouter from './router';
import { ToastProvider } from './components/ui/ToastProvider';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <AppRouter />
      <ToastProvider />
    </>
  );
}
