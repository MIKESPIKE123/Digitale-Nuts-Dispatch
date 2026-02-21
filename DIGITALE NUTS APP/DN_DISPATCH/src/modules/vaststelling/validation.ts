import type { DNVaststellingFieldValue, DNVaststellingRecord, DNVaststellingValidationIssue, DNVaststellingValidationResult } from "./contracts";
import type { ParsedSchema } from "./schema";

const VALIDATIEPOORTJES_SECTION_ID = "dn_validatiepoortjes_v2";
const VALIDATIEPOORTJES_SECTION_TITLE = "Validatiepoortjes v2";

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function isNokValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().toUpperCase().startsWith("NOK");
}

function isFieldValue(value: unknown): value is DNVaststellingFieldValue {
  if (typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "string");
  }
  return false;
}

function hasIssue(
  issues: DNVaststellingValidationIssue[],
  code: DNVaststellingValidationIssue["code"],
  inputKey: string
): boolean {
  return issues.some((issue) => issue.code === code && issue.inputKey === inputKey);
}

function addRequiredIssue(
  issues: DNVaststellingValidationIssue[],
  inputKey: string,
  message: string,
  fieldLabel?: string
): void {
  if (hasIssue(issues, "required_field_missing", inputKey)) {
    return;
  }

  issues.push({
    code: "required_field_missing",
    inputKey,
    fieldKey: inputKey,
    fieldLabel,
    sectionId: VALIDATIEPOORTJES_SECTION_ID,
    sectionTitle: VALIDATIEPOORTJES_SECTION_TITLE,
    message,
  });
}

function schemaHasField(schema: ParsedSchema, fieldKey: string): boolean {
  return Boolean(schema.index.fieldsByKey[fieldKey]);
}

function formDataHasKey(
  formData: Record<string, DNVaststellingFieldValue>,
  fieldKey: string
): boolean {
  return Object.prototype.hasOwnProperty.call(formData, fieldKey);
}

function getFormData(record: DNVaststellingRecord): Record<string, DNVaststellingFieldValue> {
  const raw = record.mutablePayload.formData;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const parsed: Record<string, DNVaststellingFieldValue> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!isFieldValue(value)) {
      continue;
    }
    parsed[key] = value;
  }

  return parsed;
}

export function countNokFindings(formData: Record<string, DNVaststellingFieldValue>): number {
  let count = 0;

  for (const value of Object.values(formData)) {
    if (typeof value === "string") {
      if (isNokValue(value)) {
        count += 1;
      }
      continue;
    }

    for (const entry of value) {
      if (isNokValue(entry)) {
        count += 1;
      }
    }
  }

  return count;
}

export function validateDNVaststellingRecord(
  schema: ParsedSchema,
  record: DNVaststellingRecord
): DNVaststellingValidationResult {
  const issues: DNVaststellingValidationIssue[] = [];
  const formData = getFormData(record);

  if (isBlank(record.mutablePayload.metaLocation)) {
    issues.push({
      code: "meta_missing",
      inputKey: "__meta__location",
      message: "Locatie is verplicht.",
    });
  }

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const rawValue = formData[field.key];

      if (field.required && isBlank(rawValue)) {
        issues.push({
          code: "required_field_missing",
          inputKey: field.key,
          fieldKey: field.key,
          fieldLabel: field.label,
          sectionId: section.id,
          sectionTitle: section.title,
          message: `${section.title} -> ${field.label} is verplicht.`,
        });
      }

      if (Array.isArray(rawValue)) {
        rawValue.forEach((entry) => {
          if (!isNokValue(entry)) {
            return;
          }
          const responsibleKey = `${field.key}__responsible__${entry}`;
          if (isBlank(formData[responsibleKey])) {
            issues.push({
              code: "nok_responsible_missing",
              inputKey: responsibleKey,
              fieldKey: field.key,
              fieldLabel: field.label,
              sectionId: section.id,
              sectionTitle: section.title,
              message: `${section.title} -> ${field.label}: verantwoordelijke ontbreekt voor ${entry}.`,
            });
          }
        });
        return;
      }

      if (isNokValue(rawValue)) {
        const responsibleKey = `${field.key}__responsible`;
        if (isBlank(formData[responsibleKey])) {
          issues.push({
            code: "nok_responsible_missing",
            inputKey: responsibleKey,
            fieldKey: field.key,
            fieldLabel: field.label,
            sectionId: section.id,
            sectionTitle: section.title,
            message: `${section.title} -> ${field.label}: verantwoordelijke ontbreekt voor ${rawValue}.`,
          });
        }
      }
    });
  });

  // Validatiepoortjes v2 - hoofdstuk 5.1 verplichte velden.
  if (isBlank(record.immutableContext.gipodId)) {
    addRequiredIssue(issues, "gipodId", "GIPOD-ID is verplicht.", "GIPOD-ID");
  }

  const nutsbeheerderValue = formDataHasKey(formData, "nutsbeheerder")
    ? formData.nutsbeheerder
    : record.immutableContext.nutsBedrijf;
  if (isBlank(nutsbeheerderValue)) {
    addRequiredIssue(issues, "nutsbeheerder", "Nutsbeheerder is verplicht.", "Nutsbeheerder");
  }

  if (!schemaHasField(schema, "district") && isBlank(record.immutableContext.district)) {
    addRequiredIssue(issues, "district", "District is verplicht.", "District");
  }

  if (!schemaHasField(schema, "ingreepType") && isBlank(formData.ingreepType)) {
    addRequiredIssue(issues, "ingreepType", "Type ingreep is verplicht.", "Type ingreep");
  }

  if (!schemaHasField(schema, "fase") && isBlank(formData.fase)) {
    addRequiredIssue(issues, "fase", "Fase is verplicht.", "Fase");
  }

  // Enkel afdwingen zodra het veld effectief geactiveerd is.
  if (schemaHasField(schema, "verhardingType") && isBlank(formData.verhardingType)) {
    addRequiredIssue(issues, "verhardingType", "Verharding is verplicht.", "Verharding");
  }

  if (isBlank(record.createdAt)) {
    addRequiredIssue(
      issues,
      "vaststDatumTijd",
      "Vaststellingsdatum/tijd is verplicht.",
      "Vaststellingsdatum/tijd"
    );
  }

  // Validatiepoortjes v2 - hoofdstuk 5.2 foto-evidence (voorwaardelijk op geactiveerde fotovelden).
  const fotoFieldsActive =
    schemaHasField(schema, "fotoVoor_url") ||
    schemaHasField(schema, "fotoDetail_url") ||
    schemaHasField(schema, "fotoNa_url") ||
    formDataHasKey(formData, "fotoVoor_url") ||
    formDataHasKey(formData, "fotoDetail_url") ||
    formDataHasKey(formData, "fotoNa_url");

  const faseValue = typeof formData.fase === "string" ? formData.fase : "";
  const statusValue = typeof formData.status === "string" ? formData.status : "";

  if (fotoFieldsActive) {
    if (isBlank(formData.fotoVoor_url)) {
      addRequiredIssue(issues, "fotoVoor_url", "Foto VOOR is verplicht.", "Foto VOOR");
    }

    if (isBlank(formData.fotoDetail_url)) {
      addRequiredIssue(issues, "fotoDetail_url", "Foto DETAIL is verplicht.", "Foto DETAIL");
    }

    if (
      (statusValue === "afgesloten" || faseValue === "definitief_herstel") &&
      isBlank(formData.fotoNa_url)
    ) {
      addRequiredIssue(
        issues,
        "fotoNa_url",
        "Foto NA is verplicht bij status afgesloten of fase definitief herstel.",
        "Foto NA"
      );
    }
  }

  // Validatiepoortjes v2 - hoofdstuk 5.3 fase-afhankelijke regels.
  if (faseValue === "tijdelijk_herstel" && isBlank(formData.termijnHerstel)) {
    addRequiredIssue(
      issues,
      "termijnHerstel",
      "Uiterste hersteldatum is verplicht bij tijdelijk herstel.",
      "Uiterste hersteldatum"
    );
  }

  const verhardingTypeValue = typeof formData.verhardingType === "string" ? formData.verhardingType : "";
  const kritiekeZoneValue = typeof formData.kritiekeZone === "string" ? formData.kritiekeZone : "";
  if (verhardingTypeValue === "natuursteen" && isBlank(kritiekeZoneValue)) {
    addRequiredIssue(
      issues,
      "kritiekeZone",
      "Kritieke zone moet ingevuld zijn bij verhardingstype natuursteen.",
      "Kritieke zone"
    );
  }

  const hasReopenTrigger =
    typeof record.mutablePayload.reopenTriggeredAt === "string" &&
    record.mutablePayload.reopenTriggeredAt.trim().length > 0;
  if (hasReopenTrigger && isBlank(formData.heropenReden)) {
    addRequiredIssue(
      issues,
      "heropenReden",
      "Heropeningsreden is verplicht wanneer een afgesloten dossier opnieuw opengezet wordt.",
      "Heropeningsreden"
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    requiredFieldIssues: issues.filter((issue) => issue.code === "required_field_missing").length,
    nokResponsibleIssues: issues.filter((issue) => issue.code === "nok_responsible_missing").length,
    metaIssues: issues.filter((issue) => issue.code === "meta_missing").length,
  };
}
