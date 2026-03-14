# DN Dispatch - Architecture

Laatste update: 2026-03-14  
Status: actieve index

## Doel

DN Dispatch is de operationele kernapp voor dispatch, terreinregistratie, synchronisatie en opvolging van nutsdossiers.

## Hoofdopbouw

- `src/App.tsx`: compositie van views, navigatie en operationele flows
- `src/modules/vaststelling/`: terreinregistratie, validatie, opslag, sync en PDF-rapportage
- `src/modules/integrations/`: gateway-contracten, mockimplementaties en API-gateways
- `src/modules/kpi/`: KPI-definities, engines en trendberekening
- `src/lib/` en `src/config/`: gedeelde logica, dispatchregels en configuratie
- `scripts/`: import- en synchronisatiescripts voor brondata
- `src/data/` en `public/data/`: gegenereerde fallback- en runtime-data

## Canonieke architectuurbronnen

- `docs/techniek/DN_REFERENTIEARCHITECTUUR.md`
- `docs/techniek/ARCHITECTUUR_DATAONTSLUITING_VASTSTELLINGEN.md`
- `docs/techniek/DN_GIPOD_NOTIFICATIE_INBOX_TECHNISCH_ONTWERP.md`
- `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md`
- `docs/Archisnapper/DN_ARCHISNAPPER_KOPPELING_EN_DOORGROEISCENARIO.md`

## Werkafspraken

- Nieuwe integraties blijven achter gateway-contracten.
- Nieuwe structurele keuzes krijgen een ADR in `docs/architectuur-beslissingen/`.
- Gegenereerde data wordt alleen bewust vernieuwd en gevalideerd.
