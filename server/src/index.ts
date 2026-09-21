import {
  ConfigError,
  ProviderError,
  ResolvedProvider,
  resolveProviderChain,
  withRetry,
} from './providers';
import { TASKS, isKnownTask } from './tasks';

export interface Env extends Record<string, unknown> {
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AI_MODEL_ANTHROPIC?: string;
  AI_MODEL_OPENAI?: string;
  AI_MODEL_GEMINI?: string;
  ANTHROPIC_EFFORT?: string;
  ALLOWED_ORIGINS?: string;
  APP_SHARED_SECRET?: string;
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

const DEFAULT_ORIGINS = [
  'capacitor://localhost', // Capacitor iOS
  'https://localhost',     // Capacitor Android (androidScheme: https)
  'http://localhost:3000', // vite dev
];

const corsHeaders = (origin: string | null, allowed: string[]): Record<string, string> => {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-app-key',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
  // A Capacitor WKWebView may send no Origin at all; allow that case through
  // since origin is not a security boundary here anyway (see README).
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
};

const json = (body: unknown, status: number, extra: Record<string, string>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  });

/**
 * Total wall-clock budget for one /coach call, retries and chain fallback
 * included. Kept below the app's own abort so the client sees our error
 * message rather than its generic timeout.
 */
const REQUEST_BUDGET_MS = 95_000;

/**
 * Attempts per provider before moving to the next one in the chain.
 *
 * Two, not three: a single attempt against a thinking model can legitimately
 * run for tens of seconds, so three of them cannot fit in any budget the user
 * is willing to wait for — and each extra attempt costs real quota.
 */
const ATTEMPTS_PER_PROVIDER = 2;

const runChain = async (
  chain: ResolvedProvider[],
  request: Parameters<ResolvedProvider['adapter']['complete']>[0],
  deadline: number
) => {
  let lastError: unknown;

  for (const { adapter, config } of chain) {
    if (Date.now() >= deadline) break;

    try {
      // Retry the same provider first: an overloaded-model 503 is usually gone
      // within a second, and re-asking the same vendor is cheaper and keeps
      // report tone consistent compared with hopping to another one.
      return await withRetry(() => adapter.complete(request, config), {
        attempts: ATTEMPTS_PER_PROVIDER,
        deadline,
        label: adapter.name,
      });
    } catch (err) {
      lastError = err;
      // Only fall through on transient failures. A refusal or content-filter
      // block is a real answer — retrying another vendor just burns money.
      if (err instanceof ProviderError && !err.retryable) throw err;
      console.warn(`[chain] ${adapter.name} failed, trying next`, err);
    }
  }

  if (lastError === undefined) {
    throw new Error('Provider chain exhausted before any attempt was made');
  }
  throw lastError;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const allowed = (env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS.join(','))
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200, cors);
    }

    if (request.method !== 'POST' || url.pathname !== '/coach') {
      return json({ error: 'Not found' }, 404, cors);
    }

    if (origin && !allowed.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, cors);
    }

    // Optional shared secret. This is obfuscation, not authentication — the
    // value ships inside the app bundle and can be extracted. It only stops
    // casual reuse of the endpoint. See README for the real hardening path.
    if (env.APP_SHARED_SECRET && request.headers.get('x-app-key') !== env.APP_SHARED_SECRET) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: 'Too many requests' }, 429, cors);
      }
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, cors);
    }

    const task = typeof payload?.task === 'string' ? payload.task : '';
    if (!isKnownTask(task)) {
      return json({ error: 'Unknown task' }, 400, cors);
    }

    const definition = TASKS[task];
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt : '';

    if (!prompt.trim()) {
      return json({ error: 'Prompt is required' }, 400, cors);
    }
    if (prompt.length > definition.maxPromptChars) {
      return json({ error: 'Prompt too large' }, 413, cors);
    }

    let chain: ResolvedProvider[];
    try {
      chain = resolveProviderChain(env as Record<string, string | undefined>);
    } catch (err) {
      console.error('[config]', err);
      const message = err instanceof ConfigError ? err.message : 'Provider not configured';
      return json({ error: message }, 500, cors);
    }

    const deadline = Date.now() + REQUEST_BUDGET_MS;

    try {
      const result = await runChain(
        chain,
        {
          system: definition.system,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: definition.maxTokens,
          temperature: definition.temperature,
          deadline,
        },
        deadline
      );

      return json(
        { text: result.text, provider: result.provider, model: result.model },
        200,
        cors
      );
    } catch (err) {
      console.error('[coach]', err);
      if (err instanceof ProviderError) {
        // 4xx from upstream is our misconfiguration, not the client's fault —
        // except quota and timeout, which the app words differently for the user.
        const status =
          err.status === 422
            ? 422
            : err.status === 429
              ? 429
              : err.status >= 500 || err.status === 408
                ? 502
                : 500;
        return json({ error: err.message }, status, cors);
      }
      return json({ error: 'AI request failed' }, 500, cors);
    }
  },
};
