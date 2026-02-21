import { describe, expect, it } from "vitest";
import { calculateChecklistScore } from "./checklistScore";

describe("calculateChecklistScore", () => {
  it("returns high score for complete OK checklist", () => {
    const result = calculateChecklistScore({
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "uitvoering",
      verhardingType: "beton",
      status: "in_behandeling",
      werfafbakening: ["OK, werfzone correct afgebakend"],
      infoborden: "OK, borden aanwezig",
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.nokCount).toBe(0);
    expect(result.missingChecks).toBe(0);
  });

  it("penalizes NOK and missing responsible party", () => {
    const result = calculateChecklistScore({
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "uitvoering",
      verhardingType: "beton",
      status: "in_behandeling",
      werfafbakening: ["NOK, harde hekken ontbreken"],
    });

    expect(result.nokCount).toBe(1);
    expect(result.responsibleMissing).toBe(1);
    expect(result.score).toBeLessThan(90);
  });

  it("penalizes missing temporary herstel termijn", () => {
    const result = calculateChecklistScore({
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "tijdelijk_herstel",
      verhardingType: "beton",
      status: "in_behandeling",
      termijnHerstel: "",
    });

    expect(result.missingChecks).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("penalizes missing foto set for afgesloten records", () => {
    const result = calculateChecklistScore({
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "definitief_herstel",
      verhardingType: "beton",
      status: "afgesloten",
      fotoVoor_url: "",
      fotoDetail_url: "",
      fotoNa_url: "",
    });

    expect(result.missingChecks).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThanOrEqual(64);
  });
});
