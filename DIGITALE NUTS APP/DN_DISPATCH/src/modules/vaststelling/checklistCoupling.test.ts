import { describe, expect, it } from "vitest";
import type { DNVaststellingFieldValue } from "./contracts";
import type { ParsedSchema, Section } from "./schema";
import { buildChecklistCouplingPatch } from "./checklistCoupling";

const CANONICAL_FIELD_KEYS = new Set([
  "district",
  "locPrecisionM",
  "ingreepType",
  "fase",
  "verhardingType",
  "kritiekeZone",
  "aannemer",
  "signVergNr",
  "termijnHerstel",
  "status",
  "prioriteit",
  "maatregel",
  "heropenReden",
  "tags",
]);

function createSchema(sections: Section[]): ParsedSchema {
  const fieldsByKey: ParsedSchema["index"]["fieldsByKey"] = {};
  const fieldsByLabel: ParsedSchema["index"]["fieldsByLabel"] = {};

  for (const section of sections) {
    for (const field of section.items) {
      fieldsByKey[field.key] = field;
      fieldsByLabel[field.label.toLowerCase()] = field;
    }
  }

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

function runPatch(
  schema: ParsedSchema,
  formData: Record<string, DNVaststellingFieldValue>,
  changedFieldKey: string,
  changedValue: DNVaststellingFieldValue | undefined
): Record<string, DNVaststellingFieldValue> {
  return buildChecklistCouplingPatch({
    schema,
    formData,
    changedFieldKey,
    changedValue,
    canonicalFieldKeys: CANONICAL_FIELD_KEYS,
  });
}

describe("buildChecklistCouplingPatch", () => {
  it("copies aannemer from exact checklist item", () => {
    const schema = createSchema([
      {
        id: "wie_werkt_er",
        title: "Wie werkt er?",
        items: [
          { key: "wie_aannemer", label: "Aannemer", type: "input", required: false },
          { key: "aannemer", label: "Aannemer/ploeg", type: "input", required: false },
        ],
      },
    ]);

    const patch = runPatch(schema, { aannemer: "" }, "wie_aannemer", "Cas-Vos");
    expect(patch).toEqual({ aannemer: "Cas-Vos" });
  });

  it("does not copy aannemer for non-mapped label", () => {
    const schema = createSchema([
      {
        id: "wie_werkt_er",
        title: "Wie werkt er?",
        items: [{ key: "wie_aannemer_vrij", label: "Aannemer vrij", type: "input", required: false }],
      },
    ]);

    const patch = runPatch(schema, {}, "wie_aannemer_vrij", "Cas-Vos");
    expect(patch).toEqual({});
  });

  it("maps natuursteen checklist item to verhardingType and kritiekeZone", () => {
    const schema = createSchema([
      {
        id: "bestrating_nieuw",
        title: "BESTRATING (nieuw te gebruiken)",
        items: [
          {
            key: "bestrating_natuursteen",
            label: "Elementverharding NATUURSTEEN",
            type: "select",
            required: false,
          },
        ],
      },
    ]);

    const patch = runPatch(
      schema,
      { verhardingType: "", kritiekeZone: "" },
      "bestrating_natuursteen",
      "Natuursteen 10x10"
    );
    expect(patch).toEqual({
      verhardingType: "natuursteen",
      kritiekeZone: "ja",
    });
  });

  it("sets kritiekeZone on NOK for exact afwerking checklist fields", () => {
    const schema = createSchema([
      {
        id: "bestrating_afwerking",
        title: "bestrating afwerking",
        items: [{ key: "voegbreedte", label: "voegbreedte", type: "multiselect", required: false }],
      },
    ]);

    const patch = runPatch(
      schema,
      { kritiekeZone: "" },
      "voegbreedte",
      ["NOK, voegbreedte betontegel meer dan 3 mm"]
    );
    expect(patch).toEqual({ kritiekeZone: "ja" });
  });

  it("maps fase from exact 'wijze van herstel' items", () => {
    const schema = createSchema([
      {
        id: "synergiewerken",
        title: "Synergiewerken",
        items: [{ key: "wijze_synergie", label: "wijze van herstel", type: "select", required: false }],
      },
      {
        id: "sleufherstelling",
        title: "Sleufherstelling",
        items: [{ key: "wijze_sleuf", label: "wijze van herstel", type: "select", required: false }],
      },
    ]);

    const synergyPatch = runPatch(
      schema,
      { fase: "" },
      "wijze_synergie",
      "Voorlopig ( herstelbon aan te leveren)"
    );
    expect(synergyPatch).toEqual({ fase: "tijdelijk_herstel" });

    const sleufPatch = runPatch(
      schema,
      { fase: "" },
      "wijze_sleuf",
      "omgezet naar definitief herstel"
    );
    expect(sleufPatch).toEqual({ fase: "definitief_herstel" });
  });

  it("sets kritiekeZone when canonical verhardingType is natuursteen", () => {
    const schema = createSchema([
      {
        id: "kern",
        title: "DN Vaststelling v2 - Kernvelden",
        items: [
          { key: "verhardingType", label: "Verharding", type: "select", required: false },
          { key: "kritiekeZone", label: "Kritieke zone", type: "select", required: false },
        ],
      },
    ]);

    const patch = runPatch(schema, { kritiekeZone: "" }, "verhardingType", "natuursteen");
    expect(patch).toEqual({ kritiekeZone: "ja" });
  });
});
