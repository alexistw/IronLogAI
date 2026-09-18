import {
  ChatRequest,
  ChatResult,
  ProviderAdapter,
  ProviderConfig,
  ProviderError,
  postJson,
} from './types';

const API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI's parameter naming drifted: reasoning-era models take
 * `max_completion_tokens` and reject `temperature`, while the older chat models
 * take `max_tokens`. This is the single place to adjust if that changes again.
 */
const REASONING_FAMILY = /^(o\d|gpt-5)/;

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',
  defaultModel: 'gpt-4.1-mini',
  apiKeyEnvVar: 'OPENAI_API_KEY',

  async complete(request: ChatRequest, config: ProviderConfig): Promise<ChatResult> {
    const model = config.model;
    const isReasoning = REASONING_FAMILY.test(model);

    const messages: Array<{ role: string; content: string }> = [];
    if (request.system) messages.push({ role: 'system', content: request.system });
    request.messages.forEach(m => messages.push({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = { model, messages };

    if (isReasoning) {
      body.max_completion_tokens = request.maxTokens;
    } else {
      body.max_tokens = request.maxTokens;
      if (request.temperature !== undefined) body.temperature = request.temperature;
    }

    const data = await postJson(
      'openai',
      config.baseUrl ?? API_URL,
      { authorization: `Bearer ${config.apiKey}` },
      body
    );

    const choice = data?.choices?.[0];

    if (choice?.finish_reason === 'content_filter') {
      throw new ProviderError('Request blocked by content filter', 'openai', 422, false);
    }

    const text = typeof choice?.message?.content === 'string' ? choice.message.content : '';

    if (!text.trim()) {
      throw new ProviderError('Empty response from OpenAI', 'openai', 502, true);
    }

    return { text, provider: 'openai', model: data?.model ?? model };
  },
};
