import { describe, expect, it } from "vitest";
import {
  buildMockPhotoUrl,
  findPhotoEvidenceByField,
  isPhotoFieldKey,
  upsertPhotoEvidence,
} from "./photoEvidence";

describe("photoEvidence", () => {
  it("detects supported photo field keys", () => {
    expect(isPhotoFieldKey("fotoVoor_url")).toBe(true);
    expect(isPhotoFieldKey("fotoDetail_url")).toBe(true);
    expect(isPhotoFieldKey("fotoNa_url")).toBe(true);
    expect(isPhotoFieldKey("other")).toBe(false);
  });

  it("builds a mock photo url", () => {
    const url = buildMockPhotoUrl("dnv-1", "fotoVoor_url");
    expect(url.startsWith("mock://dn-vaststelling/dnv-1/fotoVoor_url/")).toBe(true);
  });

  it("upserts and replaces evidence per field", () => {
    const first = upsertPhotoEvidence([], {
      fieldKey: "fotoVoor_url",
      url: "mock://dn-vaststelling/dnv-1/fotoVoor_url/a.jpg",
      inspectionId: "dnv-1",
      lat: 51.2,
      lon: 4.4,
      actorId: "I1",
      actorName: "Toezichter AB",
      source: "mock",
    });

    expect(first).toHaveLength(1);
    expect(first[0].fieldKey).toBe("fotoVoor_url");

    const replaced = upsertPhotoEvidence(first, {
      fieldKey: "fotoVoor_url",
      url: "mock://dn-vaststelling/dnv-1/fotoVoor_url/b.jpg",
      inspectionId: "dnv-1",
      lat: 51.2,
      lon: 4.4,
      actorId: "I1",
      actorName: "Toezichter AB",
      source: "mock",
    });

    expect(replaced).toHaveLength(1);
    expect(replaced[0].url.endsWith("/b.jpg")).toBe(true);
  });

  it("removes evidence for field when url is cleared", () => {
    const withEntries = upsertPhotoEvidence([], {
      fieldKey: "fotoDetail_url",
      url: "mock://dn-vaststelling/dnv-1/fotoDetail_url/a.jpg",
      inspectionId: "dnv-1",
      lat: 51.2,
      lon: 4.4,
      actorId: "I1",
      actorName: "Toezichter AB",
      source: "mock",
    });

    const cleared = upsertPhotoEvidence(withEntries, {
      fieldKey: "fotoDetail_url",
      url: "",
      inspectionId: "dnv-1",
      lat: 51.2,
      lon: 4.4,
      actorId: "I1",
      actorName: "Toezichter AB",
      source: "mock",
    });

    expect(cleared).toHaveLength(0);
  });

  it("finds evidence by field", () => {
    const list = upsertPhotoEvidence([], {
      fieldKey: "fotoNa_url",
      url: "mock://dn-vaststelling/dnv-1/fotoNa_url/x.jpg",
      inspectionId: "dnv-1",
      lat: 51.2,
      lon: 4.4,
      actorId: "I1",
      actorName: "Toezichter AB",
      source: "mock",
    });

    const found = findPhotoEvidenceByField(list, "fotoNa_url");
    expect(found?.url.endsWith("/x.jpg")).toBe(true);
  });
});
