import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { randomToken } from './crypto.js';
import { badRequest } from './http.js';

// Only common raster image types are accepted. SVG is refused because it can carry script.
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
];
const MIME_BY_EXT: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.mime]));

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

type Visibility = 'public' | 'private';
interface StoredFile {
  body: Buffer;
  mimeType: string;
}
interface Storage {
  put(visibility: Visibility, key: string, body: Buffer, mimeType: string): Promise<void>;
  get(visibility: Visibility, key: string): Promise<StoredFile | null>;
  remove(visibility: Visibility, key: string): Promise<void>;
}

// Keys are generated here ("folder/random.ext"), but anything read back from a URL is checked too.
const SAFE_KEY = /^[a-z0-9-]+\/[A-Za-z0-9_-]+\.(png|jpg|webp)$/;

export const uploadRoot = path.resolve(env.UPLOAD_DIR);

/** Files on disk. Private files live outside the public folder and are never served statically. */
function localStorage(): Storage {
  const dirFor = (v: Visibility) => path.join(uploadRoot, v);
  return {
    async put(v, key, body) {
      await fs.mkdir(path.dirname(path.join(dirFor(v), key)), { recursive: true });
      await fs.writeFile(path.join(dirFor(v), key), body, { flag: 'wx' });
    },
    async get(v, key) {
      const body = await fs.readFile(path.join(dirFor(v), key)).catch(() => null);
      return body ? { body, mimeType: MIME_BY_EXT[key.split('.').pop()!] ?? 'application/octet-stream' } : null;
    },
    async remove(v, key) {
      await fs.unlink(path.join(dirFor(v), key)).catch(() => undefined);
    },
  };
}

/** Netlify Blobs, for Netlify Functions where the local filesystem does not persist. */
function netlifyBlobsStorage(): Storage {
  const store = async () => {
    const { getStore } = await import('@netlify/blobs');
    // Default (eventual) consistency: Lambda style functions cannot use strong reads, and
    // every key is new and random, so a stale read is never a wrong file.
    return getStore('lvf-uploads');
  };
  return {
    async put(v, key, body, mimeType) {
      const ab = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
      await (await store()).set(`${v}/${key}`, ab, { metadata: { mimeType } });
    },
    async get(v, key) {
      const res = await (await store()).getWithMetadata(`${v}/${key}`, { type: 'arrayBuffer' });
      if (!res) return null;
      return { body: Buffer.from(res.data), mimeType: String(res.metadata.mimeType ?? MIME_BY_EXT[key.split('.').pop()!] ?? 'application/octet-stream') };
    },
    async remove(v, key) {
      await (await store()).delete(`${v}/${key}`);
    },
  };
}

export const storage: Storage = env.STORAGE_DRIVER === 'netlify-blobs' ? netlifyBlobsStorage() : localStorage();

/** Validates the file by content (not by its claimed type) and stores it with a random name. */
export async function storeImage(file: Express.Multer.File | undefined, visibility: Visibility, folder: string) {
  if (!file) throw badRequest('Choose an image to upload.');
  const kind = SIGNATURES.find((s) => s.test(file.buffer));
  if (!kind) throw badRequest('Only PNG, JPEG or WebP images are allowed.');
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'general';
  const filename = `${safeFolder}/${randomToken(16)}.${kind.ext}`;
  await storage.put(visibility, filename, file.buffer, kind.mime);
  return { filename, mimeType: kind.mime, sizeBytes: file.size, url: visibility === 'public' ? `/uploads/${filename}` : null };
}

export async function readStored(filename: string, visibility: Visibility) {
  if (!SAFE_KEY.test(filename)) return null;
  return storage.get(visibility, filename);
}

export async function removeStored(filename: string, visibility: Visibility) {
  if (!SAFE_KEY.test(filename)) return;
  await storage.remove(visibility, filename);
}
