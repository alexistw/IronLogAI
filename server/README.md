# IronLog AI proxy

A single Cloudflare Worker that holds the AI provider key and answers the app's
coaching requests. The app ships **no** provider key and names **no** provider.

## Why it exists

Before this worker, `GEMINI_API_KEY` was inlined into the app's JS bundle by
Vite. Anyone can download an IPA, unzip it, and read that string. This moves the
key server-side.

## Why the provider is chosen here and not in the app

`AI_PROVIDER` is a worker env var, so switching between Gemini, OpenAI and
Claude is a redeploy — seconds. If the app picked the provider, switching would
need a new build and another App Store review, which is days. Same for the
system prompt in `src/tasks.ts`: tone and length can be retuned without shipping.

## Setup

```bash
cd server
npm install
cp .dev.vars.example .dev.vars   # put a real key in it
npm run dev                      # http://localhost:8787
```

Deploy:

```bash
wrangler secret put GEMINI_API_KEY      # and/or ANTHROPIC_API_KEY, OPENAI_API_KEY
npm run deploy
```

Then set `AI_PROXY_URL` in the app's `.env.local` to the deployed URL and rebuild
the app.

## Switching providers

Edit `AI_PROVIDER` in `wrangler.toml` and redeploy:

| Value | Behaviour |
|---|---|
| `gemini` | Gemini only (the app's original behaviour) |
| `anthropic` | Claude only |
| `openai` | OpenAI only |
| `anthropic,gemini` | Claude first, falling back to Gemini on transient failures |

A chain only falls through on **retryable** failures (timeout, 429, 5xx). A
refusal or content-filter block is a real answer, so it is returned as-is rather
than burning a second vendor's tokens on the same request.

Model defaults live in each adapter and can be overridden per provider with
`AI_MODEL_ANTHROPIC`, `AI_MODEL_OPENAI`, `AI_MODEL_GEMINI`.

## Adding a fourth provider

Write `src/providers/<name>.ts` exporting a `ProviderAdapter`, then add it to the
`ADAPTERS` map in `src/providers/index.ts`. Nothing else changes — not the
worker, not the app.

## Provider quirks the adapters handle

These are the things that make a naive "just swap the URL" abstraction break:

- **Anthropic** rejects `temperature` with a 400 on the current model generation
  (Opus 5, Sonnet 5, Opus 4.7/4.8, Fable 5). The adapter drops it by model.
  Thinking is on by default; spend is dialled with `output_config.effort`
  (`ANTHROPIC_EFFORT`, default `low`) rather than disabled. A safety decline
  arrives as **HTTP 200** with `stop_reason: "refusal"`.
- **OpenAI** reasoning-era models take `max_completion_tokens` and reject
  `temperature`; older chat models take `max_tokens`. Selected by model prefix.
- **Gemini** calls the assistant turn `model`, puts the system prompt in
  `systemInstruction`, and reports blocks via `promptFeedback.blockReason`.

## Abuse protection — read this before going live

The endpoint has no user accounts, so it cannot be fully protected. What is here
reduces abuse; it does not eliminate it:

- **Task allowlist** — only `weekly-coach` is accepted, with a prompt size cap.
  The endpoint is not a general-purpose LLM proxy.
- **Origin allowlist** — `ALLOWED_ORIGINS`. Trivially spoofed by a non-browser
  client; it stops other websites, not a determined attacker.
- **`APP_SHARED_SECRET`** — optional header check. The value ships inside the
  app bundle and can be extracted, exactly like the old Gemini key. It raises
  the bar; it is not authentication.
- **Rate limiting** — per-IP, active only when the `RATE_LIMITER` binding
  exists. Verify the binding syntax against current Cloudflare docs before
  uncommenting it in `wrangler.toml`.

**Set a hard spend cap on the provider account.** That is the only control that
reliably bounds the damage.

The real fix for a no-account app is Apple's **App Attest** (DeviceCheck): the
app gets an attestation from Apple proving the request comes from a genuine,
unmodified build of your app, and the worker verifies it. That requires native
Swift work and is the natural follow-up once the app is live.
