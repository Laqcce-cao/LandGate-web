import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefixIcon, suffixIcon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="input-label">{label}</label>}
        <div className="relative">
          {prefixIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {prefixIcon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'input',
              prefixIcon && 'pl-10',
              suffixIcon && 'pr-10',
              error && 'input-error',
              className
            )}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              {suffixIcon}
            </div>
          )}
        </div>
        {hint && !error && <p className="input-hint">{hint}</p>}
        {error && <p className="input-error-text">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
