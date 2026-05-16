import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: 'narrow' | 'normal' | 'wide' | 'extra-wide';
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

const widthClasses = {
  narrow: 'max-w-sm',
  normal: 'max-w-lg',
  wide: 'max-w-2xl',
  'extra-wide': 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  width = 'normal',
  closeOnEscape = true,
  closeOnClickOutside = true,
  children,
  footer,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Focus first input only once when modal opens
    const raf = requestAnimationFrame(() => {
      const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    });

    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
    };
  }, [open, closeOnEscape]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay animate-fade-in"
      onClick={() => closeOnClickOutside && onClose()}
    >
      <div
        ref={contentRef}
        className={clsx('modal-content animate-scale-in', widthClasses[width])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <Icon name="x" size="md" />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
