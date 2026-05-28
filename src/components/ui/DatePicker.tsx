import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtDisplay(s: string): string {
  if (!s) return '';
  return `${s.slice(5, 7)}/${s.slice(8, 10)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Get the Monday-based index (0=Mon, 6=Sun) for the 1st of a month */
function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function DatePicker({ value, onChange, min, max, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseDate(value)?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate(value)?.getMonth() ?? new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const minDate = useMemo(() => parseDate(min), [min]);
  const maxDate = useMemo(() => parseDate(max), [max]);
  const selectedDate = useMemo(() => parseDate(value), [value]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfWeek(viewYear, viewMonth);

  // Build 6 rows x 7 cols grid
  const cells = useMemo(() => {
    const result: { day: number; date: Date; disabled: boolean; selected: boolean; today: boolean; outside: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstDayOffset + 1;
      const date = new Date(viewYear, viewMonth, dayNum);
      const outside = dayNum < 1 || dayNum > daysInMonth;

      let disabled = false;
      if (minDate && date < minDate) disabled = true;
      if (maxDate && date > maxDate) disabled = true;

      const selected = selectedDate ? isSameDay(date, selectedDate) : false;
      const todayMark = isSameDay(date, today);

      result.push({ day: date.getDate(), date, disabled, selected, today: todayMark, outside });
    }
    return result;
  }, [viewYear, viewMonth, daysInMonth, firstDayOffset, minDate, maxDate, selectedDate]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewYear, viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewYear, viewMonth]);

  const handleSelect = useCallback((date: Date, disabled: boolean) => {
    if (disabled) return;
    onChange(fmtDate(date));
    setOpen(false);
  }, [onChange]);

  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-600'
            : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-violet-600'
        )}
      >
        <svg className="h-3 w-3 shrink-0 text-gray-400 dark:text-dark-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="tabular-nums">{fmtDisplay(value) || '选择日期'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-dark-600 dark:bg-dark-800" style={{ width: 280 }}>
          {/* Header: nav + month label */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-dark-400 dark:hover:bg-dark-700"
            >
              <Icon name="chevronLeft" size="xs" />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-dark-200">{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-dark-400 dark:hover:bg-dark-700"
            >
              <Icon name="chevronRight" size="xs" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="flex h-7 items-center justify-center text-xs font-medium text-gray-400 dark:text-dark-500">
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                disabled={cell.disabled || cell.outside}
                onClick={() => handleSelect(cell.date, cell.disabled)}
                className={clsx(
                  'flex h-8 w-full items-center justify-center rounded-lg text-xs transition-all',
                  cell.outside
                    ? 'text-transparent'
                    : cell.selected
                      ? 'bg-violet-600 font-semibold text-white shadow-sm'
                      : cell.today
                        ? 'font-semibold text-violet-600 dark:text-violet-400'
                        : cell.disabled
                          ? 'cursor-not-allowed text-gray-300 dark:text-dark-600'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700'
                )}
              >
                {cell.outside ? '' : cell.day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
