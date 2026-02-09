# DIGITALE NUTS APP - BUSINESS RULES DOCUMENTATIE

Datum update: 8 februari 2026  
Projectversie: `Versie 2026_02`
Appversie: `v1.4` (bron: `src/version.ts`)

## Doel
Dit document beschrijft de actuele business rules in de actieve codebasis van de Digitale Nuts app, met focus op terreinimpact, validatie en operationele betrouwbaarheid.

## Scope van deze update
- Vergelijking uitgevoerd met de vorige versie in:
  - `C:\Users\5129\OneDrive - digipolis.onmicrosoft.com\Apps\DIGITALE NUTS APP\vaststellingen app test REACT\BUSINESS_RULES_DOCUMENTATION.md`
- Oude verwijzingen naar niet-actieve modules (`PlannedInspectionPage.tsx`, `ConfigManager.tsx`) vervangen door actuele modules.
- Regels die eerder als "nog te ontwikkelen" stonden, nu gemapt op effectieve implementatie.

## Compliance Matrix

| Regel-ID | Regel | Status | Actieve implementatie |
|---|---|---|---|
| BR-1.1 | NOK vereist verantwoordelijke partij | Geimplementeerd | `src/lib/validation.ts`, `src/screens/Inspection.tsx` |
| BR-1.2 | NOK prioriteit in rapportage | Geimplementeerd | `src/InspectionReportGenerator.ts` |
| BR-1.3 | NOK visuele feedback op invoervelden | Geimplementeerd | `src/screens/Inspection.tsx`, `src/index.css` |
| BR-2.1 | Unieke inspecteurnamen | Geimplementeerd | `src/components/ConfigPanel.tsx` |
| BR-2.2 | Telefoonvalidatie `0XXX XXX XXX` | Geimplementeerd | `src/components/ConfigPanel.tsx` |
| BR-2.3 | Inspecteur kan meerdere postcodes toegewezen krijgen | Geimplementeerd | `src/components/ConfigPanel.tsx`, `src/lib/storage.ts` |
| BR-3.1 | GPS ophalen bij inspectie | Geimplementeerd | `src/screens/Inspection.tsx` |
| BR-3.2 | GPS manueel corrigeren via kaart | Geimplementeerd | `src/GPSMap.tsx`, `src/screens/Inspection.tsx` |
| BR-3.3 | GPS opnemen in rapportage | Geimplementeerd | `src/screens/Inspection.tsx`, `src/InspectionReportGenerator.ts`, `src/CSVExporter.ts`, `src/SimplePDFGenerator.ts` |
| BR-3.4 | Fallback GPS naar Stadhuis Antwerpen bij falen | Geimplementeerd | `src/lib/geocoding.ts`, `src/screens/Inspection.tsx` |
| BR-3.5 | Automatische adresopzoeking op basis van GPS | Geimplementeerd | `src/lib/geocoding.ts`, `src/screens/Inspection.tsx` |
| BR-4.1 | Automatische GIPOD-link op basis van nummer | Geimplementeerd | `src/screens/Inspection.tsx` |
| BR-4.2 | GIPOD validatie op minimum 8 cijfers | Geimplementeerd | `src/screens/Inspection.tsx`, `src/lib/analysis.ts` |
| BR-5.1 | Uitgebreide en eenvoudige PDF export | Geimplementeerd | `src/InspectionReportGenerator.ts`, `src/SimplePDFGenerator.ts`, `src/screens/Inspection.tsx` |
| BR-5.2 | Uitgebreide en eenvoudige CSV export | Geimplementeerd | `src/CSVExporter.ts`, `src/screens/Inspection.tsx` |
| BR-5.3 | Metadata in export (datum/tijd/inspecteur/locatie/GPS/GIPOD) | Geimplementeerd | `src/screens/Inspection.tsx`, `src/InspectionReportGenerator.ts`, `src/CSVExporter.ts`, `src/SimplePDFGenerator.ts` |
| BR-5.4 | Foto's per vaststellingselement koppelen | Geimplementeerd | `src/lib/photos.ts`, `src/screens/Inspection.tsx`, `src/CSVExporter.ts`, `src/InspectionReportGenerator.ts`, `src/SimplePDFGenerator.ts` |
| BR-5.5 | Foto-stempel met stadslogo + GPS + adres op beeld | Geimplementeerd | `src/lib/photos.ts`, `src/screens/Inspection.tsx`, `src/screens/SignalisatieScan.tsx` |
| BR-6.1 | Persistente configuratie in localStorage | Geimplementeerd | `src/lib/storage.ts` |
| BR-6.2 | Beheer van inspecteurs/postcodes/partijen/wie werkt er | Geimplementeerd | `src/components/ConfigPanel.tsx`, `src/lib/workParties.ts` |
| BR-6.3 | Configuratie import/export via JSON | Geimplementeerd | `src/components/ConfigPanel.tsx` |
| BR-6.4 | Configuratie-backup en legacy fallback keys | Geimplementeerd | `src/lib/storage.ts` |
| BR-7.1 | Consistente Antwerpse UI-lijn en responsive layout | Geimplementeerd | `src/index.css`, `src/App.tsx` |
| BR-7.2 | Versie zichtbaar in app-header | Geimplementeerd | `src/App.tsx`, `src/version.ts` |
| BR-7.3 | Voortgang per sectie op verplichte velden | Geimplementeerd | `src/screens/Inspection.tsx`, `src/index.css` |
| BR-8.1 | Verplichte veldvalidatie (schema-driven) | Geimplementeerd | `src/lib/validation.ts` |
| BR-8.2 | Typegedrag per veldtype (input/select/multiselect/textarea) | Geimplementeerd | `src/screens/Inspection.tsx`, `src/lib/schema.ts` |
| BR-8.3 | Acties blokkeren bij ongeldige inspectie | Geimplementeerd | `src/screens/Inspection.tsx` |

## Detailregels

### 1) NOK en verantwoordelijkheden
- Bij elke NOK-selectie moet een verantwoordelijke partij ingevuld zijn.
- Deze regel geldt voor zowel single select als multiselect.
- Export en sync worden geblokkeerd zolang de validatie niet slaagt.

### 2) Inspecteur en zonebeheer
- Inspecteurs zijn configureerbaar inclusief telefoonnummer.
- Telefoonvalidatie gebruikt format `0XXX XXX XXX`.
- Inspecteurs kunnen gekoppeld worden aan meerdere postcodes.
- Bij mismatch tussen gekozen inspecteur en postcode toont de app een waarschuwing.

### 3) GPS, adres en locatiekwaliteit
- GPS wordt automatisch geprobeerd bij start van een inspectie.
- Als GPS niet beschikbaar is, gebruikt de app standaard:
  - `51.221127, 4.399708` (Stadhuis Antwerpen, Grote Markt 1)
- Reverse geocoding gebeurt via Nominatim.
- Op klik van de GPS-data wordt adreslookup opnieuw uitgevoerd en basisdata ingevuld:
  - meta `location`
  - straatveld (indien aanwezig in schema)
  - postcodeveld (indien aanwezig in schema)
  - gps-code veld (indien aanwezig in schema)

### 4) GIPOD
- Bij invullen van een GIPOD-waarde wordt de link opgebouwd met de laatste 8 cijfers.
- Minder dan 8 cijfers geeft een duidelijke validatiemelding.
- Vergunningstatus-check gebruikt deze validatieregel mee.

### 5) Foto-evidence per element
- Foto's worden gekoppeld aan het specifieke inspectieveld via `<fieldKey>__photos`.
- Limieten:
  - max 4 foto's per veld
  - max 30 foto's per inspectie
- Foto's worden gecomprimeerd voor opslag en syncbaarheid.
- Export bevat het aantal gekoppelde foto's.
- Bij upload/capture wordt automatisch een stempel op de foto gezet:
  - stadslogo bovenaan in de stempel
  - GPS en adres in de rechteronderhoek

### 6) Configuratie en continuiteit
- Configuratie wordt opgeslagen op primaire key plus backup key.
- Legacy keys blijven leesbaar voor migratie:
  - `inspectie-app-config`
  - `inspectionConfig`
- Configuratie ondersteunt import/export in JSON.

## Lokale storage keys (actueel)
- Config primary: `dn_config_2026_02`
- Config backup: `dn_config_2026_02_backup`
- Config legacy read/write: `inspectie-app-config`
- Config legacy fallback read: `inspectionConfig`
- Inspecties: `dn_inspections_2026_02`
- Sync queue: `dn_sync_queue_2026_02`
- Sync settings: `dn_sync_settings_2026_02`

## Actieve hoofdmodules
- `src/App.tsx`
- `src/screens/Inspection.tsx`
- `src/components/ConfigPanel.tsx`
- `src/lib/storage.ts`
- `src/lib/validation.ts`
- `src/lib/geocoding.ts`
- `src/lib/photos.ts`
- `src/InspectionReportGenerator.ts`
- `src/CSVExporter.ts`
- `src/SimplePDFGenerator.ts`

## Technische validatie
Uitgevoerd op 8 februari 2026:
- `npm run build`
- Resultaat: geslaagd (TypeScript + Vite build OK)

## Besluit
Alle kritieke business rules uit de vorige documentatie zijn in de actieve codebasis afgedekt.  
De documentatie is bijgewerkt naar de effectieve architectuur en aangevuld met de nieuwe terreinregels (GPS fallback, automatische adreslookup, foto-koppeling per element, config back-up/fallback).
