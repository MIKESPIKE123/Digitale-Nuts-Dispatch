// Photo pipeline: compress, read EXIF, store in IndexedDB
import * as ExifReader from 'https://cdn.jsdelivr.net/npm/exifreader@4.13.2/dist/exif-reader.esm.min.js';
import { db } from './db.js';

export async function addPhoto(file, { dossierId, vaststellingId } = {}) {
  try {
    const { blob, width, height } = await compressImage(file, 1600);
    const exif = await safeReadExif(file);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await db.fotos.put({ id, dossierId, vaststellingId, blob, exif, width, height, uploaded: false, createdAt });
    return id;
  } catch (e) {
    console.error('addPhoto failed', e);
    throw e;
  }
}

async function compressImage(file, maxDim = 1600) {
  // Try OffscreenCanvas path; fallback to HTMLCanvasElement when not supported
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    await pause();
    return { blob, width: w, height: h };
  }

  // Fallback for browsers without OffscreenCanvas
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
  await pause();
  return { blob, width: w, height: h };
}

async function safeReadExif(file) {
  try { return (await ExifReader.load(file)) ?? {}; } catch { return {}; }
}

function pause(ms = 150) { return new Promise(r => setTimeout(r, ms)); }
