import type { DNVaststellingFieldValue } from "./contracts";
import type { ParsedSchema } from "./schema";

export type VaststellingReportStatus = "NOT OK" | "OK" | "INFO";

export interface VaststellingReportRow {
  sectionTitle: string;
  fieldLabel: string;
  status: VaststellingReportStatus;
  description: string;
}

function isBlank(value: DNVaststellingFieldValue | undefined): boolean {
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return true;
}

function isNokValue(value: string): boolean {
  return value.trim().toUpperCase().startsWith("NOK");
}

function isOkValue(value: string): boolean {
  return value.trim().toUpperCase().startsWith("OK");
}

function resolveStatus(values: string[]): VaststellingReportStatus {
  if (values.some((value) => isNokValue(value))) {
    return "NOT OK";
  }
  if (values.some((value) => isOkValue(value))) {
    return "OK";
  }
  return "INFO";
}

function withResponsibleSuffix(
  formData: Record<string, DNVaststellingFieldValue>,
  fieldKey: string,
  value: string
): string {
  if (!isNokValue(value)) {
    return value;
  }

  const specificResponsibleKey = `${fieldKey}__responsible__${value}`;
  const genericResponsibleKey = `${fieldKey}__responsible`;
  const specificResponsible = formData[specificResponsibleKey];
  const genericResponsible = formData[genericResponsibleKey];
  const responsible =
    typeof specificResponsible === "string" && specificResponsible.trim().length > 0
      ? specificResponsible
      : typeof genericResponsible === "string" && genericResponsible.trim().length > 0
        ? genericResponsible
        : "";

  if (!responsible) {
    return value;
  }

  return `${value} (Verantwoordelijke: ${responsible})`;
}

export function buildVaststellingReportRows(
  schema: ParsedSchema,
  formData: Record<string, DNVaststellingFieldValue>
): VaststellingReportRow[] {
  const rows: VaststellingReportRow[] = [];

  for (const section of schema.sections) {
    for (const field of section.items) {
      const value = formData[field.key];
      if (isBlank(value)) {
        continue;
      }

      if (typeof value === "string") {
        rows.push({
          sectionTitle: section.title,
          fieldLabel: field.label,
          status: resolveStatus([value]),
          description: withResponsibleSuffix(formData, field.key, value),
        });
        continue;
      }

      const enrichedValues = value.map((entry) =>
        withResponsibleSuffix(formData, field.key, entry)
      );
      rows.push({
        sectionTitle: section.title,
        fieldLabel: field.label,
        status: resolveStatus(value),
        description: enrichedValues.join(" | "),
      });
    }
  }

  return rows;
}

export function buildNokSummaryRows(rows: VaststellingReportRow[]): VaststellingReportRow[] {
  return rows.filter((row) => row.status === "NOT OK");
}
