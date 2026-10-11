// High-Capacity Client-Side IndexedDB Storage for NEET MBBS Doctors Store
// Handles large payloads: 180 questions with high-res diagrams, PDF page canvases, and offline synchronization

import { MockTest, MockQuestion } from '../types';

const DB_NAME = 'neetmbbs_store_idb';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for tests metadata
        if (!db.objectStoreNames.contains('mock_tests')) {
          db.createObjectStore('mock_tests', { keyPath: 'id' });
        }

        // Store for test questions (keyed by testId)
        if (!db.objectStoreNames.contains('mock_questions')) {
          db.createObjectStore('mock_questions', { keyPath: 'testId' });
        }

        // Store for background PDF AI parsing jobs
        if (!db.objectStoreNames.contains('pdf_parse_jobs')) {
          db.createObjectStore('pdf_parse_jobs', { keyPath: 'jobId' });
        }

        // Store for high-res rendered PDF pages for instant diagram recropping
        if (!db.objectStoreNames.contains('pdf_page_cache')) {
          db.createObjectStore('pdf_page_cache', { keyPath: 'pageKey' });
        }

        // Key-Value fallback store
        if (!db.objectStoreNames.contains('key_val')) {
          db.createObjectStore('key_val', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

// ---------------- Mock Questions Storage ----------------

export async function idbSaveQuestions(testId: string, questions: MockQuestion[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mock_questions', 'readwrite');
      const store = tx.objectStore('mock_questions');
      const record = {
        testId,
        questions,
        updatedAt: new Date().toISOString(),
        count: questions.length
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.error('idbSaveQuestions error:', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn('idbSaveQuestions warning:', err);
  }
}

export async function idbGetQuestions(testId: string): Promise<MockQuestion[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('mock_questions', 'readonly');
      const store = tx.objectStore('mock_questions');
      const req = store.get(testId);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.questions)) {
          resolve(req.result.questions);
        } else {
          resolve([]);
        }
      };
      req.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    return [];
  }
}

export async function idbDeleteQuestions(testId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('mock_questions', 'readwrite');
      const store = tx.objectStore('mock_questions');
      const req = store.delete(testId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    // silent
  }
}

// ---------------- Mock Tests Storage ----------------

export async function idbSaveTests(tests: MockTest[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mock_tests', 'readwrite');
      const store = tx.objectStore('mock_tests');
      store.clear();
      tests.forEach(test => {
        // Strip heavy embedded questions array from the test metadata row to keep listing feather-light
        const { questions: _, ...cleanTest } = test;
        store.put(cleanTest);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveTests warning:', err);
  }
}

export async function idbGetTests(): Promise<MockTest[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('mock_tests', 'readonly');
      const store = tx.objectStore('mock_tests');
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    return [];
  }
}

// ---------------- Background PDF Parse Jobs & Page Caching ----------------

export interface BackgroundPdfParseJob {
  jobId: string;
  testId?: string;
  pdfName: string;
  totalPages: number;
  currentPage: number;
  status: 'idle' | 'parsing' | 'completed' | 'error' | 'stopped';
  statusMessage: string;
  questionsFound: number;
  figuresCropped: number;
  parsedQuestions: MockQuestion[];
  startedAt: string;
  completedAt?: string;
  targetTestTitle?: string;
  targetTestNumber?: string;
  targetDurationMinutes?: number;
  targetPrice?: number;
}

export async function idbSavePdfJob(job: BackgroundPdfParseJob): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pdf_parse_jobs', 'readwrite');
      const store = tx.objectStore('pdf_parse_jobs');
      const req = store.put(job);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbSavePdfJob warning:', err);
  }
}

export async function idbGetPdfJob(jobId: string): Promise<BackgroundPdfParseJob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_parse_jobs', 'readonly');
      const store = tx.objectStore('pdf_parse_jobs');
      const req = store.get(jobId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

export async function idbGetAllPdfJobs(): Promise<BackgroundPdfParseJob[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_parse_jobs', 'readonly');
      const store = tx.objectStore('pdf_parse_jobs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

export async function idbDeletePdfJob(jobId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_parse_jobs', 'readwrite');
      const store = tx.objectStore('pdf_parse_jobs');
      store.delete(jobId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    // silent
  }
}

// ---------------- High-Res PDF Page Image Cache for Diagram Recropping ----------------

export async function idbSavePageImage(jobId: string, pageNumber: number, dataUrl: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pdf_page_cache', 'readwrite');
      const store = tx.objectStore('pdf_page_cache');
      const pageKey = `${jobId}_p${pageNumber}`;
      const req = store.put({ pageKey, jobId, pageNumber, dataUrl, savedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbSavePageImage warning:', err);
  }
}

export async function idbGetPageImage(jobId: string, pageNumber: number): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_page_cache', 'readonly');
      const store = tx.objectStore('pdf_page_cache');
      const pageKey = `${jobId}_p${pageNumber}`;
      const req = store.get(pageKey);
      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

export async function idbFindPageImageForQuestion(pageNumber: number): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_page_cache', 'readonly');
      const store = tx.objectStore('pdf_page_cache');
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as Array<{ pageNumber: number; dataUrl: string }>;
        const match = records.find(r => r.pageNumber === pageNumber);
        resolve(match?.dataUrl || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}
