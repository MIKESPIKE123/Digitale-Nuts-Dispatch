// Dexie database setup for offline-first storage
// Schema: dossiers, vaststellingen, fotos, queue, settings
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.7/dist/dexie.mjs';

export const db = new Dexie('dnuts');

// v1 schema
db.version(1).stores({
  dossiers: 'id, humanId, gipodId, status, updatedAt',
  vaststellingen: 'id, dossierId, updatedAt, codeNutsCategorie',
  fotos: 'id, dossierId, vaststellingId, uploaded, createdAt',
  queue: '++qid, entity, op, key, updatedAt, tries',
  settings: 'key'
});

// Status enum
export const Status = Object.freeze({
  NIEUW: 'NIEUW',
  OPMETING: 'OPMETING',
  INGEDIEND: 'INGEDIEND',
  GOEDGEKEURD: 'GOEDGEKEURD',
  UITGEVOERD: 'UITGEVOERD',
  AFGEWERKT: 'AFGEWERKT'
});

export default db;
