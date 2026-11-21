// Production-grade API Request Queue & Rate-Limit Manager for Gemini & Mistral
// Handles HTTP 429 / RESOURCE_EXHAUSTED, Retry-After headers, exponential backoff + jitter,
// per-provider concurrency limits, inter-request cooldown, shared pause windows, and live retry reporting.

export type ApiProviderName = 'gemini' | 'mistral';
export type ApiErrorCategory = 'rate_limit' | 'quota_exhausted' | 'transient' | 'permanent';

export interface ProviderRateLimitConfig {
  maxConcurrency: number;
  minIntervalMs: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxJitterMs: number;
  maxSingleWaitMs?: number; // hard safety cap so a daily Retry-After (e.g. 11632s) never hangs worker!
}

export interface RetryNotice {
  provider: ApiProviderName;
  label: string;
  attempt: number;
  maxRetries: number;
  delayMs: number;
  nextRetryAt: string;
  category: ApiErrorCategory;
  statusCode?: number;
  retryAfterMs?: number | null;
  reason: string;
}

export interface ScheduleOptions {
  label?: string;
  maxRetries?: number;
  maxSingleWaitMs?: number;
  signal?: AbortSignal;
  onRetry?: (notice: RetryNotice) => void;
}

export interface ProviderQueueSnapshot {
  provider: ApiProviderName;
  config: ProviderRateLimitConfig;
  activeCount: number;
  queuedCount: number;
  pausedUntil: string | null;
  totalRequests: number;
  totalRetries: number;
  totalRateLimits: number;
  totalQuotaExhausted: number;
  totalTransientErrors: number;
  totalPermanentErrors: number;
  lastError?: string | null;
  lastErrorAt?: string | null;
}

export class StructuredApiError extends Error {
  status?: number;
  retryAfterHeader?: string | null;
  retryAfterMs?: number | null;
  category: ApiErrorCategory;
  provider?: ApiProviderName;

  constructor(
    message: string,
    opts: {
      status?: number;
      retryAfterHeader?: string | null;
      retryAfterMs?: number | null;
      category?: ApiErrorCategory;
      provider?: ApiProviderName;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'StructuredApiError';
    this.status = opts.status;
    this.retryAfterHeader = opts.retryAfterHeader ?? null;
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.provider = opts.provider;
    this.category = opts.category ?? classifyApiError(this);
    if (opts.cause !== undefined) {
      (this as unknown as { cause?: unknown }).cause = opts.cause;
    }
  }
}

export function extractStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const anyErr = err as Record<string, unknown>;
  for (const key of ['status', 'statusCode', 'code']) {
    const val = anyErr[key];
    if (typeof val === 'number' && val >= 100 && val <= 599) return val;
  }
  const nestedError = anyErr.error as Record<string, unknown> | undefined;
  if (nestedError && typeof nestedError === 'object') {
    const code = nestedError.code;
    if (typeof code === 'number' && code >= 100 && code <= 599) return code;
  }
  const msg = String(anyErr.message || err || '');
  const jsonCode = msg.match(/"code"\s*:\s*(\d{3})/);
  if (jsonCode) return parseInt(jsonCode[1], 10);
  const httpCode = msg.match(/\bHTTP\s*(\d{3})\b/i) || msg.match(/\bstatus\s*(?:code)?\s*[:=]?\s*(\d{3})\b/i);
  if (httpCode) return parseInt(httpCode[1], 10);
  if (/\b429\b/.test(msg)) return 429;
  if (/\b504\b/.test(msg)) return 504;
  if (/\b503\b/.test(msg)) return 503;
  if (/\b502\b/.test(msg)) return 502;
  if (/\b500\b/.test(msg)) return 500;
  if (/\b401\b/.test(msg)) return 401;
  if (/\b403\b/.test(msg)) return 403;
  if (/\b404\b/.test(msg)) return 404;
  if (/\b400\b/.test(msg)) return 400;
  return undefined;
}

export function parseRetryAfterHeader(headerValue: string | null | undefined, nowMs = Date.now()): number | null {
  if (!headerValue) return null;
  const trimmed = String(headerValue).trim();
  if (!trimmed) return null;
  // Numeric seconds (integer or float)
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const sec = parseFloat(trimmed);
    if (Number.isFinite(sec) && sec >= 0) return Math.round(sec * 1000);
  }
  // Suffix like "12s" or "12.5s" (Google RPC RetryInfo format)
  const secMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/i);
  if (secMatch) {
    const sec = parseFloat(secMatch[1]);
    if (Number.isFinite(sec) && sec >= 0) return Math.round(sec * 1000);
  }
  // HTTP-date format (RFC 7231)
  const parsedDate = Date.parse(trimmed);
  if (Number.isFinite(parsedDate)) {
    const delta = parsedDate - nowMs;
    return delta > 0 ? delta : 0;
  }
  return null;
}

export function extractRetryAfterMs(err: unknown, nowMs = Date.now()): number | null {
  if (!err || typeof err !== 'object') return null;
  const anyErr = err as Record<string, unknown>;

  // Direct field from StructuredApiError or custom fetch wrapper
  if (typeof anyErr.retryAfterMs === 'number' && Number.isFinite(anyErr.retryAfterMs) && anyErr.retryAfterMs >= 0) {
    return anyErr.retryAfterMs;
  }
  if (typeof anyErr.retryAfterHeader === 'string') {
    const parsed = parseRetryAfterHeader(anyErr.retryAfterHeader, nowMs);
    if (parsed !== null) return parsed;
  }

  // Response headers on error object
  const headers = anyErr.headers ?? (anyErr.response as Record<string, unknown> | undefined)?.headers;
  if (headers) {
    if (typeof (headers as Headers).get === 'function') {
      const h = (headers as Headers).get('retry-after') || (headers as Headers).get('Retry-After');
      const parsed = parseRetryAfterHeader(h, nowMs);
      if (parsed !== null) return parsed;
    } else if (typeof headers === 'object') {
      const hObj = headers as Record<string, unknown>;
      const raw = hObj['retry-after'] ?? hObj['Retry-After'];
      if (typeof raw === 'string') {
        const parsed = parseRetryAfterHeader(raw, nowMs);
        if (parsed !== null) return parsed;
      }
    }
  }

  // Google API error payload ("retryDelay": "18s" or "Please retry in 14.5s")
  const msg = String(anyErr.message || '');
  const retryDelayJson = msg.match(/"retryDelay"\s*:\s*"([^"]+)"/i);
  if (retryDelayJson) {
    const parsed = parseRetryAfterHeader(retryDelayJson[1], nowMs);
    if (parsed !== null) return parsed;
  }
  const retryInText = msg.match(/retry\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)/i);
  if (retryInText) {
    const sec = parseFloat(retryInText[1]);
    if (Number.isFinite(sec) && sec >= 0) return Math.round(sec * 1000);
  }
  return null;
}

export function isDailyOrBillingQuotaError(err: unknown, retryAfterMs?: number | null): boolean {
  const msg = String((err as { message?: string } | null)?.message || err || '');
  const extractedRetry = retryAfterMs !== undefined ? retryAfterMs : extractRetryAfterMs(err);
  // If provider tells us to wait > 75 seconds (e.g. 11632s until midnight quota reset), it's daily quota exhaustion
  if (typeof extractedRetry === 'number' && extractedRetry > 75_000) {
    return true;
  }
  if (/per_day|perday|daily\s+quota|generate_requests_per_model_per_day|free_tier_requests|check your plan and billing details/i.test(msg)) {
    // Only if retryAfter is absent or > 30s (short RPM messages sometimes include generic billing link)
    if (extractedRetry === null || extractedRetry > 30_000 || /per_day|daily\s+quota|free_tier/i.test(msg)) {
      return true;
    }
  }
  return false;
}

export function classifyApiError(err: unknown): ApiErrorCategory {
  if (err instanceof StructuredApiError && err.category) {
    return err.category;
  }
  const status = extractStatusCode(err);
  const msg = String((err as { message?: string } | null)?.message || err || '');
  const name = String((err as { name?: string } | null)?.name || '');
  const retryAfterMs = extractRetryAfterMs(err);

  // Distinguish long/daily quota exhaustion from short transient 429 RPM rate limits
  if (
    (status === 429 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(msg)) &&
    isDailyOrBillingQuotaError(err, retryAfterMs)
  ) {
    return 'quota_exhausted';
  }

  // Short-lived RPM/TPM Rate-limit detection
  if (
    status === 429 ||
    /RESOURCE_EXHAUSTED|RATE_LIMIT|rate[\s_-]?limit|too many requests|quota exceeded|tokens per minute|requests per minute/i.test(msg)
  ) {
    return 'rate_limit';
  }

  // Permanent errors — NEVER retry blindly
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 422 ||
    /API_KEY_INVALID|INVALID_ARGUMENT|PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND|Thinking level .* is not supported|model .* not found|is not found for API version|missing .*api_key/i.test(msg)
  ) {
    return 'permanent';
  }

  // Transient server / network / timeout errors
  if (
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    name === 'AbortError' ||
    /DEADLINE_EXCEEDED|UNAVAILABLE|INTERNAL|timed?\s*out|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|network error|socket hang up|overloaded|bad gateway|service unavailable|gateway timeout|unexpected end of json|unterminated string in json/i.test(msg)
  ) {
    return 'transient';
  }

  // Default unknown non-4xx runtime errors to transient with bounded retry
  return 'transient';
}

interface QueuedTask {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
  signal?: AbortSignal;
}

class ProviderQueueState {
  config: ProviderRateLimitConfig;
  activeCount = 0;
  queue: QueuedTask[] = [];
  lastDispatchMs = 0;
  pausedUntilMs = 0;
  totalRequests = 0;
  totalRetries = 0;
  totalRateLimits = 0;
  totalQuotaExhausted = 0;
  totalTransientErrors = 0;
  totalPermanentErrors = 0;
  lastError: string | null = null;
  lastErrorAt: string | null = null;
  private pumpTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: ProviderRateLimitConfig) {
    this.config = { ...config };
  }

  clearTimer() {
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer);
      this.pumpTimer = null;
    }
  }

  schedulePump(delayMs: number, pumpFn: () => void) {
    if (this.pumpTimer) return;
    this.pumpTimer = setTimeout(() => {
      this.pumpTimer = null;
      pumpFn();
    }, Math.max(10, Math.min(delayMs, 60_000)));
  }
}

const DEFAULT_CONFIGS: Record<ApiProviderName, ProviderRateLimitConfig> = {
  gemini: {
    maxConcurrency: 1,
    minIntervalMs: 1800,
    maxRetries: 4,
    baseBackoffMs: 2500,
    maxBackoffMs: 30000,
    maxJitterMs: 1200,
    maxSingleWaitMs: 45000,
  },
  mistral: {
    maxConcurrency: 1,
    minIntervalMs: 1200,
    maxRetries: 3,
    baseBackoffMs: 2000,
    maxBackoffMs: 25000,
    maxJitterMs: 1000,
    maxSingleWaitMs: 35000,
  },
};

export class ApiRateLimiter {
  private states: Record<ApiProviderName, ProviderQueueState>;
  private sleepImpl: (ms: number, signal?: AbortSignal) => Promise<void>;
  private randomImpl: () => number;

  constructor(opts?: {
    sleepImpl?: (ms: number, signal?: AbortSignal) => Promise<void>;
    randomImpl?: () => number;
  }) {
    this.states = {
      gemini: new ProviderQueueState(DEFAULT_CONFIGS.gemini),
      mistral: new ProviderQueueState(DEFAULT_CONFIGS.mistral),
    };
    this.sleepImpl = opts?.sleepImpl ?? defaultAbortableSleep;
    this.randomImpl = opts?.randomImpl ?? Math.random;
  }

  configureProvider(provider: ApiProviderName, partial: Partial<ProviderRateLimitConfig>): void {
    const st = this.states[provider];
    if (!st) return;
    if (typeof partial.maxConcurrency === 'number' && partial.maxConcurrency >= 1) {
      st.config.maxConcurrency = Math.min(10, Math.floor(partial.maxConcurrency));
    }
    if (typeof partial.minIntervalMs === 'number' && partial.minIntervalMs >= 0) {
      st.config.minIntervalMs = Math.min(30000, Math.floor(partial.minIntervalMs));
    }
    if (typeof partial.maxRetries === 'number' && partial.maxRetries >= 0) {
      st.config.maxRetries = Math.min(10, Math.floor(partial.maxRetries));
    }
    if (typeof partial.baseBackoffMs === 'number' && partial.baseBackoffMs >= 0) {
      st.config.baseBackoffMs = Math.min(60000, Math.floor(partial.baseBackoffMs));
    }
    if (typeof partial.maxBackoffMs === 'number' && partial.maxBackoffMs >= 0) {
      st.config.maxBackoffMs = Math.min(60000, Math.floor(partial.maxBackoffMs));
    }
    if (typeof partial.maxJitterMs === 'number' && partial.maxJitterMs >= 0) {
      st.config.maxJitterMs = Math.min(10000, Math.floor(partial.maxJitterMs));
    }
    if (typeof partial.maxSingleWaitMs === 'number' && partial.maxSingleWaitMs >= 1000) {
      st.config.maxSingleWaitMs = Math.min(60000, Math.floor(partial.maxSingleWaitMs));
    }
  }

  clearPause(provider?: ApiProviderName): void {
    const list: ApiProviderName[] = provider ? [provider] : ['gemini', 'mistral'];
    for (const p of list) {
      const st = this.states[p];
      st.pausedUntilMs = 0;
      st.clearTimer();
      this.pump(p);
    }
  }

  getSnapshot(provider?: ApiProviderName): ProviderQueueSnapshot[] {
    const list: ApiProviderName[] = provider ? [provider] : ['gemini', 'mistral'];
    const now = Date.now();
    return list.map((p) => {
      const st = this.states[p];
      return {
        provider: p,
        config: { ...st.config },
        activeCount: st.activeCount,
        queuedCount: st.queue.length,
        pausedUntil: st.pausedUntilMs > now ? new Date(st.pausedUntilMs).toISOString() : null,
        totalRequests: st.totalRequests,
        totalRetries: st.totalRetries,
        totalRateLimits: st.totalRateLimits,
        totalQuotaExhausted: st.totalQuotaExhausted,
        totalTransientErrors: st.totalTransientErrors,
        totalPermanentErrors: st.totalPermanentErrors,
        lastError: st.lastError,
        lastErrorAt: st.lastErrorAt,
      };
    });
  }

  resetStats(provider?: ApiProviderName): void {
    const list: ApiProviderName[] = provider ? [provider] : ['gemini', 'mistral'];
    for (const p of list) {
      const st = this.states[p];
      st.pausedUntilMs = 0;
      st.lastDispatchMs = 0;
      st.totalRequests = 0;
      st.totalRetries = 0;
      st.totalRateLimits = 0;
      st.totalQuotaExhausted = 0;
      st.totalTransientErrors = 0;
      st.totalPermanentErrors = 0;
      st.lastError = null;
      st.lastErrorAt = null;
    }
  }

  computeBackoffMs(
    provider: ApiProviderName,
    attempt: number,
    retryAfterMs: number | null,
    category: ApiErrorCategory,
    maxSingleWaitOverride?: number,
  ): number {
    const cfg = this.states[provider].config;
    const hardCap = Math.min(60_000, maxSingleWaitOverride ?? cfg.maxSingleWaitMs ?? 45_000);
    const multiplier = category === 'rate_limit' ? 1.5 : 1;
    const exp = Math.min(
      cfg.maxBackoffMs,
      Math.round(cfg.baseBackoffMs * multiplier * Math.pow(2, Math.max(0, attempt - 1))),
    );
    const jitter = cfg.maxJitterMs > 0 ? Math.round(this.randomImpl() * cfg.maxJitterMs) : 0;
    const computed = Math.min(hardCap, cfg.maxBackoffMs + cfg.maxJitterMs, exp + jitter);
    if (retryAfterMs !== null && retryAfterMs > 0) {
      // Honor Retry-After cleanly while strictly enforcing hardCap so a 3-hour quota reset NEVER hangs the worker
      const smallJitter = cfg.maxJitterMs > 0 ? Math.round(this.randomImpl() * Math.min(500, cfg.maxJitterMs)) : 0;
      return Math.min(hardCap, Math.max(retryAfterMs + smallJitter, computed));
    }
    return computed;
  }

  /**
   * Enqueue a single attempt onto the provider's concurrency-limited, cooldown-paced FIFO queue.
   */
  private enqueueSingleAttempt<T>(provider: ApiProviderName, fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(new Error('Request aborted before dispatch'));
    }
    const st = this.states[provider];
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask = {
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
        signal,
      };
      if (signal) {
        const onAbort = () => {
          const idx = st.queue.indexOf(task);
          if (idx >= 0) {
            st.queue.splice(idx, 1);
            reject(new Error('Request aborted while queued'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
      st.queue.push(task);
      this.pump(provider);
    });
  }

  private pump(provider: ApiProviderName): void {
    const st = this.states[provider];
    while (st.queue.length > 0 && st.activeCount < st.config.maxConcurrency) {
      const now = Date.now();
      // Respect shared pause window (from 429 Retry-After, capped at 45s) and inter-request cooldown
      const waitPause = Math.min(45_000, st.pausedUntilMs - now);
      const waitInterval = st.lastDispatchMs > 0 ? st.lastDispatchMs + st.config.minIntervalMs - now : 0;
      const waitMs = Math.max(waitPause, waitInterval);
      if (waitMs > 0) {
        st.schedulePump(waitMs, () => this.pump(provider));
        return;
      }

      const task = st.queue.shift()!;
      if (task.signal?.aborted) {
        task.reject(new Error('Request aborted while queued'));
        continue;
      }

      st.activeCount += 1;
      st.totalRequests += 1;
      st.lastDispatchMs = Date.now();

      Promise.resolve()
        .then(() => task.fn())
        .then(
          (res) => {
            st.activeCount = Math.max(0, st.activeCount - 1);
            task.resolve(res);
            this.pump(provider);
          },
          (err) => {
            st.activeCount = Math.max(0, st.activeCount - 1);
            task.reject(err);
            this.pump(provider);
          },
        );
    }
  }

  /**
   * Execute an API call through the provider queue with automatic classification,
   * Retry-After honoring (capped against multi-hour quota hangs), exponential backoff + jitter,
   * and immediate fail-fast on daily/billing quota exhaustion so fallback models/providers run immediately.
   */
  async schedule<T>(
    provider: ApiProviderName,
    fn: () => Promise<T>,
    options: ScheduleOptions = {},
  ): Promise<T> {
    const st = this.states[provider];
    const maxRetries = typeof options.maxRetries === 'number' ? Math.max(0, options.maxRetries) : st.config.maxRetries;
    const hardCap = options.maxSingleWaitMs ?? st.config.maxSingleWaitMs ?? 45_000;
    const label = options.label || `${provider} request`;
    let attempt = 0;

    while (true) {
      if (options.signal?.aborted) {
        throw new Error(`${label} aborted`);
      }
      try {
        return await this.enqueueSingleAttempt(provider, fn, options.signal);
      } catch (err) {
        const category = classifyApiError(err);
        const statusCode = extractStatusCode(err);
        const retryAfterMs = extractRetryAfterMs(err);
        const errMsg = String((err as { message?: string } | null)?.message || err || 'Unknown API error');

        st.lastError = errMsg.slice(0, 300);
        st.lastErrorAt = new Date().toISOString();

        if (category === 'quota_exhausted') {
          st.totalQuotaExhausted += 1;
          st.totalRateLimits += 1;
        } else if (category === 'rate_limit') {
          st.totalRateLimits += 1;
        } else if (category === 'permanent') {
          st.totalPermanentErrors += 1;
        } else {
          st.totalTransientErrors += 1;
        }

        // Permanent errors are NEVER retried
        if (category === 'permanent') {
          throw err;
        }

        // Daily/billing quota exhaustion or absurd Retry-After (> hardCap):
        // Fail fast IMMEDIATELY without sleeping hours so fallback model/provider can execute right away!
        if (category === 'quota_exhausted' || (retryAfterMs !== null && retryAfterMs > hardCap)) {
          throw new StructuredApiError(
            `${label}: Provider quota exhausted${retryAfterMs ? ` (Retry-After ${Math.round(retryAfterMs / 1000)}s exceeds max in-worker wait)` : ''} — switching fallback / marking retry_waiting`,
            {
              status: statusCode || 429,
              retryAfterMs,
              category: 'quota_exhausted',
              provider,
              cause: err,
            },
          );
        }

        // Retry budget exhausted
        if (attempt >= maxRetries) {
          throw err;
        }

        attempt += 1;
        st.totalRetries += 1;

        const delayMs = this.computeBackoffMs(provider, attempt, retryAfterMs, category, hardCap);
        const nextRetryAtMs = Date.now() + delayMs;

        // Short shared pause window ONLY for transient RPM 429s (strictly capped by hardCap)
        if (category === 'rate_limit') {
          st.pausedUntilMs = Math.max(st.pausedUntilMs, Math.min(Date.now() + hardCap, nextRetryAtMs));
        }

        const notice: RetryNotice = {
          provider,
          label,
          attempt,
          maxRetries,
          delayMs,
          nextRetryAt: new Date(nextRetryAtMs).toISOString(),
          category,
          statusCode,
          retryAfterMs,
          reason:
            category === 'rate_limit'
              ? `Rate limited (${statusCode || 429})${retryAfterMs ? ` [Retry-After ${Math.round(retryAfterMs / 1000)}s]` : ''} — waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${maxRetries}`
              : `Transient error (${statusCode || 'network/timeout'}) — waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${maxRetries}`,
        };

        console.log(`[ApiRateLimiter:${provider}] ${label}: ${notice.reason}`);
        if (options.onRetry) {
          try {
            options.onRetry(notice);
          } catch {
            // Never let telemetry callback break retry loop
          }
        }

        await this.sleepImpl(delayMs, options.signal);
      }
    }
  }
}

function defaultAbortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Sleep aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Sleep aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const apiRateLimiter = new ApiRateLimiter();
