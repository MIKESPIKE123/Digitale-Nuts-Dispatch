# Demo Script - Dag in het Leven (Pitch Ready v1)

Datum: 2026-02-17  
Doel: een stabiele projectteam-demo in ongeveer 9 minuten.

## 1. Voorbereiding (voor start)
1. Voer `Demo reset` uit.
2. Controleer actieve toezichter-sessie.
3. Controleer dispatchdatum (werkdag).
4. Zorg dat minstens 1 NOK-dossier en 1 sync-fail scenario klaar staat.

## 2. Klikscript per minuut

| Minuut | Doel | Scherm | Kernboodschap |
|---|---|---|---|
| 00:00 - 00:45 | Context zetten | DN Dashboard | DN koppelt planning, kaart en vaststelling in 1 operationele flow. |
| 00:45 - 02:00 | Dagstart tonen | DN Dispatch | Filters en datum bepalen direct de werkbare terreinlijst. |
| 02:00 - 03:15 | Ruimtelijke context | DN Kaart | Action cards sturen kaartfocus en versnellen prioritering. |
| 03:15 - 04:45 | Registratie met context | DN Vaststelling | BONU, GW/referentie, GIPOD, adres en nutsmaatschappij worden meegenomen. |
| 04:45 - 05:45 | Beslissing en validatie | DN Vaststelling acties | Valid + handover maakt opvolging traceerbaar. |
| 05:45 - 06:45 | Offline/online gedrag | Sync Center | Queue en retry maken sync robuust bij verbindingsproblemen. |
| 06:45 - 07:45 | Meetbaarheid | KPI-paneel v1 | Kern-KPI's tonen impact en datakwaliteit in realtime context. |
| 07:45 - 09:00 | Afsluiten met beslissingen | DN Handleiding / Data & Sync | Voor productie zijn partnerdata en API-contracten de volgende stap. |

## 3. Fallbackplan bij internet/sync issues
1. Als sync endpoint niet bereikbaar is:
- Toon dat item op `failed` komt in Sync Center.
- Toon `retry` flow wanneer verbinding terug is.
2. Als kaart traag laadt:
- Schakel naar DN Dispatch en toon dezelfde dossiercontext via action cards.
3. Als data-refresh tijdelijk mislukt:
- Gebruik bestaande demo dataset en benoem expliciet dat dit een offline-safe demo-run is.
4. Als tijd op raakt:
- Gebruik alleen stappen 1, 4, 6 en 8 (compacte 4-minutenvariant).

## 4. Afsluitzin voor spreker
"De UI staat er, de terreinflow werkt, en met partner-API's kunnen we dit snel opschalen naar productie."
