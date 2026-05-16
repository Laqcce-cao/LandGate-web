import { createPortal } from 'react-dom';
import { useToastStore } from '../../stores/toastStore';
import { Icon } from './Icon';

const iconMap = {
  success: 'checkCircle',
  error: 'xCircle',
  warning: 'exclamationCircle',
  info: 'infoCircle',
} as const;

const iconColorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-primary-500',
};

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} animate-slide-in-right`}
        >
          <div className="flex items-start gap-3">
            <Icon name={iconMap[toast.type]} size="md" className={iconColorMap[toast.type]} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-sm font-medium text-gray-900 dark:text-white">{toast.title}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>
          {toast.duration !== 0 && (
            <div
              className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-dark-700"
              style={{ animation: `shrinkProgress ${(toast.duration ?? 4000)}ms linear forwards` }}
            />
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}
