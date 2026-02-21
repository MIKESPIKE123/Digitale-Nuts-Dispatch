# Iteratie 1 - Optimalisatieplan Stabiliteit & Snelheid

Datum: 2026-02-15
Project: `DN_DISPATCH`

## Doel
De app sneller laten laden, stabieler synchroniseren en regressies sneller detecteren.

## Volgorde en inspanning

1. Bundeloptimalisatie en lazy loading
- Schatting: 3-4 uur
- Quick win: ja
- Status: uitgevoerd
- Resultaat:
  - lazy loading voor grote schermcomponenten
  - `manualChunks` in Vite voor betere chunk-opsplitsing

2. Sync-flow robuuster (works + impact samen)
- Schatting: 1-2 uur
- Quick win: ja
- Status: uitgevoerd
- Resultaat:
  - lokale sync API draait nu zowel `import:data` als `import:impact`
  - minder kans op mismatch tussen dossiers en impactprofielen

3. Kaartperformantie verbeteren
- Schatting: 4-6 uur
- Quick win: deels
- Status: deels uitgevoerd
- Resultaat:
  - markers worden nu beperkt tot huidig kaartbeeld (viewport) + geselecteerde pin
  - directe winst bij veel zichtbare punten
- Volgende stap:
  - migratie naar GeoJSON circle/symbol layers + clustering voor grote datasets

4. Straatzoeker hardenen
- Schatting: 2-3 uur
- Quick win: ja
- Status: uitgevoerd
- Resultaat:
  - abort van vorige request bij nieuwe zoekactie
  - cache op queryniveau
  - minimum querylengte voor externe opzoeking

5. Kwaliteitspipeline (typecheck + tests)
- Schatting: 3-5 uur
- Quick win: ja
- Status: uitgevoerd (basis)
- Resultaat:
  - `typecheck`, `test`, `test:watch`, `quality` scripts
  - eerste unit tests op dispatch-continuiteit en continuity-registratie
- Volgende stap:
  - extra tests op kaartgedrag, datumflow en sync-scenario's

## Concreet opgeleverd in deze iteratie
- lazy loading:
  - `MapPanel`, `InspectorBoard`, `TimelineView`, `SettingsModal`
- vite chunking:
  - aparte vendor chunks voor map/pdf/react
- sync endpoint:
  - gecombineerde import-run (`works` + `impact`)
- map:
  - viewport-based rendering van pins
- search:
  - `AbortController` + cache + minimumlengte
- quality:
  - vitest setup + 2 gerichte tests

## Aanbevolen Iteratie 2
1. GeoJSON-clustering van pins in plaats van losse marker-buttons.
2. E2E smoke tests (kaartselectie, popup open/dicht, sync melding).
3. Routeberekening throttlen/cache per filtercontext.
