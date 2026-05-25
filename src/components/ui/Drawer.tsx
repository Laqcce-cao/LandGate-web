import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Drawer({ open, onClose, title, children, width = 'md' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 面板 */}
      <div className={`absolute right-0 top-0 h-full w-full ${widthMap[width]} bg-white shadow-2xl dark:bg-dark-900`}>
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-800 dark:hover:text-dark-200 transition-colors"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        {/* 内容 */}
        <div className="h-[calc(100%-65px)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
