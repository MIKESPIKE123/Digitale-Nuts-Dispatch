export type CodeTableKey =
  | "workCategory"
  | "materialType"
  | "referenceType"
  | "attachmentType"
  | "actionType";

export interface CodeTableEntry {
  id: string;
  description: string;
  code: string;
  active: boolean;
  aliases?: readonly string[];
}

const WORK_CATEGORY_TABLE: readonly CodeTableEntry[] = [
  {
    id: "work-category-cat-1",
    description: "Categorie 1",
    code: "CAT_1",
    active: true,
    aliases: ["cat 1", "categorie1"],
  },
  {
    id: "work-category-cat-2",
    description: "Categorie 2",
    code: "CAT_2",
    active: true,
    aliases: ["cat 2", "categorie2"],
  },
  {
    id: "work-category-cat-3",
    description: "Categorie 3",
    code: "CAT_3",
    active: true,
    aliases: ["cat 3", "categorie3"],
  },
  {
    id: "work-category-onbepaald",
    description: "Onbepaald",
    code: "ONB",
    active: true,
    aliases: ["onbekend"],
  },
  {
    id: "work-category-spoed",
    description: "Spoed",
    code: "SPOED",
    active: false,
    aliases: ["dringend"],
  },
];

const MATERIAL_TYPE_TABLE: readonly CodeTableEntry[] = [
  {
    id: "material-type-1",
    description: "Koolwaterstofverhardingen",
    code: "KWS",
    active: true,
  },
  {
    id: "material-type-2",
    description: "CementbetonOntharding",
    code: "CBO",
    active: true,
  },
  {
    id: "material-type-3",
    description: "Rijwegen en Voetpaden",
    code: "RV",
    active: true,
  },
  {
    id: "material-type-4",
    description: "Grachten en Onverhard",
    code: "GO",
    active: true,
  },
  {
    id: "material-type-5",
    description: "Andere",
    code: "AND",
    active: true,
  },
  {
    id: "material-type-6",
    description: "Speeltoestellen",
    code: "ST",
    active: true,
  },
];

const REFERENCE_TYPE_TABLE: readonly CodeTableEntry[] = [
  {
    id: "reference-type-msw-nuts",
    description: "MSW Nutsdossier",
    code: "MSW_NUT",
    active: true,
  },
  {
    id: "reference-type-msw-ab",
    description: "MSW Dossier Aanwerken Bouw",
    code: "MSW_AB",
    active: true,
  },
  {
    id: "reference-type-nuts-hoofd",
    description: "Nutsbedrijf Hoofdrefentie",
    code: "NUT_HR",
    active: true,
  },
  {
    id: "reference-type-nuts-sub",
    description: "Nutsbedrijf Subreferentie",
    code: "NUT_SR",
    active: true,
  },
  {
    id: "reference-type-andere",
    description: "Andere",
    code: "AND",
    active: true,
  },
  {
    id: "reference-type-stadaan-hoofd",
    description: "Stadsaannemer Hoofdreferentie",
    code: "STAAN_HR",
    active: true,
  },
];

const ATTACHMENT_TYPE_TABLE: readonly CodeTableEntry[] = [
  {
    id: "attachment-type-foto",
    description: "Foto",
    code: "FOTO",
    active: true,
  },
  {
    id: "attachment-type-werfverslag",
    description: "Werfverslag",
    code: "WERF",
    active: true,
  },
  {
    id: "attachment-type-opleverbon",
    description: "Opleverbon",
    code: "LEVERB",
    active: true,
  },
  {
    id: "attachment-type-andere",
    description: "Andere",
    code: "AND",
    active: true,
  },
];

const ACTION_TYPE_TABLE: readonly CodeTableEntry[] = [
  {
    id: "action-type-statusovergang",
    description: "Statusovergang",
    code: "STAD",
    active: true,
  },
  {
    id: "action-type-communicatie",
    description: "Communicatie",
    code: "COMM",
    active: true,
  },
  {
    id: "action-type-andere",
    description: "Andere Actie",
    code: "AND",
    active: true,
  },
];

export const CODE_TABLES: Record<CodeTableKey, readonly CodeTableEntry[]> = {
  workCategory: WORK_CATEGORY_TABLE,
  materialType: MATERIAL_TYPE_TABLE,
  referenceType: REFERENCE_TYPE_TABLE,
  attachmentType: ATTACHMENT_TYPE_TABLE,
  actionType: ACTION_TYPE_TABLE,
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function listCodeTableEntries(
  key: CodeTableKey,
  options?: { includeInactive?: boolean }
): readonly CodeTableEntry[] {
  const includeInactive = options?.includeInactive ?? false;
  const source = CODE_TABLES[key];
  if (includeInactive) {
    return source;
  }
  return source.filter((entry) => entry.active);
}

export function getCodeTableEntryByCode(
  key: CodeTableKey,
  code: string
): CodeTableEntry | null {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return null;
  }

  const found = CODE_TABLES[key].find((entry) => normalizeCode(entry.code) === normalized);
  return found ?? null;
}

const WORK_CATEGORY_LOOKUP = (() => {
  const lookup = new Map<string, string>();
  for (const entry of WORK_CATEGORY_TABLE) {
    lookup.set(normalizeText(entry.description), entry.code);
    lookup.set(normalizeText(entry.code), entry.code);
    for (const alias of entry.aliases ?? []) {
      lookup.set(normalizeText(alias), entry.code);
    }
  }
  return lookup;
})();

export function resolveWorkCategoryCode(value: string | null | undefined): string {
  const normalized = normalizeText(value ?? "");
  if (!normalized) {
    return "ONB";
  }
  return WORK_CATEGORY_LOOKUP.get(normalized) ?? "ONB";
}

export function resolveWorkCategoryDescription(code: string | null | undefined): string {
  const normalized = normalizeCode(code ?? "");
  if (!normalized) {
    return "Onbepaald";
  }

  const found = WORK_CATEGORY_TABLE.find((entry) => normalizeCode(entry.code) === normalized);
  return found?.description ?? "Onbepaald";
}
