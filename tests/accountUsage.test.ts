import assert from 'node:assert/strict';
import { parseAccountUsageStatus } from '../src/pages/accountUsage';

const codexRaw = JSON.stringify({
  source: 'openai_oauth_codex',
  active_limit: 'premium',
  windows: [
    {
      label: '5h',
      scope: 'primary',
      window_minutes: 300,
      used_percent: 12.5,
      remaining_percent: 87.5,
      reset_after_seconds: 14547,
      reset_at: '2026-05-30T14:24:56Z',
    },
    {
      label: '7d',
      scope: 'secondary',
      window_minutes: 10080,
      used_percent: null,
      remaining_percent: null,
      reset_after_seconds: 521737,
      reset_at: '2026-06-05T11:18:07Z',
    },
  ],
});

const legacyRaw = JSON.stringify({
  tokens: { limit: 1000, remaining: 250, reset: '2026-05-30T14:24:56Z' },
});

assert.deepEqual(parseAccountUsageStatus(codexRaw), {
  kind: 'codex',
  activeLimit: 'premium',
  windows: [
    {
      label: '5h',
      scope: 'primary',
      windowMinutes: 300,
      usedPercent: 12.5,
      remainingPercent: 87.5,
      resetAfterSeconds: 14547,
      resetAt: '2026-05-30T14:24:56Z',
    },
    {
      label: '7d',
      scope: 'secondary',
      windowMinutes: 10080,
      usedPercent: null,
      remainingPercent: null,
      resetAfterSeconds: 521737,
      resetAt: '2026-06-05T11:18:07Z',
    },
  ],
});

assert.deepEqual(parseAccountUsageStatus(legacyRaw), {
  kind: 'legacy',
  buckets: {
    tokens: { limit: 1000, remaining: 250, reset: '2026-05-30T14:24:56Z' },
  },
});

assert.equal(parseAccountUsageStatus('{bad json'), null);
assert.equal(parseAccountUsageStatus(undefined), null);
