import crypto from 'node:crypto';
import { UpstreamError, UpstreamRateLimitError } from '../../lib/errors.js';

export type JimiResponse<T> = {
  code: number;
  message?: string;
  result?: T;
  data?: unknown;
};

export type JimiTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | string;
  time?: string;
  account?: string;
  appKey?: string;
};

function utcTimestamp(): string {
  // yyyy-MM-dd HH:mm:ss in UTC
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function md5Upper(input: string): string {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex').toUpperCase();
}

function buildSign(params: Record<string, string>, appSecret: string): string {
  const keys = Object.keys(params)
    .filter((k) => k !== 'sign')
    .sort((a, b) => a.localeCompare(b));

  let query = appSecret;
  for (const key of keys) {
    const value = params[key];
    if (!key || value == null || value === '') continue;
    query += key + value;
  }
  query += appSecret;
  return md5Upper(query);
}

export class JimiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly appKey: string,
    private readonly appSecret: string,
  ) {}

  async call<T>(
    method: string,
    privateParams: Record<string, string>,
    opts?: { timeoutMs?: number; retryOnTokenInvalid?: () => Promise<void> },
  ): Promise<T> {
    const common: Record<string, string> = {
      method,
      timestamp: utcTimestamp(),
      app_key: this.appKey,
      sign_method: 'md5',
      v: '1.0',
      format: 'json',
      ...privateParams,
    };

    const sign = buildSign(common, this.appSecret);
    const payload: Record<string, string> = { ...common, sign };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 15000);
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: new URLSearchParams(payload).toString(),
        signal: controller.signal,
      });

      const json = (await res.json()) as JimiResponse<T>;
      if (json.code === 0) {
        if (json.result == null) {
          throw new UpstreamError('Respuesta del proveedor sin campo result', 502);
        }
        return json.result;
      }

      // Mapeo mínimo de errores comunes
      if (json.code === 1006) throw new UpstreamRateLimitError(json.message ?? 'Too frequently request');
      if (json.code === 1004 && opts?.retryOnTokenInvalid) {
        await opts.retryOnTokenInvalid();
        return await this.call<T>(method, privateParams, { ...opts, retryOnTokenInvalid: undefined });
      }

      const msg = json.message ? `${json.message} (code=${json.code})` : `Error proveedor (code=${json.code})`;
      throw new UpstreamError(msg, 502);
    } catch (e) {
      if (e instanceof UpstreamError || e instanceof UpstreamRateLimitError) throw e;
      if (e instanceof Error && e.name === 'AbortError') throw new UpstreamError('Timeout llamando proveedor', 504);
      throw new UpstreamError(e instanceof Error ? e.message : 'Error llamando proveedor', 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  async callWithData<T, D = unknown>(
    method: string,
    privateParams: Record<string, string>,
    opts?: { timeoutMs?: number; retryOnTokenInvalid?: () => Promise<void> },
  ): Promise<{ result: T; data: D | undefined }> {
    const common: Record<string, string> = {
      method,
      timestamp: utcTimestamp(),
      app_key: this.appKey,
      sign_method: 'md5',
      v: '1.0',
      format: 'json',
      ...privateParams,
    };

    const sign = buildSign(common, this.appSecret);
    const payload: Record<string, string> = { ...common, sign };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 15000);
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: new URLSearchParams(payload).toString(),
        signal: controller.signal,
      });

      const json = (await res.json()) as JimiResponse<T>;
      if (json.code === 0) {
        if (json.result == null) {
          throw new UpstreamError('Respuesta del proveedor sin campo result', 502);
        }
        return { result: json.result, data: json.data as D | undefined };
      }

      if (json.code === 1006) throw new UpstreamRateLimitError(json.message ?? 'Too frequently request');
      if (json.code === 1004 && opts?.retryOnTokenInvalid) {
        await opts.retryOnTokenInvalid();
        return await this.callWithData<T, D>(method, privateParams, { ...opts, retryOnTokenInvalid: undefined });
      }

      const msg = json.message ? `${json.message} (code=${json.code})` : `Error proveedor (code=${json.code})`;
      throw new UpstreamError(msg, 502);
    } catch (e) {
      if (e instanceof UpstreamError || e instanceof UpstreamRateLimitError) throw e;
      if (e instanceof Error && e.name === 'AbortError') throw new UpstreamError('Timeout llamando proveedor', 504);
      throw new UpstreamError(e instanceof Error ? e.message : 'Error llamando proveedor', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}

