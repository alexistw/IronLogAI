// Thin client for the AI proxy.
//
// The app holds no provider API key and names no provider. It posts a task id
// plus a prompt; the worker picks the vendor from its own env. Switching
// between Gemini / OpenAI / Claude therefore needs no app release.

const PROXY_URL = process.env.AI_PROXY_URL;
const APP_KEY = process.env.AI_APP_KEY;

// Must exceed the proxy's own REQUEST_BUDGET_MS (95s) so the proxy's specific
// error reaches us instead of being masked by a client-side abort. A weekly
// report against a thinking model is genuinely slow — tens of seconds.
const REQUEST_TIMEOUT_MS = 105_000;

export type CoachTask = 'weekly-coach';

export class AiConfigError extends Error {
  readonly name = 'AiConfigError';
}

export class AiRequestError extends Error {
  readonly name = 'AiRequestError';

  constructor(
    message: string,
    /** HTTP status from the proxy, when the failure came back as a response. */
    readonly status?: number,
    /** The proxy's own (English, bounded) error text, for logs only. */
    readonly detail?: string
  ) {
    super(message);
  }
}

/**
 * Turns anything thrown by `requestCoach` into copy safe to show the user.
 * Our own error types already carry localized, bounded messages; anything else
 * is unexpected and gets a generic line rather than a raw stack or vendor text.
 */
export const describeAiError = (error: unknown): string => {
  if (error instanceof AiConfigError || error instanceof AiRequestError) {
    return error.message;
  }
  return 'AI 教練暫時無法使用，請稍後再試。';
};

/**
 * Log-friendly rendering of the same error.
 *
 * Capacitor's console bridge JSON-serializes each argument, and `Error` keeps
 * `message` and `stack` non-enumerable — so `console.error('...', err)` shows
 * up in the Xcode console as a useless `{}`. Always log this string instead.
 */
export const formatAiErrorForLog = (error: unknown): string => {
  if (error instanceof AiRequestError) {
    const status = error.status === undefined ? '' : ` [${error.status}]`;
    const detail = error.detail ? ` (${error.detail})` : '';
    return `${error.name}${status}: ${error.message}${detail}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
};

interface CoachResponse {
  text?: string;
  error?: string;
}

export const isAiConfigured = (): boolean => Boolean(PROXY_URL);

export const requestCoach = async (task: CoachTask, prompt: string): Promise<string> => {
  if (!PROXY_URL) {
    throw new AiConfigError('AI 服務尚未設定（缺少 AI_PROXY_URL）。');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${PROXY_URL.replace(/\/$/, '')}/coach`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(APP_KEY ? { 'x-app-key': APP_KEY } : {}),
      },
      body: JSON.stringify({ task, prompt }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiRequestError('AI 回應逾時，請稍後再試。', undefined, 'client abort');
    }
    throw new AiRequestError(
      '無法連線到 AI 服務，請檢查網路。',
      undefined,
      err instanceof Error ? err.message : String(err)
    );
  }
  clearTimeout(timer);

  let data: CoachResponse;
  try {
    data = await response.json();
  } catch {
    throw new AiRequestError('AI 服務回應格式錯誤。', response.status);
  }

  if (!response.ok) {
    // `detail` carries the proxy's own message so the console shows which
    // upstream status caused this, while the user only sees the localized copy.
    const detail = data?.error;

    if (response.status === 429) {
      throw new AiRequestError('請求太頻繁，請稍後再試。', 429, detail);
    }
    if (response.status === 422) {
      throw new AiRequestError('AI 無法處理這次請求，請稍後再試。', 422, detail);
    }
    // The proxy already retried transient upstream failures before giving up,
    // so surface this as "busy" rather than leaking the vendor's raw status
    // (e.g. "Upstream gemini error (503)") into the report area.
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new AiRequestError('AI 服務暫時忙線，請稍後再試。', response.status, detail);
    }
    throw new AiRequestError(
      detail ?? `AI 服務錯誤（${response.status}）。`,
      response.status,
      detail
    );
  }

  if (!data?.text?.trim()) {
    throw new AiRequestError('AI 沒有回傳內容。', response.status);
  }

  return data.text;
};
