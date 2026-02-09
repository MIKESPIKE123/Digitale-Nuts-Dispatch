import { ParsedSchema } from './schema'
import { InspectionMeta } from './storage'

export type ValidationCode = 'required_field_missing' | 'nok_responsible_missing' | 'meta_missing'

export interface ValidationIssue {
  code: ValidationCode
  sectionId?: string
  sectionTitle?: string
  fieldKey?: string
  inputKey: string
  fieldLabel?: string
  message: string
}

export interface InspectionValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  requiredFieldIssues: number
  nokResponsibleIssues: number
  metaIssues: number
}

const isBlank = (value: unknown) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

const isNokValue = (value: unknown) =>
  typeof value === 'string' && value.trim().toUpperCase().startsWith('NOK')

const validateMeta = (meta: InspectionMeta): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (isBlank(meta.inspector)) {
    issues.push({
      code: 'meta_missing',
      inputKey: '__meta__inspector',
      message: 'Inspecteur is verplicht.'
    })
  }

  if (isBlank(meta.location)) {
    issues.push({
      code: 'meta_missing',
      inputKey: '__meta__location',
      message: 'Locatie is verplicht.'
    })
  }

  return issues
}

export const validateInspectionRecord = (
  schema: ParsedSchema,
  data: Record<string, any>,
  meta: InspectionMeta
): InspectionValidationResult => {
  const issues: ValidationIssue[] = [...validateMeta(meta)]

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const rawValue = data[field.key]

      if (field.required && isBlank(rawValue)) {
        issues.push({
          code: 'required_field_missing',
          sectionId: section.id,
          sectionTitle: section.title,
          fieldKey: field.key,
          inputKey: field.key,
          fieldLabel: field.label,
          message: `${section.title} -> ${field.label} is verplicht.`
        })
      }

      if (Array.isArray(rawValue)) {
        rawValue.forEach((entry) => {
          if (!isNokValue(entry)) return

          const responsibleKey = `${field.key}__responsible__${entry}`
          if (isBlank(data[responsibleKey])) {
            issues.push({
              code: 'nok_responsible_missing',
              sectionId: section.id,
              sectionTitle: section.title,
              fieldKey: field.key,
              inputKey: responsibleKey,
              fieldLabel: field.label,
              message: `${section.title} -> ${field.label}: verantwoordelijke ontbreekt voor ${entry}.`
            })
          }
        })

        return
      }

      if (isNokValue(rawValue)) {
        const responsibleKey = `${field.key}__responsible`
        if (isBlank(data[responsibleKey])) {
          issues.push({
            code: 'nok_responsible_missing',
            sectionId: section.id,
            sectionTitle: section.title,
            fieldKey: field.key,
            inputKey: responsibleKey,
            fieldLabel: field.label,
            message: `${section.title} -> ${field.label}: verantwoordelijke ontbreekt voor ${rawValue}.`
          })
        }
      }
    })
  })

  return {
    isValid: issues.length === 0,
    issues,
    requiredFieldIssues: issues.filter((issue) => issue.code === 'required_field_missing').length,
    nokResponsibleIssues: issues.filter((issue) => issue.code === 'nok_responsible_missing').length,
    metaIssues: issues.filter((issue) => issue.code === 'meta_missing').length
  }
}
