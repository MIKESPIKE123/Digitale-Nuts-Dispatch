import { describe, expect, it } from "vitest";
import {
  BASE_OPERATIONAL_STATUSES,
  buildOperationalWorkFilterOptions,
  filterWorks,
  getWorkExclusionReasons,
  WORK_STATUS_FILTER_VALUES,
} from "./workFiltering";
import type { WorkRecord } from "../types";

function createWork(overrides: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: "work-1",
    dossierId: "BONU2026-0001",
    bonuNummer: "BONU2026-0001",
    referentieId: "REF-1",
    gipodId: "19170001",
    werftype: "NUTSWERKEN",
    status: "VERGUND",
    startDate: "2026-02-16",
    endDate: "2026-02-16",
    postcode: "2018",
    district: "Antwerpen",
    straat: "Teststraat",
    huisnr: "1",
    nutsBedrijf: "Fluvius",
    durationDays: 1,
    location: { lat: 51.2052, lng: 4.4211 },
    locationSource: "exact",
    permitStatus: "AFGELEVERD",
    permitReferenceId: "GW2026-TEST-REF",
    permitRefKey: "TEST-KEY",
    ...overrides,
  };
}

describe("workFiltering", () => {
  it("bouwt de operationele basisfilter op vanuit de basisbeschrijving", () => {
    const options = buildOperationalWorkFilterOptions({
      statuses: [...BASE_OPERATIONAL_STATUSES],
    });

    expect(options.statuses).toEqual(["VERGUND", "IN EFFECT"]);
    expect(options.requireAsignPermit).toBe(false);
    expect(options.excludePermitExpiredViolations).toBe(false);
    expect(WORK_STATUS_FILTER_VALUES).toEqual([
      "VERGUND",
      "IN EFFECT",
      "VERGUNNING VERLOPEN",
    ]);
  });

  it("past dezelfde domeinfilters consequent toe", () => {
    const works = [
      createWork({ id: "visible" }),
      createWork({ id: "other-district", district: "Berchem" }),
      createWork({ id: "other-postcode", postcode: "2000" }),
    ];

    const filtered = filterWorks(works, {
      statuses: ["VERGUND", "IN EFFECT"],
      districts: ["Antwerpen"],
      postcodes: ["2018"],
    });

    expect(filtered.map((work) => work.id)).toEqual(["visible"]);
  });

  it("geeft uitsluitredenen terug voor dispatch-specifieke blokkades", () => {
    const reasons = getWorkExclusionReasons(
      createWork({
        permitReferenceId: "",
        permitRefKey: "",
        sourceStatus: "Vergunning afgelopen",
        permitDossierStatus: "Vergunning afgelopen",
      }),
      {
        statuses: ["VERGUND", "IN EFFECT"],
        requireAsignPermit: true,
        excludePermitExpiredViolations: true,
      }
    );

    expect(reasons).toContain("missing_asign_permit");
    expect(reasons).toContain("permit_expired_violation");
  });
});
