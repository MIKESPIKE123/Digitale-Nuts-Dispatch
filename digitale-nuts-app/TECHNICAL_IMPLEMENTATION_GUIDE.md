# Technische Implementatie Gids

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Actieve architectuur

### Kernschermen
- `src/screens/Home.tsx`
- `src/screens/Inspection.tsx`
- `src/screens/Handover.tsx`
- `src/screens/SyncCenter.tsx`
- `src/screens/SignalisatieScan.tsx`

### Kernlogica
- `src/lib/schema.ts` - parsing van inspectieschema
- `src/lib/validation.ts` - validatie van verplichte velden/NOK/meta
- `src/lib/storage.ts` - localStorage modellen + config backups
- `src/lib/sync.ts` - sync queue verwerking
- `src/lib/geocoding.ts` - reverse geocoding + GPS fallback
- `src/lib/photos.ts` - fotoverwerking + stempel (logo/GPS/adres)

### Exports
- `src/InspectionReportGenerator.ts` - uitgebreide PDF
- `src/SimplePDFGenerator.ts` - eenvoudige PDF
- `src/CSVExporter.ts` - CSV exports

## Kritieke implementatiepatronen

### 1. NOK-verantwoordelijke
- Detectie gebeurt op waarde die start met `NOK`.
- Voor elk NOK-item moet een verantwoordelijke opgeslagen worden op:
  - single: `${fieldKey}__responsible`
  - multi: `${fieldKey}__responsible__${entry}`

### 2. Configuratie persistence
- Primary key: `dn_config_2026_02`
- Backup key: `dn_config_2026_02_backup`
- Legacy compat: `inspectie-app-config`, `inspectionConfig`

### 3. GPS + adres
- GPS capture gebeurt in `Inspection`.
- Bij falen wordt fallback-coordinaat gebruikt (Stadhuis Antwerpen).
- Adres wordt opgehaald via reverse geocoding en in basisvelden gemapt.

### 4. Foto-stempel
- Centrale stempel gebeurt in `src/lib/photos.ts`.
- Stempel bevat in rechteronderhoek:
  - stadslogo bovenaan
  - GPS-regel
  - adresregel

## Release en versieflow (technisch)
1. Verhoog `APP_VERSION` in `src/version.ts`.
2. Voeg changelog-entry toe in `VERSION_CHANGELOG`.
3. Update `CHANGELOG.md` en documentatiebestanden.
4. Run `npm run build`.
5. Verifieer dat header in `App.tsx` correcte versie toont.

## Validatiechecklist
- Build zonder TypeScript errors.
- Exportknoppen werken met geldige inspectie.
- NOK-validatie blokkeert onvolledige dossiers.
- Config save/load werkt over herstart.
- Foto's bevatten stempel met logo/GPS/adres.
