import { describe, expect, it } from "vitest";
import type { DNVaststellingRecord } from "./contracts";
import type { ParsedSchema } from "./schema";
import { validateDNVaststellingRecord } from "./validation";

function createSchema(
  fields: Array<{ key: string; label: string; required: boolean; type?: "input" | "textarea" | "select" | "multiselect" }>
): ParsedSchema {
  const items = fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type ?? "select",
    required: field.required,
    options: [],
  }));

  const fieldsByKey = Object.fromEntries(items.map((item) => [item.key, item]));
  const fieldsByLabel = Object.fromEntries(items.map((item) => [item.label.toLowerCase(), item]));

  return {
    sections: [
      {
        id: "basis",
        title: "Basis",
        items,
      },
    ],
    defaults: {
      inspectors: [],
      postcodes: [],
    },
    index: {
      fieldsByLabel,
      fieldsByKey,
    },
  };
}

const schema = createSchema([
  { key: "f1", label: "Statuscontrole", required: true },
  { key: "district", label: "District", required: true },
  { key: "ingreepType", label: "Type ingreep", required: true },
  { key: "fase", label: "Fase", required: true },
  { key: "verhardingType", label: "Verharding", required: true },
  { key: "kritiekeZone", label: "Kritieke zone", required: false },
  { key: "termijnHerstel", label: "Uiterste hersteldatum", required: true, type: "input" },
  { key: "status", label: "Status", required: true },
  { key: "heropenReden", label: "Heropeningsreden", required: false, type: "textarea" },
]);

const photoSchema = createSchema([
  { key: "district", label: "District", required: true },
  { key: "ingreepType", label: "Type ingreep", required: true },
  { key: "fase", label: "Fase", required: true },
  { key: "termijnHerstel", label: "Uiterste hersteldatum", required: true, type: "input" },
  { key: "status", label: "Status", required: true },
  { key: "fotoVoor_url", label: "Foto VOOR", required: false, type: "input" },
  { key: "fotoDetail_url", label: "Foto DETAIL", required: false, type: "input" },
  { key: "fotoNa_url", label: "Foto NA", required: false, type: "input" },
]);

function createRecord(): DNVaststellingRecord {
  return {
    id: "dnv-1",
    createdAt: "2026-02-15T12:00:00.000Z",
    updatedAt: "2026-02-15T12:00:00.000Z",
    completionState: "draft",
    inspectorSession: {
      inspectorId: "I1",
      inspectorName: "Toezichter AB",
      inspectorInitials: "AB",
      deviceId: "device-1",
      startedAt: "2026-02-15T12:00:00.000Z",
    },
    immutableContext: {
      workId: "work-1",
      dossierId: "dossier-1",
      bonuNummer: "BONU2026-00001",
      referentieId: "ref-1",
      gipodId: "19170001",
      straat: "Teststraat",
      huisnr: "1",
      postcode: "2000",
      district: "Antwerpen",
      nutsBedrijf: "Fluvius",
      locationSource: "exact",
      latitude: 51.2,
      longitude: 4.4,
      plannedVisitDate: "2026-02-16",
      visitType: "START",
      assignedInspectorId: "I1",
      assignedInspectorName: "Toezichter AB",
    },
    mutablePayload: {
      metaLocation: "Teststraat 1",
      formData: {
        f1: "OK",
        district: "Antwerpen",
        ingreepType: "sleuf",
        fase: "uitvoering",
        verhardingType: "beton",
        kritiekeZone: "nee",
        termijnHerstel: "2026-02-20",
        status: "in_behandeling",
      },
    },
    immutableFingerprint: "fingerprint",
  };
}

describe("validateDNVaststellingRecord", () => {
  it("accepts a valid record", () => {
    const result = validateDNVaststellingRecord(schema, createRecord());
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("flags required field and missing NOK responsible", () => {
    const record = createRecord();
    record.mutablePayload.metaLocation = "";
    record.mutablePayload.formData = {
      f1: "NOK - fout",
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "uitvoering",
      verhardingType: "beton",
      termijnHerstel: "2026-02-20",
      status: "in_behandeling",
    };

    const result = validateDNVaststellingRecord(schema, record);
    expect(result.isValid).toBe(false);
    expect(result.metaIssues).toBe(1);
    expect(result.nokResponsibleIssues).toBe(1);
  });

  it("requires termijnHerstel when fase is tijdelijk_herstel", () => {
    const record = createRecord();
    record.mutablePayload.formData = {
      ...record.mutablePayload.formData,
      fase: "tijdelijk_herstel",
      termijnHerstel: "",
    };

    const result = validateDNVaststellingRecord(schema, record);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.inputKey === "termijnHerstel")).toBe(true);
  });

  it("requires heropenReden after re-open trigger", () => {
    const record = createRecord();
    record.mutablePayload.reopenTriggeredAt = "2026-02-18T08:00:00.000Z";
    record.mutablePayload.formData = {
      ...record.mutablePayload.formData,
      heropenReden: "",
    };

    const result = validateDNVaststellingRecord(schema, record);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.inputKey === "heropenReden")).toBe(true);
  });

  it("requires kritiekeZone for natuursteen", () => {
    const record = createRecord();
    record.mutablePayload.formData = {
      ...record.mutablePayload.formData,
      verhardingType: "natuursteen",
      kritiekeZone: "",
    };

    const result = validateDNVaststellingRecord(schema, record);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.inputKey === "kritiekeZone")).toBe(true);
  });

  it("enforces fotoNa when status is afgesloten and photo fields are active", () => {
    const record = createRecord();
    record.mutablePayload.formData = {
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "definitief_herstel",
      termijnHerstel: "2026-02-20",
      status: "afgesloten",
      fotoVoor_url: "photo://voor",
      fotoDetail_url: "photo://detail",
      fotoNa_url: "",
    };

    const result = validateDNVaststellingRecord(photoSchema, record);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.inputKey === "fotoNa_url")).toBe(true);
  });

  it("requires immutable gipod context", () => {
    const record = createRecord();
    record.immutableContext.gipodId = "";

    const result = validateDNVaststellingRecord(schema, record);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.inputKey === "gipodId")).toBe(true);
  });
});
