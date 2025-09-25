import { Status } from './db.js';

export const isFinal = (s) => s === Status.AFGEWERKT;

export const nextStatus = (s) => ({
  [Status.NIEUW]: Status.OPMETING,
  [Status.OPMETING]: Status.INGEDIEND,
  [Status.INGEDIEND]: Status.GOEDGEKEURD,
  [Status.GOEDGEKEURD]: Status.UITGEVOERD,
  [Status.UITGEVOERD]: Status.AFGEWERKT
})[s] ?? s;
