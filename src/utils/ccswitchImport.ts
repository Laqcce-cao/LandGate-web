export const OPENAI_CC_SWITCH_CODEX_MODEL = 'gpt-5.4';

export type CcSwitchApp = 'claude' | 'codex';

export interface CcSwitchImportDeeplinkInput {
  app: CcSwitchApp;
  endpoint: string;
  homepage: string;
  providerName: string;
  apiKey: string;
  model?: string;
  usageScript?: string;
}

export function buildCcSwitchImportDeeplink(input: CcSwitchImportDeeplinkInput): string {
  const entries: [string, string][] = [
    ['resource', 'provider'],
    ['app', input.app],
    ['name', input.providerName],
    ['homepage', input.homepage],
    ['endpoint', input.endpoint],
    ['apiKey', input.apiKey],
    ['configFormat', 'json'],
  ];

  if (input.model) {
    entries.splice(2, 0, ['model', input.model]);
  }

  if (input.usageScript) {
    entries.push(
      ['usageEnabled', 'true'],
      ['usageScript', btoa(input.usageScript)],
      ['usageAutoInterval', '30']
    );
  }

  return `ccswitch://v1/import?${new URLSearchParams(entries).toString()}`;
}
