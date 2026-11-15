// NCERTify AI Parser 2.0 - Dedicated Cloudflare R2 & Local Disk Storage
// Namespace: parser2/jobs/{job_id}/... and parser2/db/...

import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';

const STORAGE_ROOT = path.resolve(process.cwd(), 'public', 'storage', 'parser2');

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export function getR2Bucket(): string {
  return process.env.CLOUDFLARE_R2_BUCKET || 'ncertify';
}

export function getR2Client(): S3Client | null {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY || '887e302ecc7e249de5f16198ddfb7bd4';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY || '20ddb02f48c59b9e1ae64dd1a164290e63396632633f0b49e2b5f310ba7fb79e';
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || 'https://d715d090a75efd8790b9a6da1e2f42d4.r2.cloudflarestorage.com';

  if (!accessKeyId || !secretAccessKey) return null;

  try {
    return new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  } catch (e) {
    console.warn('[Parser2R2] S3 Client init note:', e);
    return null;
  }
}

async function streamBodyToBuffer(stream: any): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export interface Parser2StorageResult {
  storageKey: string;
  publicUrl: string;
  byteSize: number;
  r2Synced?: boolean;
}

/**
 * Save binary asset to Parser 2.0 storage (Dual write: local public disk + Cloudflare R2)
 */
export async function uploadParser2Asset(
  jobId: string,
  category: 'source' | 'pages' | 'figures' | 'processed' | 'reports',
  fileName: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<Parser2StorageResult> {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const storageKey = `parser2/jobs/${jobId}/${category}/${safeFileName}`;

  // 1. Write to local storage for instant zero-latency preview
  const localDir = path.join(STORAGE_ROOT, 'jobs', jobId, category);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const localFilePath = path.join(localDir, safeFileName);
  fs.writeFileSync(localFilePath, buffer);

  // 2. Upload to Cloudflare R2 bucket and await confirmation
  let r2Synced = false;
  const s3 = getR2Client();
  const bucket = getR2Bucket();

  if (s3) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          'parser-version': '3.0',
          'job-id': jobId,
          'category': category
        }
      }));
      r2Synced = true;
    } catch (r2Err: any) {
      console.warn('[Parser2R2] Remote R2 upload note:', r2Err.message);
    }
  }

  const publicUrl = `/storage/parser2/jobs/${jobId}/${category}/${safeFileName}`;

  return {
    storageKey,
    publicUrl,
    byteSize: buffer.length,
    r2Synced
  };
}

/**
 * Read asset buffer from storage (Local Disk -> Cloudflare R2 -> Explicit Test-8 gold fallback ONLY for job-test-8)
 * CRITICAL: Never serves TEST_8's PDF for any unrelated jobId!
 */
export async function getParser2AssetBuffer(
  jobId: string,
  category: string,
  fileName: string
): Promise<Buffer | null> {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // 1. Check local file path (both safe name and raw name)
  const localFilePath = path.join(STORAGE_ROOT, 'jobs', jobId, category, safeFileName);
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }
  const rawFilePath = path.join(STORAGE_ROOT, 'jobs', jobId, category, fileName);
  if (fs.existsSync(rawFilePath)) {
    return fs.readFileSync(rawFilePath);
  }

  // 2. Check if any file in the local job directory matches for source PDFs
  const jobCategoryDir = path.join(STORAGE_ROOT, 'jobs', jobId, category);
  if (fs.existsSync(jobCategoryDir)) {
    const files = fs.readdirSync(jobCategoryDir);
    if (files.length > 0 && category === 'source' && (fileName.endsWith('.pdf') || fileName === 'questions.pdf')) {
      const targetLower = fileName.toLowerCase();
      const exactPdf = files.find(f => f.toLowerCase() === targetLower);
      if (exactPdf) return fs.readFileSync(path.join(jobCategoryDir, exactPdf));
      if (fileName === 'questions.pdf') {
        const anyPdf = files.find(f => f.toLowerCase().endsWith('.pdf') && !f.toLowerCase().includes('solution'));
        if (anyPdf) return fs.readFileSync(path.join(jobCategoryDir, anyPdf));
      }
    }
  }

  // 3. Read from Cloudflare R2 BEFORE any fallback (critical across container restarts)
  const s3 = getR2Client();
  const bucket = getR2Bucket();
  const storageKey = `parser2/jobs/${jobId}/${category}/${safeFileName}`;

  if (s3) {
    try {
      const resp = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey
      }));
      if (resp.Body) {
        const buf = await streamBodyToBuffer(resp.Body);
        const localDir = path.dirname(localFilePath);
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
        fs.writeFileSync(localFilePath, buf);
        return buf;
      }
    } catch (e: any) {
      const isNotFound =
        e.name === 'NoSuchKey' ||
        e.name === 'NotFound' ||
        e.$metadata?.httpStatusCode === 404 ||
        /does not exist|not found|NoSuchKey/i.test(e.message || '');
      if (!isNotFound) {
        console.warn('[Parser2R2] Read note:', e.message);
      }
    }
  }

  // 4. Legacy reference fallback ONLY for the historical Test 8 seed job (never contaminate other jobs!)
  if (category === 'source' && jobId.includes('test-8')) {
    if (fileName === 'questions.pdf' || fileName.includes('question')) {
      const goldRef = path.resolve(process.cwd(), 'public', 'assets', 'aistudio', 'TEST_8_94d1462e.pdf');
      if (fs.existsSync(goldRef)) return fs.readFileSync(goldRef);
    } else if (fileName === 'solutions.pdf' || fileName.includes('solution')) {
      const solRef = path.resolve(process.cwd(), 'public', 'assets', 'aistudio', 'SOLUTIONS_8_7a2997fc.pdf');
      if (fs.existsSync(solRef)) return fs.readFileSync(solRef);
    }
  }

  return null;
}

/**
 * Durable JSON helpers on Cloudflare R2 (namespace: parser2/db/...)
 */
export async function putR2Json(key: string, data: unknown): Promise<boolean> {
  const s3 = getR2Client();
  if (!s3) return false;
  try {
    const body = Buffer.from(JSON.stringify(data), 'utf-8');
    await s3.send(new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: body,
      ContentType: 'application/json'
    }));
    return true;
  } catch (e: any) {
    console.warn(`[Parser2R2] JSON write failed for ${key}:`, e.message);
    return false;
  }
}

export async function getR2Json<T>(key: string): Promise<T | null> {
  const s3 = getR2Client();
  if (!s3) return null;
  try {
    const resp = await s3.send(new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: key
    }));
    if (!resp.Body) return null;
    const buf = await streamBodyToBuffer(resp.Body);
    return JSON.parse(buf.toString('utf-8')) as T;
  } catch (e: any) {
    const isNotFound =
      e.name === 'NoSuchKey' ||
      e.name === 'NotFound' ||
      e.$metadata?.httpStatusCode === 404 ||
      /does not exist|not found|NoSuchKey/i.test(e.message || '');
    if (!isNotFound) {
      console.warn(`[Parser2R2] JSON read note for ${key}:`, e.message);
    }
    return null;
  }
}

export async function listR2Keys(prefix: string): Promise<string[]> {
  const s3 = getR2Client();
  if (!s3) return [];
  const keys: string[] = [];
  let continuationToken: string | undefined;
  try {
    do {
      const resp = await s3.send(new ListObjectsV2Command({
        Bucket: getR2Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken
      }));
      for (const obj of resp.Contents || []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (e: any) {
    console.warn(`[Parser2R2] List note for ${prefix}:`, e.message);
  }
  return keys;
}

export async function verifyR2ObjectExists(key: string): Promise<boolean> {
  const s3 = getR2Client();
  if (!s3) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: getR2Bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteR2Prefix(prefix: string): Promise<void> {
  const s3 = getR2Client();
  if (!s3) return;
  try {
    const keys = await listR2Keys(prefix);
    if (keys.length === 0) return;
    for (let i = 0; i < keys.length; i += 500) {
      const batch = keys.slice(i, i + 500).map(Key => ({ Key }));
      await s3.send(new DeleteObjectsCommand({
        Bucket: getR2Bucket(),
        Delete: { Objects: batch, Quiet: true }
      }));
    }
  } catch (e: any) {
    console.warn(`[Parser2R2] Delete prefix note for ${prefix}:`, e.message);
  }
}

/**
 * Cleanup job assets (both local disk and R2 job files)
 */
export async function deleteParser2JobAssets(jobId: string): Promise<void> {
  const localJobDir = path.join(STORAGE_ROOT, 'jobs', jobId);
  if (fs.existsSync(localJobDir)) {
    fs.rmSync(localJobDir, { recursive: true, force: true });
  }
  await deleteR2Prefix(`parser2/jobs/${jobId}/`);
  await deleteR2Prefix(`parser2/db/jobs/${jobId}/`);
}
