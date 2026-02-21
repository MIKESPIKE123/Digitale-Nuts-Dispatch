# AI_CONTEXT

## projectdoel
- DN_DISPATCH is de dispatchmodule binnen DIGITALE NUTS voor operationele planning van nutsdossiers in Antwerpen.
- Doel: per werkdag de juiste actiepunten selecteren, toewijzen aan toezichters en visueel opvolgen op kaart.
- De module ondersteunt dispatchbeslissingen, follow-up en snelle context via action cards, kaartlagen en zoekfunctionaliteit.

## architectuurregels
- Tech stack: React + TypeScript + Vite.
- `src/App.tsx` is de orchestrator voor state, filtercontext, view-routing en synchronisatie-acties.
- Domeinlogica staat in `src/lib/*` en blijft gescheiden van UI-componenten.
- UI-componenten in `src/components/*` zijn props-gedreven en bevatten geen verborgen business rules.
- Configuratie staat centraal in `src/config/*` (inspectors, holidays, postcode-centroids).
- Data-import gebeurt via script (`scripts/import-nuts-data.mjs`), niet via handmatige edits in generated datafiles.
- Wijzigingen moeten backward-compatible blijven met bestaande dispatchflow, filters en kaartinteractie.

## naming conventions
- Componenten: PascalCase bestandsnamen (`MapPanel.tsx`, `InspectorBoard.tsx`).
- Utilities/libs: camelCase bestandsnamen (`dateUtils.ts`, `appSettings.ts`).
- Types/interfaces: PascalCase (`WorkRecord`, `DispatchPlan`, `PlannedVisit`).
- Constanten: UPPER_SNAKE_CASE (`DATA_URL`, `SYNC_ENDPOINT`, `STATUS_VALUES`).
- Variabelen/functies: camelCase (`selectedVisitId`, `buildDispatchPlan`).
- Datumnotatie in domeinmodellen: ISO `YYYY-MM-DD`.
- UI labels/teksten: operationeel Nederlands; technische identifiers in Engels.

## data flow
1. Brondataset komt uit DIGITALE NUTS: `DATA/Weekrapport Nutswerken totaallijst.xlsx` (sheet `Totaallijst`).
2. Importscript `npm run import:data` (`scripts/import-nuts-data.mjs`) filtert, normaliseert en verrijkt records.
3. Businessfilters op import:
   - relevante nutsdossiers (BONU/jaartallen), met exclusies (`SWPR*`, `SWOU*`, `DL*`)
   - werftype `NUTSWERKEN`
   - statussen `VERGUND` en `IN EFFECT`
4. Locatieverrijking:
   - geocode-cache (`DATA/geocode-cache.json`) + Nominatim waar nodig
   - fallback op postcode-centroids
5. Impactverrijking:
   - script `npm run import:impact` maakt profieldata per postcode
   - output: `src/data/impact.generated.json` + `public/data/impact.generated.json`
6. Outputbestanden:
   - `src/data/works.generated.json` (bundle fallback)
   - `public/data/works.generated.json` (runtime bron)
   - `DATA/dispatch_nuts_works.csv` (controle-export)
7. Runtime in app:
   - fetch van `/data/works.generated.json`
   - impactprofielen worden mee geladen en gebruikt in prioriteitscore
   - dispatchberekening via `buildDispatchPlan(...)`
   - gedeelde selectiecontext tussen action cards en kaart (`selectedVisitId`)
8. Evaluatie/kalibratie:
   - command `npm run impact:phase4`
   - output: `DATA/impact_priority_evaluation.json` en `DATA/impact_priority_evaluation.csv`
9. Instellingen:
   - opgeslagen in localStorage via `dn_dispatch_settings_v1` en altijd gesanitized.

## beperkingen
- Runtime data is file-based JSON; geen volwaardige backend als source of truth.
- Externe geocoding (Nominatim) heeft rate-limieten/beschikbaarheidsrisico's.
- Kaartprecisie hangt af van `locationSource` (`exact` vs `postcode`).
- Werkdaglogica is gevoelig voor juiste feestdagenconfiguratie en geldige datuminvoer.
- Grote overlays/popup-inhoud kunnen op kleine schermen UX beïnvloeden; responsive gedrag blijft randvoorwaarde.
- Integraties (A-SIGN, GIPOD, Open Data) zijn deels gefaseerd en niet overal volledig bidirectioneel.
- DN_DISPATCH deelt domeindata met DIGITALE NUTS, maar heeft eigen UI-flow, settings-keys en modulegrenzen.
