// NCERTify AI Parser 3.0 - Mistral OCR API Service
// Official API: mistral-ocr-latest with include_image_base64: true
// All requests are routed through the centralized ApiRateLimiter (429 / Retry-After / backoff / concurrency caps).

import { apiRateLimiter, RetryNotice, StructuredApiError } from './apiRateLimiter.js';

export interface MistralOcrImage {
  id: string;
  top_left_x?: number;
  top_left_y?: number;
  bottom_right_x?: number;
  bottom_right_y?: number;
  image_base64?: string; // base64 string or data URL
}

export interface MistralOcrPage {
  index: number;
  markdown: string;
  images: MistralOcrImage[];
  dimensions?: {
    dpi: number;
    height: number;
    width: number;
  };
}

export interface MistralOcrResponse {
  pages: MistralOcrPage[];
  model: string;
  rateLimited?: boolean;
  error?: string;
  statusCode?: number;
  usage_info?: {
    pages_processed: number;
    doc_size_bytes?: number;
  };
}

export interface MistralCallOptions {
  model?: string;
  label?: string;
  maxRetries?: number;
  onRetry?: (notice: RetryNotice) => void;
  throwOnError?: boolean;
}

export class MistralOcrService {
  private explicitApiKey?: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey?: string) {
    this.explicitApiKey = apiKey;
  }

  private getApiKey(): string {
    return (this.explicitApiKey || process.env.MISTRAL_API_KEY || '').trim();
  }

  public isConfigured(): boolean {
    return this.getApiKey().length > 10;
  }

  /**
   * Uploads a PDF to Mistral Files API (purpose='ocr')
   */
  public async uploadPdfFile(
    pdfBuffer: Buffer,
    fileName: string = 'document.pdf',
    options?: MistralCallOptions,
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new StructuredApiError('MISTRAL_API_KEY is not configured in the server environment.', {
        status: 401,
        category: 'permanent',
        provider: 'mistral',
      });
    }

    return apiRateLimiter.schedule(
      'mistral',
      async () => {
        const formData = new FormData();
        formData.append('purpose', 'ocr');
        const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
        formData.append('file', blob, fileName);

        const res = await fetch(`${this.baseUrl}/files`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new StructuredApiError(`Mistral File Upload failed (HTTP ${res.status}): ${errText.slice(0, 260)}`, {
            status: res.status,
            retryAfterHeader: res.headers.get('retry-after'),
            provider: 'mistral',
          });
        }

        const data = (await res.json()) as { id: string };
        return data.id;
      },
      {
        label: options?.label || `Mistral upload ${fileName}`,
        maxRetries: options?.maxRetries,
        onRetry: options?.onRetry,
      },
    );
  }

  /**
   * Retrieves a temporary signed download URL for an uploaded file
   */
  public async getSignedUrl(fileId: string, options?: MistralCallOptions): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new StructuredApiError('MISTRAL_API_KEY is not configured in the server environment.', {
        status: 401,
        category: 'permanent',
        provider: 'mistral',
      });
    }

    return apiRateLimiter.schedule(
      'mistral',
      async () => {
        const res = await fetch(`${this.baseUrl}/files/${fileId}/signed_url`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new StructuredApiError(`Mistral get_signed_url failed (HTTP ${res.status}): ${errText.slice(0, 260)}`, {
            status: res.status,
            retryAfterHeader: res.headers.get('retry-after'),
            provider: 'mistral',
          });
        }

        const data = (await res.json()) as { url: string };
        return data.url;
      },
      {
        label: options?.label || `Mistral signed_url ${fileId}`,
        maxRetries: options?.maxRetries,
        onRetry: options?.onRetry,
      },
    );
  }

  /**
   * Process PDF document via Mistral OCR API
   */
  public async processDocument(
    documentUrl: string,
    pages?: number[],
    includeImageBase64: boolean = true,
    options?: MistralCallOptions,
  ): Promise<MistralOcrResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new StructuredApiError('MISTRAL_API_KEY is not configured in the server environment.', {
        status: 401,
        category: 'permanent',
        provider: 'mistral',
      });
    }

    const model = options?.model || 'mistral-ocr-latest';
    const payload: Record<string, unknown> = {
      model,
      document: {
        type: 'document_url',
        document_url: documentUrl,
      },
      include_image_base64: includeImageBase64,
    };
    if (pages && pages.length > 0) {
      payload.pages = pages;
    }

    return apiRateLimiter.schedule(
      'mistral',
      async () => {
        const res = await fetch(`${this.baseUrl}/ocr`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(35000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          throw new StructuredApiError(`Mistral OCR API error (HTTP ${res.status}): ${errText.slice(0, 260)}`, {
            status: res.status,
            retryAfterHeader: res.headers.get('retry-after'),
            provider: 'mistral',
          });
        }

        return (await res.json()) as MistralOcrResponse;
      },
      {
        label: options?.label || `Mistral document OCR`,
        maxRetries: options?.maxRetries,
        onRetry: options?.onRetry,
      },
    );
  }

  /**
   * Process single page image directly via Mistral OCR
   */
  public async processPageImage(
    imageBase64DataUrl: string,
    includeImageBase64: boolean = true,
    options?: MistralCallOptions,
  ): Promise<MistralOcrResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      const err = new StructuredApiError('MISTRAL_API_KEY is not configured in the server environment.', {
        status: 401,
        category: 'permanent',
        provider: 'mistral',
      });
      if (options?.throwOnError) throw err;
      return {
        pages: [],
        model: options?.model || 'mistral-ocr-latest',
        rateLimited: false,
        statusCode: 401,
        error: err.message,
      };
    }

    const model = options?.model || 'mistral-ocr-latest';
    const payload = {
      model,
      document: {
        type: 'image_url',
        image_url: imageBase64DataUrl,
      },
      include_image_base64: includeImageBase64,
    };

    try {
      return await apiRateLimiter.schedule(
        'mistral',
        async () => {
          const res = await fetch(`${this.baseUrl}/ocr`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(25000),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new StructuredApiError(`Mistral OCR error (HTTP ${res.status}): ${errText.slice(0, 260)}`, {
              status: res.status,
              retryAfterHeader: res.headers.get('retry-after'),
              provider: 'mistral',
            });
          }

          return (await res.json()) as MistralOcrResponse;
        },
        {
          label: options?.label || 'Mistral page OCR',
          maxRetries: options?.maxRetries,
          onRetry: options?.onRetry,
        },
      );
    } catch (err: any) {
      if (options?.throwOnError) throw err;
      const statusCode = err instanceof StructuredApiError ? err.status : undefined;
      return {
        pages: [],
        model,
        rateLimited: statusCode === 429,
        statusCode,
        error: err?.message || 'Mistral OCR request failed',
      };
    }
  }

  /**
   * Test connectivity to Mistral API
   */
  public async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'MISTRAL_API_KEY is not configured in server environment.' };
    }
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        const ocrModel = (data.data || []).find((m) => m.id.includes('ocr'));
        return { success: true, model: ocrModel?.id || 'mistral-ocr-latest' };
      }
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const mistralOcrService = new MistralOcrService();
