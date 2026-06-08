export interface RateLimitBucket {
  limit: number;
  remaining: number;
  reset?: string;
}

export interface LegacyRateLimitStatus {
  kind: 'legacy';
  buckets: {
    tokens?: RateLimitBucket;
    requests?: RateLimitBucket;
  };
}

export interface CodexUsageWindow {
  label: string;
  scope: string;
  windowMinutes: number | null;
  usedPercent: number | null;
  remainingPercent: number | null;
  resetAfterSeconds: number | null;
  resetAt: string | null;
}

export interface CodexUsageStatus {
  kind: 'codex';
  activeLimit: string | null;
  windows: CodexUsageWindow[];
}

export type AccountUsageStatus = LegacyRateLimitStatus | CodexUsageStatus;

const asNumberOrNull = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const asStringOrNull = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value : null
);

export const parseAccountUsageStatus = (raw: string | undefined): AccountUsageStatus | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.source === 'openai_oauth_codex' && Array.isArray(parsed.windows)) {
      return {
        kind: 'codex',
        activeLimit: asStringOrNull(parsed.active_limit),
        windows: parsed.windows
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map((item) => ({
            label: asStringOrNull(item.label) ?? 'unknown',
            scope: asStringOrNull(item.scope) ?? 'unknown',
            windowMinutes: asNumberOrNull(item.window_minutes),
            usedPercent: asNumberOrNull(item.used_percent),
            remainingPercent: asNumberOrNull(item.remaining_percent),
            resetAfterSeconds: asNumberOrNull(item.reset_after_seconds),
            resetAt: asStringOrNull(item.reset_at),
          })),
      };
    }

    const tokens = parsed.tokens as RateLimitBucket | undefined;
    const requests = parsed.requests as RateLimitBucket | undefined;
    if (tokens || requests) {
      const buckets: LegacyRateLimitStatus['buckets'] = {};
      if (tokens) buckets.tokens = tokens;
      if (requests) buckets.requests = requests;
      return { kind: 'legacy', buckets };
    }

    return null;
  } catch {
    return null;
  }
};
