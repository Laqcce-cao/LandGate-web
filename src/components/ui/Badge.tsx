import clsx from 'clsx';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple';
  children: React.ReactNode;
  className?: string;
}

const variantMap = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  gray: 'badge-gray',
  purple: 'badge-purple',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return <span className={clsx('badge', variantMap[variant], className)}>{children}</span>;
}
