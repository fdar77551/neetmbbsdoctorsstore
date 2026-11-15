// NCERTify AI Parser 2.0 - Mistral OCR API Service
// Official API: mistral-ocr-latest / mistral-ocr-2512 with include_image_base64: true

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
  usage_info?: {
    pages_processed: number;
    doc_size_bytes?: number;
  };
}

export class MistralOcrService {
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || 'mstrl_lI2FZX73d3MJPivLFIPQQAwZ0PQZYS4v_1B17tc';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Uploads a PDF to Mistral Files API (purpose='ocr')
   */
  public async uploadPdfFile(pdfBuffer: Buffer, fileName: string = 'document.pdf'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Mistral API Key is not configured.');
    }

    const formData = new FormData();
    formData.append('purpose', 'ocr');
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);

    const res = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral File Upload failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.id; // file_id
  }

  /**
   * Retrieves a temporary signed download URL for an uploaded file
   */
  public async getSignedUrl(fileId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/files/${fileId}/signed_url`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral get_signed_url failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.url;
  }

  /**
   * Process PDF document via Mistral OCR API
   */
  public async processDocument(
    documentUrl: string, 
    pages?: number[],
    includeImageBase64: boolean = true
  ): Promise<MistralOcrResponse> {
    if (!this.isConfigured()) {
      throw new Error('Mistral API Key is not configured.');
    }

    const payload: any = {
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: documentUrl
      },
      include_image_base64: includeImageBase64
    };

    if (pages && pages.length > 0) {
      payload.pages = pages;
    }

    let retries = 3;
    let delay = 1500;

    while (retries > 0) {
      try {
        const res = await fetch(`${this.baseUrl}/ocr`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 429) {
          // Rate limited, wait and retry
          console.warn(`[MistralOCR] Rate limit 429 received, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          retries--;
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Mistral OCR API error (${res.status}): ${errText}`);
        }

        const data: MistralOcrResponse = await res.json();
        return data;
      } catch (e: any) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }

    throw new Error('Mistral OCR API request failed after retries.');
  }

  /**
   * Process single page image directly via Mistral OCR
   */
  public async processPageImage(
    imageBase64DataUrl: string,
    includeImageBase64: boolean = true
  ): Promise<MistralOcrResponse> {
    if (!this.isConfigured()) {
      throw new Error('Mistral API Key is not configured.');
    }

    const payload = {
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        image_url: imageBase64DataUrl
      },
      include_image_base64: includeImageBase64
    };

    let retries = 3;
    let delay = 3000;

    while (retries > 0) {
      try {
        const res = await fetch(`${this.baseUrl}/ocr`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          return await res.json();
        }

        if (res.status === 429) {
          retries--;
          const retryHeader = res.headers.get('retry-after');
          const waitMs = retryHeader ? Math.min(10000, parseInt(retryHeader, 10) * 1000) : delay;
          if (retries > 0) {
            console.log(`[MistralOCR] Rate limit 429 received, waiting ${waitMs}ms before retry (${retries} left)...`);
            await new Promise(r => setTimeout(r, waitMs));
            delay *= 2;
            continue;
          }
          // After retries exhausted, return graceful fallback rather than throwing uncaught error
          console.log(`[MistralOCR] Mistral 429 rate limit window active; delegating to Ghostscript OCR and Gemini visual parser.`);
          return {
            pages: [],
            model: 'mistral-ocr-rate-limited',
            rateLimited: true
          };
        }

        const err = await res.text();
        console.warn(`[MistralOCR] HTTP ${res.status}: ${err.slice(0, 200)}`);
        return {
          pages: [],
          model: 'mistral-ocr-error',
          rateLimited: res.status === 429
        };
      } catch (err: any) {
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        } else {
          return {
            pages: [],
            model: 'mistral-ocr-error',
            rateLimited: false
          };
        }
      }
    }

    return {
      pages: [],
      model: 'mistral-ocr-fallback',
      rateLimited: true
    };
  }

  /**
   * Test connectivity to Mistral API
   */
  public async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const ocrModel = (data.data || []).find((m: any) => m.id.includes('ocr'));
        return { success: true, model: ocrModel?.id || 'mistral-ocr-latest' };
      }
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const mistralOcrService = new MistralOcrService();
