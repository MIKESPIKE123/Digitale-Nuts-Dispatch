export type FieldType = "input" | "textarea" | "select" | "multiselect";

export interface Option {
  value: string;
  label: string;
  isNOK?: boolean;
  isOK?: boolean;
}

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Option[];
  hint?: string;
  notes?: string[];
}

export interface Section {
  id: string;
  title: string;
  items: Field[];
}

export interface ParsedSchema {
  sections: Section[];
  defaults: {
    inspectors: string[];
    postcodes: Option[];
  };
  index: {
    fieldsByLabel: Record<string, Field>;
    fieldsByKey: Record<string, Field>;
  };
}

const NOTE_PREFIXES = ["(", "formaat", "format", "actie", "acties", "opmerking"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s/\\()]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function looksLikeNote(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (!lower) return false;
  return NOTE_PREFIXES.some((prefix) => lower.startsWith(prefix)) || lower.includes("formaat");
}

function isTextareaLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("opmerking") || lower.includes("opmerkingen") || lower.includes("comment");
}

function parseCSV(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length > 0) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      pushField();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

export function parseArchisnapperCSV(text: string): ParsedSchema {
  const rows = parseCSV(text);
  const sections: Section[] = [];
  const defaults: ParsedSchema["defaults"] = { inspectors: [], postcodes: [] };

  let currentSection: Section | null = null;
  let currentField: Field | null = null;
  let currentSectionTitle = "";

  const ensureSection = (title: string) => {
    const trimmed = normalize(title);
    if (!trimmed) return null;
    currentSectionTitle = trimmed;
    let section = sections.find((s) => s.title === trimmed);
    if (!section) {
      section = {
        id: slugify(trimmed),
        title: trimmed,
        items: [],
      };
      sections.push(section);
    }
    currentSection = section;
    return section;
  };

  const addField = (section: Section | null, label: string, hint?: string) => {
    if (!section) return null;
    const trimmed = normalize(label);
    if (!trimmed) return null;
    const required =
      trimmed.toLowerCase().includes("verplicht") ||
      currentSectionTitle.toLowerCase().includes("verplicht");
    const field: Field = {
      key: `${section.id}__${slugify(trimmed)}`,
      label: trimmed.replace(/\s*\(verplicht\)\s*/i, ""),
      type: "input",
      required,
      options: [],
      hint: hint ? normalize(hint) : undefined,
      notes: [],
    };
    section.items.push(field);
    currentField = field;
    return field;
  };

  const addOptionOrNote = (field: Field | null, rawValue: string) => {
    if (!field) return;
    const value = normalize(rawValue);
    if (!value) return;
    if (looksLikeNote(value)) {
      field.notes = field.notes ? [...field.notes, value] : [value];
      return;
    }
    const isNOK = value.toUpperCase().startsWith("NOK");
    const isOK = value.toUpperCase().startsWith("OK");
    field.options = field.options
      ? [...field.options, { value, label: value, isNOK, isOK }]
      : [{ value, label: value, isNOK, isOK }];
  };

  rows.forEach((row) => {
    const [c1 = "", c2 = "", c3 = ""] = row;
    const col1 = normalize(c1);
    const col2 = normalize(c2);
    const col3 = normalize(c3);

    if (col1 && col2) {
      addField(ensureSection(col1), col2, col3 || undefined);
      return;
    }

    if (col1 && !col2 && !col3) {
      ensureSection(col1);
      currentField = null;
      return;
    }

    if (!col1 && col2) {
      addField(currentSection, col2, col3 || undefined);
      return;
    }

    if (!col1 && !col2 && col3) {
      addOptionOrNote(currentField, col3);
    }
  });

  sections.forEach((section) => {
    section.items.forEach((field) => {
      if (isTextareaLabel(field.label)) {
        field.type = "textarea";
      } else if (field.options && field.options.length > 0) {
        const hasNok = field.options.some((opt) => opt.isNOK);
        const hasOk = field.options.some((opt) => opt.isOK);
        if (hasNok) {
          field.type = "multiselect";
          if (!hasOk) {
            field.options = [{ value: "OK", label: "OK", isOK: true }, ...field.options];
          }
        } else {
          field.type = "select";
        }
      }
    });
  });

  const fieldsByLabel: Record<string, Field> = {};
  const fieldsByKey: Record<string, Field> = {};

  sections.forEach((section) => {
    section.items.forEach((field) => {
      fieldsByLabel[field.label.toLowerCase()] = field;
      fieldsByKey[field.key] = field;
      if (
        section.title.toLowerCase().includes("inspecteurs") &&
        field.label.toLowerCase().includes("naam") &&
        field.options
      ) {
        defaults.inspectors = field.options.map((opt) => opt.label).filter(Boolean);
      }
      if (field.label.toLowerCase().includes("postcode") && field.options) {
        defaults.postcodes = field.options;
      }
    });
  });

  return { sections, defaults, index: { fieldsByLabel, fieldsByKey } };
}
