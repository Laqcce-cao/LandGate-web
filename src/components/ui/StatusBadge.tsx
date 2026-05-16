import clsx from 'clsx';

const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'gray'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  ACTIVE: { variant: 'success', label: 'Active' },
  ENABLED: { variant: 'success', label: 'Enabled' },
  enabled: { variant: 'success', label: 'Enabled' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  completed: { variant: 'success', label: 'Completed' },
  PAID: { variant: 'success', label: 'Paid' },
  paid: { variant: 'success', label: 'Paid' },
  published: { variant: 'success', label: 'Published' },
  PASSED: { variant: 'success', label: 'Passed' },

  pending: { variant: 'warning', label: 'Pending' },
  PENDING: { variant: 'warning', label: 'Pending' },
  processing: { variant: 'warning', label: 'Processing' },
  PROCESSING: { variant: 'warning', label: 'Processing' },
  WAITING: { variant: 'warning', label: 'Waiting' },
  waiting: { variant: 'warning', label: 'Waiting' },
  disabled: { variant: 'warning', label: 'Disabled' },
  DISABLED: { variant: 'warning', label: 'Disabled' },
  INACTIVE: { variant: 'warning', label: 'Inactive' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  draft: { variant: 'warning', label: 'Draft' },

  error: { variant: 'danger', label: 'Error' },
  ERROR: { variant: 'danger', label: 'Error' },
  failed: { variant: 'danger', label: 'Failed' },
  FAILED: { variant: 'danger', label: 'Failed' },
  REFUNDED: { variant: 'danger', label: 'Refunded' },
  refunded: { variant: 'danger', label: 'Refunded' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  EXPIRED: { variant: 'danger', label: 'Expired' },
  expired: { variant: 'danger', label: 'Expired' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

const variantDotMap: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  gray: 'bg-gray-400',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const mapped = statusMap[status] ?? { variant: 'gray' as const, label: label ?? status };
  const displayLabel = label ?? mapped.label;
  const dotColor = variantDotMap[mapped.variant];

  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <span className={clsx('h-2 w-2 rounded-full', dotColor)} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{displayLabel}</span>
    </span>
  );
}
