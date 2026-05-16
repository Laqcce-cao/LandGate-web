import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger';
  change?: number;
  changeType?: 'up' | 'down' | 'neutral';
  className?: string;
}

const iconVariantMap = {
  primary: 'stat-icon-primary',
  success: 'stat-icon-success',
  warning: 'stat-icon-warning',
  danger: 'stat-icon-danger',
};

export function StatCard({
  title,
  value,
  icon,
  iconVariant = 'primary',
  change,
  changeType,
  className,
}: StatCardProps) {
  const trendClass =
    changeType === 'up' ? 'stat-trend-up'
    : changeType === 'down' ? 'stat-trend-down'
    : '';

  return (
    <div className={clsx('stat-card', className)}>
      {icon && (
        <div className={clsx('stat-icon', iconVariantMap[iconVariant])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{title}</p>
        {change != null && changeType && (
          <div className={clsx('stat-trend', trendClass)}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {changeType === 'up' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              ) : changeType === 'down' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              )}
            </svg>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  );
}
