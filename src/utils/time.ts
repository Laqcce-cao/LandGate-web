export function parseUtcTime(value: unknown): Date | null {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const normalized = hasTimezone ? text : `${text}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBeijingTime(value: unknown): string {
  const date = parseUtcTime(value);
  if (!date) return '—';

  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatUsageLogTime(value: unknown, now: Date = new Date()): string {
  const date = parseUtcTime(value);
  if (!date) return '—';

  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  let relative: string;
  if (diffMin < 1) relative = '刚刚';
  else if (diffMin < 60) relative = `${diffMin}分钟前`;
  else if (diffHr < 24) relative = `${diffHr}小时前`;
  else relative = date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric' });

  return `${formatBeijingTime(value)} (${relative})`;
}
