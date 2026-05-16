import clsx from 'clsx';

interface SkeletonProps {
  variant?: 'rect' | 'circle' | 'text';
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = 'rect', width, height, className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'skeleton',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'h-4 w-3/4 rounded',
        className
      )}
      style={{ width, height }}
    />
  );
}
