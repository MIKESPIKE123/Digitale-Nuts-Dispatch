// ID helpers
export function newTempId() { return 'tmp_' + crypto.randomUUID(); }
export function newUuid() { return crypto.randomUUID(); }

let seq = 0;
export function humanIdFrom(seqBase = Date.now()) {
  seq += 1;
  const n = (seqBase + seq).toString().slice(-6).padStart(6, '0');
  return `ANT-2025-${n}`;
}
