import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { openaiAdapter } from './openai';
import { ProviderAdapter, ProviderConfig, ProviderName } from './types';

export * from './types';

export const ADAPTERS: Record<ProviderName, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

export const isProviderName = (value: string): value is ProviderName =>
  Object.prototype.hasOwnProperty.call(ADAPTERS, value);

export interface ResolvedProvider {
  adapter: ProviderAdapter;
  config: ProviderConfig;
}

export class ConfigError extends Error {}

/**
 * Reads the provider chain from env. `AI_PROVIDER` accepts a comma-separated
 * list — "anthropic,gemini" tries Anthropic first and falls through to Gemini
 * on a retryable failure, so one vendor having a bad day is not an outage.
 *
 * Per-provider model override: AI_MODEL_ANTHROPIC / AI_MODEL_OPENAI / AI_MODEL_GEMINI.
 */
export const resolveProviderChain = (env: Record<string, string | undefined>): ResolvedProvider[] => {
  const raw = (env.AI_PROVIDER ?? 'gemini').split(',').map(s => s.trim()).filter(Boolean);

  if (raw.length === 0) {
    throw new ConfigError('AI_PROVIDER is empty');
  }

  const chain: ResolvedProvider[] = [];

  for (const name of raw) {
    if (!isProviderName(name)) {
      throw new ConfigError(`Unknown provider "${name}" in AI_PROVIDER`);
    }

    const adapter = ADAPTERS[name];
    const apiKey = env[adapter.apiKeyEnvVar];
    if (!apiKey) {
      // Skip rather than throw: a chain can legitimately list a provider whose
      // key has not been set yet. Only an entirely empty chain is fatal.
      console.warn(`[config] ${adapter.apiKeyEnvVar} is not set — skipping ${name}`);
      continue;
    }

    chain.push({
      adapter,
      config: {
        apiKey,
        model: env[`AI_MODEL_${name.toUpperCase()}`] ?? adapter.defaultModel,
        options: { effort: env.ANTHROPIC_EFFORT ?? 'low' },
      },
    });
  }

  if (chain.length === 0) {
    throw new ConfigError('No provider in AI_PROVIDER has an API key configured');
  }

  return chain;
};
