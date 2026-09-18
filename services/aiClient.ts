// Thin client for the AI proxy.
//
// The app holds no provider API key and names no provider. It posts a task id
// plus a prompt; the worker picks the vendor from its own env. Switching
// between Gemini / OpenAI / Claude therefore needs no app release.

const PROXY_URL = process.env.AI_PROXY_URL;
const APP_KEY = process.env.AI_APP_KEY;

const REQUEST_TIMEOUT_MS = 60_000;

export type CoachTask = 'weekly-coach';

export class AiConfigError extends Error {}
export class AiRequestError extends Error {}

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
      throw new AiRequestError('AI 回應逾時，請稍後再試。');
    }
    throw new AiRequestError('無法連線到 AI 服務，請檢查網路。');
  }
  clearTimeout(timer);

  let data: CoachResponse;
  try {
    data = await response.json();
  } catch {
    throw new AiRequestError('AI 服務回應格式錯誤。');
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new AiRequestError('請求太頻繁，請稍後再試。');
    }
    if (response.status === 422) {
      throw new AiRequestError('AI 無法處理這次請求，請稍後再試。');
    }
    throw new AiRequestError(data?.error ?? `AI 服務錯誤（${response.status}）。`);
  }

  if (!data?.text?.trim()) {
    throw new AiRequestError('AI 沒有回傳內容。');
  }

  return data.text;
};
