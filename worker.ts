// Cloudflare Worker entrypoint with Static Assets & D1 Database Bindings
// Handles API routes, D1 database storage, R2 asset streaming, and asset fallback

export interface D1Database {
  exec(query: string): Promise<any>;
  prepare(query: string): any;
  batch?(statements: any[]): Promise<any[]>;
}

export interface Fetcher {
  fetch(request: Request | string, init?: any): Promise<Response>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB?: D1Database;
  ASSETS?: Fetcher;
  DEFAULT_R2_PUBLIC_DOMAIN?: string;
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
}

const R2_FALLBACK_BASE = 'https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev';

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

async function ensureD1Tables(db: D1Database) {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS mock_tests (
        id TEXT PRIMARY KEY,
        title TEXT,
        data TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS mock_questions (
        test_id TEXT PRIMARY KEY,
        questions TEXT,
        count INTEGER,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT,
        data TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        data TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS store_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      );
    `);
  } catch (e) {
    console.warn('ensureD1Tables note:', e);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return jsonResponse({
        status: 'healthy',
        platform: 'cloudflare_workers',
        hasD1: Boolean(env.DB),
        database_name: 'neetmbbsdoctorsstore',
        database_id: 'daf5a141-af4a-4db6-b10d-ac3bbab28b72',
        timestamp: new Date().toISOString()
      });
    }

    // 1. R2 File Streaming & Proxy route
    if (url.pathname.startsWith('/api/r2/file/')) {
      const key = url.pathname.replace('/api/r2/file/', '').replace(/^\/+/, '');
      if (!key) {
        return new Response('Key required', { status: 400 });
      }

      const r2Url = `${R2_FALLBACK_BASE}/${key}`;
      try {
        const upstream = await fetch(r2Url, {
          headers: {
            'User-Agent': 'Cloudflare-Worker-R2-Proxy'
          }
        });
        if (upstream.ok) {
          const respHeaders = new Headers(upstream.headers);
          respHeaders.set('Access-Control-Allow-Origin', '*');
          respHeaders.set('Cache-Control', 'public, max-age=86400');
          return new Response(upstream.body, {
            status: upstream.status,
            headers: respHeaders
          });
        }
      } catch (err) {
        console.error('R2 stream error:', err);
      }
      return new Response('Image not found', { status: 404 });
    }

    // 2. Cloudflare D1 Database APIs
    if (url.pathname.startsWith('/api/d1/')) {
      if (!env.DB) {
        return jsonResponse({
          success: false,
          error: 'D1 database binding "DB" is not attached to this worker. Run wrangler d1 migrations or ensure binding is DB.',
          notice: 'Fallback to Firebase / local storage is active.'
        }, 503);
      }

      const db = env.DB;
      await ensureD1Tables(db);

      // GET /api/d1/tests
      if (url.pathname === '/api/d1/tests' && request.method === 'GET') {
        try {
          const { results } = await db.prepare('SELECT id, title, data, updated_at FROM mock_tests ORDER BY updated_at DESC').all();
          const tests = (results || []).map((r: any) => {
            try {
              return JSON.parse(r.data);
            } catch {
              return null;
            }
          }).filter(Boolean);
          return jsonResponse({ success: true, tests, count: tests.length });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message, tests: [] }, 500);
        }
      }

      // POST /api/d1/tests (Save all or one test)
      if (url.pathname === '/api/d1/tests' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const testsToSave = Array.isArray(body.tests) ? body.tests : (body.test ? [body.test] : []);
          const now = new Date().toISOString();

          for (const t of testsToSave) {
            if (!t || !t.id) continue;
            // Clean test metadata to never store huge questions embedded in the row
            const { questions: _, ...cleanTest } = t;
            await db.prepare(`
              INSERT INTO mock_tests (id, title, data, updated_at)
              VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(id) DO UPDATE SET
                title = ?2,
                data = ?3,
                updated_at = ?4
            `).bind(cleanTest.id, cleanTest.title || 'Untitled Test', JSON.stringify(cleanTest), now).run();
          }

          return jsonResponse({ success: true, savedCount: testsToSave.length, timestamp: now });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      // DELETE /api/d1/tests
      if (url.pathname === '/api/d1/tests' && request.method === 'DELETE') {
        try {
          const testId = url.searchParams.get('id');
          if (testId) {
            await db.prepare('DELETE FROM mock_tests WHERE id = ?').bind(testId).run();
            await db.prepare('DELETE FROM mock_questions WHERE test_id = ?').bind(testId).run();
            return jsonResponse({ success: true, deletedId: testId });
          }
          return jsonResponse({ success: false, error: 'id param required' }, 400);
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      // GET /api/d1/questions?testId=xxx
      if (url.pathname === '/api/d1/questions' && request.method === 'GET') {
        const testId = url.searchParams.get('testId');
        if (!testId) {
          return jsonResponse({ success: false, error: 'testId param required' }, 400);
        }
        try {
          const row: any = await db.prepare('SELECT questions, count, updated_at FROM mock_questions WHERE test_id = ?').bind(testId).first();
          if (row && row.questions) {
            const parsed = JSON.parse(row.questions);
            return jsonResponse({ success: true, testId, questions: parsed, count: row.count });
          }
          return jsonResponse({ success: true, testId, questions: [], count: 0 });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message, questions: [] }, 500);
        }
      }

      // POST /api/d1/questions ({ testId, questions })
      if (url.pathname === '/api/d1/questions' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { testId, questions } = body;
          if (!testId || !Array.isArray(questions)) {
            return jsonResponse({ success: false, error: 'testId and questions array required' }, 400);
          }

          const now = new Date().toISOString();
          await db.prepare(`
            INSERT INTO mock_questions (test_id, questions, count, updated_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(test_id) DO UPDATE SET
              questions = ?2,
              count = ?3,
              updated_at = ?4
          `).bind(testId, JSON.stringify(questions), questions.length, now).run();

          // Also update question count in mock_tests table
          const existingTestRow: any = await db.prepare('SELECT data FROM mock_tests WHERE id = ?').bind(testId).first();
          if (existingTestRow && existingTestRow.data) {
            try {
              const testObj = JSON.parse(existingTestRow.data);
              testObj.questionsCount = questions.length;
              testObj.totalQuestions = questions.length;
              await db.prepare('UPDATE mock_tests SET data = ?, updated_at = ? WHERE id = ?')
                .bind(JSON.stringify(testObj), now, testId).run();
            } catch {}
          }

          return jsonResponse({ success: true, testId, count: questions.length, timestamp: now });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      // GET /api/d1/products
      if (url.pathname === '/api/d1/products' && request.method === 'GET') {
        try {
          const { results } = await db.prepare('SELECT id, title, data FROM products ORDER BY updated_at DESC').all();
          const products = (results || []).map((r: any) => {
            try { return JSON.parse(r.data); } catch { return null; }
          }).filter(Boolean);
          return jsonResponse({ success: true, products });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message, products: [] }, 500);
        }
      }

      // POST /api/d1/products
      if (url.pathname === '/api/d1/products' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const prods = Array.isArray(body.products) ? body.products : (body.product ? [body.product] : []);
          const now = new Date().toISOString();
          for (const p of prods) {
            if (!p || !p.id) continue;
            await db.prepare(`
              INSERT INTO products (id, title, data, updated_at)
              VALUES (?1, ?2, ?3, ?4)
              ON CONFLICT(id) DO UPDATE SET title = ?2, data = ?3, updated_at = ?4
            `).bind(p.id, p.title || '', JSON.stringify(p), now).run();
          }
          return jsonResponse({ success: true, saved: prods.length });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      // POST /api/d1/sync (Universal sync for products, orders, tests, questions)
      if (url.pathname === '/api/d1/sync' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const now = new Date().toISOString();
          let syncedItems = 0;

          if (Array.isArray(body.tests)) {
            for (const t of body.tests) {
              const { questions: _, ...cleanTest } = t;
              await db.prepare(`
                INSERT INTO mock_tests (id, title, data, updated_at)
                VALUES (?1, ?2, ?3, ?4)
                ON CONFLICT(id) DO UPDATE SET title = ?2, data = ?3, updated_at = ?4
              `).bind(cleanTest.id, cleanTest.title || '', JSON.stringify(cleanTest), now).run();
              syncedItems++;
            }
          }

          if (body.testQuestions && typeof body.testQuestions === 'object') {
            for (const [testId, qs] of Object.entries(body.testQuestions)) {
              if (Array.isArray(qs)) {
                await db.prepare(`
                  INSERT INTO mock_questions (test_id, questions, count, updated_at)
                  VALUES (?1, ?2, ?3, ?4)
                  ON CONFLICT(test_id) DO UPDATE SET questions = ?2, count = ?3, updated_at = ?4
                `).bind(testId, JSON.stringify(qs), qs.length, now).run();
                syncedItems++;
              }
            }
          }

          return jsonResponse({ success: true, syncedItems, timestamp: now });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }
    }

    // Fallback: Serve static assets via Cloudflare Assets Binding (as shown in docs!)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static assets binding not found', { status: 500 });
  }
};
