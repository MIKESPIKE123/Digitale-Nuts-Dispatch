# DN GIPOD Beta Real-Tenant Validatieplan

Datum: 2026-02-28  
Status: Ready for execution  
Doel: echte beta-tenant validatie uitvoeren met reproduceerbare bewijslast voor `DN v1.7`.

## 1. Scope

1. Omgeving: `beta` (`https://gipod.api.beta-vlaanderen.be`).
2. Functionele focus: notificatie-inbox + dispatch-urgentieflow.
3. Datadomein: `public-domain-occupancies` + `notifications`.

## 2. Toegang en prerequisites

1. Geldige bearer token met scopes:
   - `gipod_pdo_read`
   - `gipod_notifications`
2. Bevestigde NIS-codes voor operationeel gebied (5 cijfers).
3. Contactpunt Athumi/GIPOD voor scope/probleemescalatie.

## 3. Uitvoering smoke + rapport

PowerShell voorbeeld:

```powershell
$env:GIPOD_BASE_URL = "https://gipod.api.beta-vlaanderen.be"
$env:GIPOD_BEARER_TOKEN = "<beta-token>"
$env:GIPOD_NIS_CODES = "11002"
$env:GIPOD_API_VERSION = "auto"
$env:GIPOD_SMOKE_REPORT_PATH = "docs/uitvoering/evidence/gipod_beta_smoke_20260228.json"
npm run gipod:smoke
```

Verplicht bewijs:

1. Console output van smoke run.
2. JSON rapport in `docs/uitvoering/evidence/`.
3. Screenshot van Governance Inbox en Dispatch urgentieblok.

## 4. Validatiematrix (real tenant)

1. Scenario `VT-01`: notificatielijst laadt in Governance.
2. Scenario `VT-02`: statusupdate vanuit Governance werkt.
3. Scenario `VT-03`: urgente notificatie verschijnt in Dispatch-blok.
4. Scenario `VT-04`: contextactie opent dispatchfocus of dossiercontext.
5. Scenario `VT-05`: bij rate-limit (`429`) verhoogt poll-interval zichtbaar.

## 5. Go/No-Go criteria

1. `VT-01..VT-04` geslaagd.
2. Geen blocker met severity `S1`.
3. 429-gedrag aantoonbaar zonder retry-storm.
4. Bewijslast aanwezig in `docs/uitvoering/evidence/`.

## 6. Open punten voor uitvoering

1. Tokenrotatie-afspraken en geldigheidsduur bevestigen.
2. Definitieve productiecutover-datum vastleggen.
3. Owner per validatiescenario benoemen.
