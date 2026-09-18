import {
  ChatRequest,
  ChatResult,
  ProviderAdapter,
  ProviderConfig,
  ProviderError,
  postJson,
} from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiAdapter: ProviderAdapter = {
  name: 'gemini',
  // Matches the model the app shipped with before the proxy existed.
  defaultModel: 'gemini-3.6-flash',
  apiKeyEnvVar: 'GEMINI_API_KEY',

  async complete(request: ChatRequest, config: ProviderConfig): Promise<ChatResult> {
    const model = config.model;

    const body: Record<string, unknown> = {
      // Gemini calls the assistant turn "model".
      contents: request.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      },
    };

    if (request.system) {
      body.systemInstruction = { parts: [{ text: request.system }] };
    }

    const url = config.baseUrl ?? `${API_BASE}/${encodeURIComponent(model)}:generateContent`;

    const data = await postJson('gemini', url, { 'x-goog-api-key': config.apiKey }, body);

    if (data?.promptFeedback?.blockReason) {
      throw new ProviderError(
        `Request blocked (${data.promptFeedback.blockReason})`,
        'gemini',
        422,
        false
      );
    }

    const candidate = data?.candidates?.[0];
    const text = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .join('')
      : '';

    if (!text.trim()) {
      throw new ProviderError('Empty response from Gemini', 'gemini', 502, true);
    }

    return { text, provider: 'gemini', model };
  },
};
