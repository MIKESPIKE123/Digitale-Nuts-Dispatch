# DN Vaststelling - Full Adoption Status

Datum: 2026-02-15

## Opgeleverd in deze iteratie
- Verplichte actieve toezichter-sessie op app-niveau:
  - sessie-overlay bij opstart indien geen actieve toezichter gekozen is;
  - sessie wisselen en resetten vanuit dispatchpanelen;
  - persistente sessie in localStorage.
- Terreinmodus toegevoegd in dispatch:
  - filter op toezichters kan vastgezet worden op de actieve toezichter;
  - default gedrag focust op actieve toezichter voor terreinwerking.
- `DN Vaststelling` uitgebreid van fase-0 scaffold naar operationele module:
  - schema-gedreven veldinvoer vanuit `archisnapper.csv`;
  - validatie op verplichte velden + NOK-verantwoordelijke + meta-locatie;
  - handoverkeuze (`BLOCK`, `REQUEST_FIX`, `APPROVE`) en notities;
  - start vanuit "Mijn lijst vandaag" met immutable context;
  - recordstatusflow: `draft -> valid -> queued -> synced`.
- Sync center geïntegreerd in de module:
  - lokale wachtrij met deduplicatie per inspectie;
  - endpoint-instellingen + auto-sync on online + timeout;
  - sync-uitkomst teruggekoppeld naar recordstatus.

## Nieuwe/gewijzigde bestanden
- `src/App.tsx`
- `src/styles.css`
- `src/modules/vaststelling/contracts.ts`
- `src/modules/vaststelling/storage.ts`
- `src/modules/vaststelling/sync.ts`
- `src/modules/vaststelling/validation.ts`
- `src/modules/vaststelling/VaststellingView.tsx`
- `src/modules/vaststelling/sync.test.ts`
- `src/modules/vaststelling/validation.test.ts`

## Restpunten voor volgende fase
- Integratie van foto-evidenceflow uit legacy app (incl. limieten/compressie).
- Verrijking met GPS-capture en reverse geocoding in dezelfde module.
- Optionele SSO/Entra-authenticatie in plaats van lokale sessie.
- Dispatcher-kaarten uitbreiden met zichtbare vaststellingsstatus per actiekaart.
