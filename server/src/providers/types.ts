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
  /**
   * Absolute epoch-ms deadline for the whole request, retries included. Set by
   * the worker from the app's own timeout so we never keep an upstream call
   * alive after the client has already given up on it.
   */
  deadline?: number;
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
    readonly retryable: boolean,
    /** Honour the upstream's own backoff hint when it sends one. */
    readonly retryAfterMs?: number
  ) {
    super(message);
  }
}

export const isRetryableStatus = (status: number): boolean =>
  status === 408 || status >= 500;

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4_000;

/**
 * Per-attempt ceiling.
 *
 * Sized against measured behaviour, not intuition: a *trivial* prompt to
 * gemini-3.6-flash took ~11s server-side (`server-timing: dur=10977`) because
 * thinking is on by default, and a full coach prompt is 24k chars with a 4096
 * token cap. An earlier 20s value here aborted healthy requests and then
 * retried them, tripling quota burn for nothing.
 */
const ATTEMPT_TIMEOUT_MS = 45_000;

/** `Retry-After` is either delay-seconds or an HTTP date. Both appear in the wild. */
const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

export interface PostJsonOptions {
  /** Per-attempt timeout. Clamped by `deadline` when that is sooner. */
  timeoutMs?: number;
  /** Absolute epoch-ms deadline for the whole request. */
  deadline?: number;
}

/** Shared fetch wrapper: timeout, JSON parsing, uniform error shape. */
export const postJson = async (
  provider: ProviderName,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: PostJsonOptions = {}
): Promise<any> => {
  let timeoutMs = options.timeoutMs ?? ATTEMPT_TIMEOUT_MS;

  if (options.deadline !== undefined) {
    const remaining = options.deadline - Date.now();
    if (remaining <= 0) {
      // Not retryable: more attempts cannot fit, and the chain should stop too.
      throw new ProviderError('Request budget exhausted', provider, 504, false);
    }
    timeoutMs = Math.min(timeoutMs, remaining);
  }

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

    const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));

    // A quota 429 is not a blip. On a free-tier key, retrying spends the little
    // remaining quota and pushes the limit further out, so only retry when the
    // upstream itself told us how long to wait and that wait is short.
    const retryable =
      response.status === 429
        ? retryAfterMs !== undefined && retryAfterMs <= MAX_BACKOFF_MS
        : isRetryableStatus(response.status);

    throw new ProviderError(
      `Upstream ${provider} error (${response.status})`,
      provider,
      response.status,
      retryable,
      retryAfterMs
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ProviderError(`Malformed ${provider} response`, provider, 502, true);
  }
};

/**
 * Full jitter rather than a fixed delay: when a model is overloaded every
 * caller gets the same 503 at the same moment, and retrying in lockstep just
 * reproduces the spike that caused it.
 */
const backoffFor = (attempt: number, retryAfterMs?: number): number => {
  if (retryAfterMs !== undefined) return Math.min(retryAfterMs, MAX_BACKOFF_MS);
  const ceiling = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return Math.random() * ceiling;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface RetryOptions {
  /** Total attempts including the first. */
  attempts?: number;
  /** Absolute epoch-ms deadline; no attempt is started once it has passed. */
  deadline?: number;
  /** Labels the retry log line. */
  label?: string;
}

/**
 * Retries transient provider failures in place.
 *
 * Gemini's 503 (`UNAVAILABLE` / "model is overloaded") is by far the most
 * common failure on this workload and it is almost always gone a second later.
 * Without this, a single 503 became a user-visible error even though the very
 * next request would have succeeded.
 */
export const withRetry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const attempts = options.attempts ?? 3;
  const label = options.label ?? 'provider';

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err instanceof ProviderError && err.retryable;
      if (!retryable || attempt >= attempts) throw err;

      const wait = backoffFor(attempt, (err as ProviderError).retryAfterMs);
      // Give up rather than sleep into a deadline we cannot beat.
      if (options.deadline !== undefined && Date.now() + wait >= options.deadline) throw err;

      console.warn(
        `[retry] ${label} attempt ${attempt}/${attempts} failed (${(err as Error).message}); ` +
          `retrying in ${Math.round(wait)}ms`
      );
      await sleep(wait);
    }
  }
};
