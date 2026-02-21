import type { DNVaststellingMutablePayload, DNVaststellingRecord } from "./contracts";

export function updateDNVaststellingMutablePayload(
  record: DNVaststellingRecord,
  patch: Partial<DNVaststellingMutablePayload>
): DNVaststellingRecord {
  return {
    ...record,
    // Fase 0 regel: immutable context mag nooit overschreven worden via gewone updates.
    immutableContext: record.immutableContext,
    mutablePayload: {
      ...record.mutablePayload,
      ...patch,
    },
    updatedAt: new Date().toISOString(),
  };
}
