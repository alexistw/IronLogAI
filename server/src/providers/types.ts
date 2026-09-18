// Provider-neutral chat contract.
//
// The app never names a provider. It sends a task + prompt; the worker decides
// which vendor serves it based on env config. That means switching between
// Gemini / OpenAI / Anthropic is a `wrangler secret` change and a redeploy —
// NOT an app update, which would otherwise mean another App Store review cycle.

export type ProviderName = 'anthropic' | 'openai' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What every adapter receives, regardless of vendor. */
export interface ChatRequest {
  system?: string;
  messages: ChatMessage[];
  maxTokens: number;
  /**
   * Advisory only. Several current models reject sampling params outright
   * (see the Anthropic adapter), so each adapter decides whether to forward it.
   */
  temperature?: number;
}

/** What every adapter returns, regardless of vendor. */
export interface ChatResult {
  text: string;
  provider: ProviderName;
  model: string;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  /** Optional override for proxies, gateways, or regional endpoints. */
  baseUrl?: string;
  /** Free-form per-provider knobs read from env (e.g. Anthropic effort level). */
  options?: Record<string, string>;
}

export interface ProviderAdapter {
  readonly name: ProviderName;
  readonly defaultModel: string;
  /** Name of the env var holding this provider's key. */
  readonly apiKeyEnvVar: string;
  complete(request: ChatRequest, config: ProviderConfig): Promise<ChatResult>;
}

/** Thrown for provider-side failures so the worker can map them to a status. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderName,
    readonly status: number,
    readonly retryable: boolean
  ) {
    super(message);
  }
}

export const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

/** Shared fetch wrapper: timeout, JSON parsing, uniform error shape. */
export const postJson = async (
  provider: ProviderName,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 60_000
): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ProviderError(
      aborted ? 'Upstream request timed out' : 'Upstream request failed',
      provider,
      504,
      true
    );
  }
  clearTimeout(timer);

  const raw = await response.text();

  if (!response.ok) {
    // Never echo the upstream body wholesale — it can contain key fragments
    // and account identifiers. Log server-side, return something bounded.
    console.error(`[${provider}] ${response.status} ${raw.slice(0, 500)}`);
    throw new ProviderError(
      `Upstream ${provider} error (${response.status})`,
      provider,
      response.status,
      isRetryableStatus(response.status)
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ProviderError(`Malformed ${provider} response`, provider, 502, true);
  }
};
