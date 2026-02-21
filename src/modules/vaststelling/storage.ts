import type {
  ActiveInspectorSession,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
  DNVaststellingSyncSettings,
} from "./contracts";
import type { Inspector } from "../../types";
import {
  ACTIVE_INSPECTOR_SESSION_KEY,
  DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS,
  DN_VASTSTELLING_RECORDS_KEY,
  DN_VASTSTELLING_SYNC_QUEUE_KEY,
  DN_VASTSTELLING_SYNC_SETTINGS_KEY,
  getVaststellingRepository,
} from "./repository";

export {
  ACTIVE_INSPECTOR_SESSION_KEY,
  DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS,
  DN_VASTSTELLING_RECORDS_KEY,
  DN_VASTSTELLING_SYNC_QUEUE_KEY,
  DN_VASTSTELLING_SYNC_SETTINGS_KEY,
};

export const DN_VASTSTELLING_STORAGE_EVENT = "dn-vaststelling-storage-updated";

function emitStorageUpdatedEvent(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(DN_VASTSTELLING_STORAGE_EVENT));
}

export async function loadActiveInspectorSession(
  inspectors: Inspector[]
): Promise<ActiveInspectorSession | null> {
  try {
    const repository = getVaststellingRepository();
    return await repository.loadActiveInspectorSession(inspectors);
  } catch {
    return null;
  }
}

export async function saveActiveInspectorSession(session: ActiveInspectorSession): Promise<void> {
  try {
    const repository = getVaststellingRepository();
    await repository.saveActiveInspectorSession(session);
    emitStorageUpdatedEvent();
  } catch (error) {
    console.error("DN Vaststelling: kon actieve sessie niet bewaren.", error);
  }
}

export async function clearActiveInspectorSession(): Promise<void> {
  try {
    const repository = getVaststellingRepository();
    await repository.clearActiveInspectorSession();
    emitStorageUpdatedEvent();
  } catch (error) {
    console.error("DN Vaststelling: kon actieve sessie niet wissen.", error);
  }
}

export async function loadDNVaststellingRecords(): Promise<DNVaststellingRecord[]> {
  try {
    const repository = getVaststellingRepository();
    return await repository.loadDNVaststellingRecords();
  } catch {
    return [];
  }
}

export async function saveDNVaststellingRecords(records: DNVaststellingRecord[]): Promise<void> {
  try {
    const repository = getVaststellingRepository();
    await repository.saveDNVaststellingRecords(records);
    emitStorageUpdatedEvent();
  } catch (error) {
    console.error("DN Vaststelling: kon records niet bewaren (mogelijk te grote payload).", error);
  }
}

export async function loadDNVaststellingSyncQueue(): Promise<DNVaststellingSyncItem[]> {
  try {
    const repository = getVaststellingRepository();
    return await repository.loadDNVaststellingSyncQueue();
  } catch {
    return [];
  }
}

export async function saveDNVaststellingSyncQueue(items: DNVaststellingSyncItem[]): Promise<void> {
  try {
    const repository = getVaststellingRepository();
    await repository.saveDNVaststellingSyncQueue(items);
    emitStorageUpdatedEvent();
  } catch (error) {
    console.error("DN Vaststelling: kon sync-queue niet bewaren.", error);
  }
}

export async function loadDNVaststellingSyncSettings(): Promise<DNVaststellingSyncSettings> {
  try {
    const repository = getVaststellingRepository();
    return await repository.loadDNVaststellingSyncSettings();
  } catch {
    return DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS;
  }
}

export async function saveDNVaststellingSyncSettings(
  settings: DNVaststellingSyncSettings
): Promise<void> {
  try {
    const repository = getVaststellingRepository();
    await repository.saveDNVaststellingSyncSettings(settings);
    emitStorageUpdatedEvent();
  } catch (error) {
    console.error("DN Vaststelling: kon sync-instellingen niet bewaren.", error);
  }
}
