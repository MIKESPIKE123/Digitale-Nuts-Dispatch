import { describe, expect, it } from "vitest";
import {
  CODE_TABLES,
  getCodeTableEntryByCode,
  listCodeTableEntries,
  resolveWorkCategoryCode,
  resolveWorkCategoryDescription,
} from "./codeTables";

describe("codeTables", () => {
  it("bevat de vijf centrale codetabellen", () => {
    expect(Object.keys(CODE_TABLES).sort()).toEqual([
      "actionType",
      "attachmentType",
      "materialType",
      "referenceType",
      "workCategory",
    ]);
  });

  it("filtert inactieve work categories standaard weg", () => {
    const active = listCodeTableEntries("workCategory");
    const all = listCodeTableEntries("workCategory", { includeInactive: true });

    expect(active.some((entry) => entry.code === "SPOED")).toBe(false);
    expect(all.some((entry) => entry.code === "SPOED")).toBe(true);
  });

  it("kan work category labels en codes robuust resolven", () => {
    expect(resolveWorkCategoryCode("Categorie 1")).toBe("CAT_1");
    expect(resolveWorkCategoryCode("dringend")).toBe("SPOED");
    expect(resolveWorkCategoryCode("onbekend")).toBe("ONB");
    expect(resolveWorkCategoryCode("")).toBe("ONB");
    expect(resolveWorkCategoryDescription("CAT_2")).toBe("Categorie 2");
  });

  it("kan entries ophalen op code", () => {
    const entry = getCodeTableEntryByCode("attachmentType", "fOtO");
    expect(entry?.description).toBe("Foto");
  });
});
