import {
  ChatRequest,
  ChatResult,
  ProviderAdapter,
  ProviderConfig,
  ProviderError,
  postJson,
} from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * Sampling params (temperature / top_p / top_k) were REMOVED on the current
 * generation — sending temperature to these returns a 400, not a warning.
 * Older models still accept it, so the guard is by model, not blanket.
 */
const SAMPLING_REMOVED = /^claude-(fable-5|mythos-5|opus-5|opus-4-8|opus-4-7|sonnet-5)/;

/** `output_config.effort` errors on pre-4.6 models; only send it where it exists. */
const SUPPORTS_EFFORT = /^claude-(fable-5|mythos-5|opus-5|opus-4-8|opus-4-7|opus-4-6|sonnet-5|sonnet-4-6)/;

const VALID_EFFORT = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

export const anthropicAdapter: ProviderAdapter = {
  name: 'anthropic',
  // Opus 5 is the default; set AI_MODEL to claude-sonnet-5 or claude-haiku-4-5
  // if you want to trade capability for cost on this workload.
  defaultModel: 'claude-opus-5',
  apiKeyEnvVar: 'ANTHROPIC_API_KEY',

  async complete(request: ChatRequest, config: ProviderConfig): Promise<ChatResult> {
    const model = config.model;

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
    };

    if (request.system) body.system = request.system;

    if (request.temperature !== undefined && !SAMPLING_REMOVED.test(model)) {
      body.temperature = request.temperature;
    }

    // Thinking is on by default on the current models. Rather than disabling it
    // (which has known failure modes), dial spend down with effort — a weekly
    // training summary does not need deep reasoning.
    const effort = config.options?.effort ?? 'low';
    if (SUPPORTS_EFFORT.test(model) && VALID_EFFORT.has(effort)) {
      body.output_config = { effort };
    }

    const data = await postJson(
      'anthropic',
      config.baseUrl ?? API_URL,
      {
        'x-api-key': config.apiKey,
        'anthropic-version': API_VERSION,
      },
      body,
      { deadline: request.deadline }
    );

    // A safety decline returns HTTP 200 — check stop_reason before reading content.
    if (data?.stop_reason === 'refusal') {
      throw new ProviderError(
        `Request declined (${data?.stop_details?.category ?? 'unspecified'})`,
        'anthropic',
        422,
        false
      );
    }

    const text = Array.isArray(data?.content)
      ? data.content
          .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
          .map((block: any) => block.text)
          .join('')
      : '';

    if (!text.trim()) {
      throw new ProviderError('Empty response from Anthropic', 'anthropic', 502, true);
    }

    return { text, provider: 'anthropic', model: data?.model ?? model };
  },
};
