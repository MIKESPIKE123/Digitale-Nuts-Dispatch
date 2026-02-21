import type { DNVaststellingFieldValue } from "./contracts";
import type { ParsedSchema } from "./schema";

type FaseValue = "uitvoering" | "tijdelijk_herstel" | "definitief_herstel";

type ChecklistRule =
  | {
      section: string;
      label: string;
      type: "copy_aannemer";
    }
  | {
      section: string;
      label: string;
      type: "set_verharding";
      verhardingType: string;
      forceKritiekeZoneJa?: boolean;
    }
  | {
      section: string;
      label: string;
      type: "nok_sets_kritieke_zone";
    }
  | {
      section: string;
      label: string;
      type: "map_fase";
      mapping: Array<{ match: string; fase: FaseValue }>;
    };

export type BuildChecklistCouplingPatchInput = {
  schema: ParsedSchema;
  formData: Record<string, DNVaststellingFieldValue>;
  changedFieldKey: string;
  changedValue: DNVaststellingFieldValue | undefined;
  canonicalFieldKeys: ReadonlySet<string>;
};

const CHECKLIST_RULES: ChecklistRule[] = [
  {
    section: "wie werkt er",
    label: "aannemer",
    type: "copy_aannemer",
  },
  {
    section: "bestrating nieuw te gebruiken",
    label: "elementverharding natuursteen",
    type: "set_verharding",
    verhardingType: "natuursteen",
    forceKritiekeZoneJa: true,
  },
  {
    section: "bestrating nieuw te gebruiken",
    label: "elementverharding beton",
    type: "set_verharding",
    verhardingType: "beton",
  },
  {
    section: "bestrating nieuw te gebruiken",
    label: "asfalt",
    type: "set_verharding",
    verhardingType: "asfalt",
  },
  {
    section: "bestrating nieuw te gebruiken",
    label: "beton gegoten",
    type: "set_verharding",
    verhardingType: "beton",
  },
  {
    section: "bestrating afwerking",
    label: "werd correct materiaal gebruikt",
    type: "nok_sets_kritieke_zone",
  },
  {
    section: "bestrating afwerking",
    label: "voegbreedte",
    type: "nok_sets_kritieke_zone",
  },
  {
    section: "bestrating afwerking",
    label: "vellingkant",
    type: "nok_sets_kritieke_zone",
  },
  {
    section: "bestrating afwerking",
    label: "vlakheid",
    type: "nok_sets_kritieke_zone",
  },
  {
    section: "synergiewerken",
    label: "wijze van herstel",
    type: "map_fase",
    mapping: [
      { match: "voorlopig", fase: "tijdelijk_herstel" },
      { match: "definitief", fase: "definitief_herstel" },
    ],
  },
  {
    section: "sleufherstelling",
    label: "wijze van herstel",
    type: "map_fase",
    mapping: [
      { match: "omgezet naar voorlopig herstel", fase: "tijdelijk_herstel" },
      { match: "herbestratingsbon gevraagd", fase: "tijdelijk_herstel" },
      { match: "omgezet naar definitief herstel", fase: "definitief_herstel" },
    ],
  },
];

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNokValue(value: string): boolean {
  return normalizeToken(value).startsWith("nok");
}

function toEntries(value: DNVaststellingFieldValue | undefined): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function hasFieldValue(value: DNVaststellingFieldValue | undefined): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return false;
}

function hasNokIndicator(value: DNVaststellingFieldValue | undefined): boolean {
  const entries = toEntries(value);
  return entries.some((entry) => isNokValue(entry));
}

function getFieldContext(
  schema: ParsedSchema,
  fieldKey: string
): { section: string; label: string } | null {
  const field = schema.index.fieldsByKey[fieldKey];
  if (!field) {
    return null;
  }

  const section = schema.sections.find((item) => item.items.some((fieldItem) => fieldItem.key === fieldKey));
  if (!section) {
    return null;
  }

  return {
    section: normalizeToken(section.title),
    label: normalizeToken(field.label),
  };
}

function resolveFaseFromMapping(
  value: DNVaststellingFieldValue | undefined,
  mapping: Array<{ match: string; fase: FaseValue }>
): FaseValue | "" {
  const normalizedEntries = toEntries(value).map((entry) => normalizeToken(entry));

  for (const entry of normalizedEntries) {
    for (const candidate of mapping) {
      if (entry.includes(normalizeToken(candidate.match))) {
        return candidate.fase;
      }
    }
  }

  return "";
}

export function buildChecklistCouplingPatch({
  schema,
  formData,
  changedFieldKey,
  changedValue,
  canonicalFieldKeys,
}: BuildChecklistCouplingPatchInput): Record<string, DNVaststellingFieldValue> {
  const patch: Record<string, DNVaststellingFieldValue> = {};

  const currentValue = (key: string): DNVaststellingFieldValue | undefined => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      return patch[key];
    }
    return formData[key];
  };

  // Directe canonical regel: natuursteen vereist kritieke zone.
  if (
    changedFieldKey === "verhardingType" &&
    typeof changedValue === "string" &&
    changedValue === "natuursteen" &&
    !hasFieldValue(currentValue("kritiekeZone"))
  ) {
    patch.kritiekeZone = "ja";
  }

  if (canonicalFieldKeys.has(changedFieldKey)) {
    return patch;
  }

  const context = getFieldContext(schema, changedFieldKey);
  if (!context) {
    return patch;
  }

  const matchingRules = CHECKLIST_RULES.filter(
    (rule) => rule.section === context.section && rule.label === context.label
  );
  if (matchingRules.length === 0) {
    return patch;
  }

  for (const rule of matchingRules) {
    if (rule.type === "copy_aannemer") {
      if (
        typeof changedValue === "string" &&
        changedValue.trim().length > 0 &&
        !hasFieldValue(currentValue("aannemer"))
      ) {
        patch.aannemer = changedValue.trim();
      }
      continue;
    }

    if (rule.type === "set_verharding") {
      if (!hasFieldValue(currentValue("verhardingType"))) {
        patch.verhardingType = rule.verhardingType;
      }
      if (rule.forceKritiekeZoneJa && !hasFieldValue(currentValue("kritiekeZone"))) {
        patch.kritiekeZone = "ja";
      }
      continue;
    }

    if (rule.type === "nok_sets_kritieke_zone") {
      if (hasNokIndicator(changedValue) && !hasFieldValue(currentValue("kritiekeZone"))) {
        patch.kritiekeZone = "ja";
      }
      continue;
    }

    if (rule.type === "map_fase") {
      const resolvedFase = resolveFaseFromMapping(changedValue, rule.mapping);
      if (resolvedFase && !hasFieldValue(currentValue("fase"))) {
        patch.fase = resolvedFase;
      }
    }
  }

  return patch;
}

