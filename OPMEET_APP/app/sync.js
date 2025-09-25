// Sync engine: queue + background sync + simple stub adapters
import { db } from './db.js';

const syncAdapter = {
  async upsert(entity, payload) {
    // Simulate network and server-side id assignment
    await sleep(300);
    const out = structuredClone(payload);
    if (out?.id?.startsWith?.('tmp_')) out.id = crypto.randomUUID();
    return { ok: true, serverPayload: out };
  },
  async uploadFile(fileBlob, meta) {
    await sleep(300);
    // Return a fake URL; replace with real upload later
    return { ok: true, url: `blob://${meta.id}` };
  }
};

export async function enqueue(entity, op, key, payload) {
  try {
    await db.queue.add({ entity, op, key, payload, updatedAt: new Date().toISOString(), tries: 0 });
    // Kick a sync soon
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => void syncAll());
    } else {
      setTimeout(() => void syncAll(), 250);
    }
  } catch (e) {
    console.error('enqueue failed', e);
  }
}

let syncing = false;
export async function syncAll() {
  if (syncing) return; // avoid re-entrancy
  if (!navigator.onLine) return;
  syncing = true;
  try {
    const items = await db.queue.orderBy('qid').toArray();
    for (const it of items) {
      try {
        await processQueueItem(it);
        await db.queue.delete(it.qid);
      } catch (e) {
        const tries = (it.tries ?? 0) + 1;
        await db.queue.update(it.qid, { tries, updatedAt: new Date().toISOString() });
        const delay = Math.min(1000 * (2 ** tries), 60000);
        await sleep(delay);
      }
      // Allow UI to breathe
      await sleep(50);
    }
  } finally {
    syncing = false;
  }
}

async function processQueueItem(it) {
  if (it.entity === 'foto' && it.op === 'upload') {
    const f = await db.fotos.get(it.key);
    if (!f) return;
    const res = await syncAdapter.uploadFile(f.blob, { id: f.id, dossierId: f.dossierId });
    if (res.ok) await db.fotos.update(f.id, { uploaded: true, url: res.url });
    return;
  }
  // generic upsert
  const res = await syncAdapter.upsert(it.entity, it.payload);
  if (res?.ok && it.entity === 'dossier') {
    const oldId = it.payload?.id;
    const newId = res.serverPayload?.id;
    if (oldId && newId && oldId !== newId) {
      await remapDossierId(oldId, newId);
    }
  }
}

async function remapDossierId(oldId, newId) {
  const d = await db.dossiers.get(oldId);
  if (d) {
    await db.dossiers.put({ ...d, id: newId });
    await db.dossiers.delete(oldId);
  }
  await db.vaststellingen.where('dossierId').equals(oldId).modify(v => { v.dossierId = newId; });
  await db.fotos.where('dossierId').equals(oldId).modify(f => { f.dossierId = newId; });
  await db.queue.where('key').equals(oldId).modify(q => { q.key = newId; });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// status badge helpers
export async function getQueueSize() { try { return await db.queue.count(); } catch { return 0; } }

// online fallback trigger
window.addEventListener('online', () => { void syncAll(); });

// Allow SW background sync to trigger a sync via postMessage
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker?.addEventListener?.('message', (ev) => {
    if (ev.data?.type === 'syncNow') { void syncAll(); }
  });
}

// Example API for creating dossier (can be used by app code later)
export async function createDossier(record) {
  try {
    await db.dossiers.put(record);
    await enqueue('dossier', 'upsert', record.id, { ...record, version: 1 });
  } catch (e) {
    console.error('createDossier failed', e);
  }
}
