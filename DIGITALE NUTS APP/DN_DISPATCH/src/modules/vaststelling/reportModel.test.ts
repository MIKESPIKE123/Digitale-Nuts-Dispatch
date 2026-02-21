import { describe, expect, it } from "vitest";
import type { ParsedSchema } from "./schema";
import { buildNokSummaryRows, buildVaststellingReportRows } from "./reportModel";

function createSchema(): ParsedSchema {
  const sections: ParsedSchema["sections"] = [
    {
      id: "veiligheid_werf",
      title: "VEILIGHEID WERF",
      items: [
        {
          key: "werfafbakening",
          label: "Werfafbakening",
          type: "multiselect",
          required: false,
          options: [],
        },
        {
          key: "infobord",
          label: "Infobord opdrachtgever",
          type: "select",
          required: false,
          options: [],
        },
      ],
    },
    {
      id: "wie_werkt_er",
      title: "WIE WERKT ER? (admin)",
      items: [
        {
          key: "aannemer",
          label: "Aannemer",
          type: "input",
          required: false,
        },
      ],
    },
  ];

  const fieldsByKey = Object.fromEntries(
    sections.flatMap((section) => section.items.map((item) => [item.key, item]))
  );
  const fieldsByLabel = Object.fromEntries(
    sections.flatMap((section) => section.items.map((item) => [item.label.toLowerCase(), item]))
  );

  return {
    sections,
    defaults: {
      inspectors: [],
      postcodes: [],
    },
    index: {
      fieldsByKey,
      fieldsByLabel,
    },
  };
}

describe("reportModel", () => {
  it("builds rows and enriches NOK with responsible party", () => {
    const rows = buildVaststellingReportRows(createSchema(), {
      werfafbakening: [
        "OK, werfzone correct afgebakend",
        "NOK, harde afbakeningshekken niet aanwezig",
      ],
      "werfafbakening__responsible__NOK, harde afbakeningshekken niet aanwezig":
        "Aannemer",
      infobord: "NOK, geen telefoonnummer op infobord",
      infobord__responsible: "Nutsmaatschappij",
      aannemer: "GS SOLUTIONS",
    });

    expect(rows).toHaveLength(3);
    expect(rows[0].sectionTitle).toBe("VEILIGHEID WERF");
    expect(rows[0].status).toBe("NOT OK");
    expect(rows[0].description).toContain("Verantwoordelijke: Aannemer");
    expect(rows[1].status).toBe("NOT OK");
    expect(rows[1].description).toContain("Verantwoordelijke: Nutsmaatschappij");
    expect(rows[2].status).toBe("INFO");
  });

  it("returns only NOK rows in summary", () => {
    const rows = buildVaststellingReportRows(createSchema(), {
      werfafbakening: ["OK, werfzone correct afgebakend"],
      infobord: "NOK, geen telefoonnummer op infobord",
      infobord__responsible: "Nutsmaatschappij",
    });

    const nokSummary = buildNokSummaryRows(rows);
    expect(nokSummary).toHaveLength(1);
    expect(nokSummary[0].fieldLabel).toBe("Infobord opdrachtgever");
    expect(nokSummary[0].status).toBe("NOT OK");
  });
});
