# Reviewer Guide - Digitale Nuts App

## Versiebeheer
- Te reviewen appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Reviewprioriteiten

### 1. Functionele correctheid
- NOK-validatie en verplichte verantwoordelijke.
- GPS-flow inclusief fallback en adreslookup.
- Exporten (PDF/CSV) met metadata en foto-aantallen.
- Foto-stempel op upload en camera-capture.

### 2. Configuratie en data-integriteit
- Config save/load met backup keys.
- Import/export configuratie JSON.
- Inspector-postcode toewijzing en waarschuwingen.

### 3. Operationele stabiliteit
- Sync queue gedrag (queued/failed/synced).
- Geen regressie in inspectieflow.
- Build status groen.

## Snelle checks
```bash
npm install
npm run build
npm run dev
```

## Te controleren bestanden
- `src/screens/Inspection.tsx`
- `src/screens/SignalisatieScan.tsx`
- `src/lib/photos.ts`
- `src/lib/geocoding.ts`
- `src/lib/validation.ts`
- `src/lib/storage.ts`
- `src/components/ConfigPanel.tsx`
- `src/InspectionReportGenerator.ts`
- `src/CSVExporter.ts`
- `src/SimplePDFGenerator.ts`

## Reviewvragen
1. Is elke NOK effectief gekoppeld aan een verantwoordelijke?
2. Werkt GPS fallback correct als geolocatie faalt?
3. Krijgen foto's consequent logo + GPS + adresstempel?
4. Is de exportinhoud bruikbaar voor backoffice-opvolging?
5. Zijn versie en documentatie consistent (`src/version.ts` vs markdown)?
