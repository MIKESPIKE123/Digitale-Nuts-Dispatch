# PX-04 GIPOD Beta Onboarding Checklist

Datum: 2026-02-28  
Status: Actief (voorbereiding API-koppeling, sunset-safe smoke test)  
Doel: toegang, scope en technische randvoorwaarden scherp zetten voor PX-04.

## 1. Beslissingen (vastgelegd)

1. Omgeving: `beta` (`https://gipod.api.beta-vlaanderen.be`).
2. Scope nu: alleen `public-domain-occupancies` (read).
3. Signalisatiegerelateerde stromen blijven in scope voor schil 1, maar pas in volgende stap.
4. NIS-filter nodig, maar eerst correcte code(s) bevestigen.

## 2. Belangrijk: GUI-login is niet hetzelfde als API-toegang

1. Een persoonlijke login op de GIPOD-website geeft toegang tot de webtoepassing, niet automatisch tot de API.
2. De API verwacht een `Authorization: Bearer <token>` header met juiste policy/scope.
3. Voor read op public-domain-occupancies is policy `gipod_pdo_read` nodig.
4. Deel nooit persoonlijke wachtwoorden of browsercookies in de appcode.

## 3. Wat je aan GIPOD/Athumi moet vragen

Gebruik deze vragen letterlijk in je mail/ticket:

1. Kunnen jullie voor ons een `beta` API-toegang voorzien voor `public-domain-occupancies` met scope/policy `gipod_pdo_read`?
2. Welke authenticatiemethode gebruiken jullie exact voor API-tokens (token generatie, geldigheid, rotatie)?
3. Welke organisatie- of projectregistratie is nodig om API-credentials te krijgen?
4. Kunnen jullie bevestigen welke endpointversie wij nu best gebruiken (v1 swagger) en hoe breaking changes gecommuniceerd worden?
5. Welke rate limits gelden op beta en productie (requests/minuut, bursts, pagination-limieten)?
6. Wat is de aanbevolen `limit` per request en max `offset`?
7. Welke queryfilters raden jullie aan voor gemeentelijke dispatch (minstens `niscode`, `lastmodified.start/end`, `statusid`)?
8. Kunnen jullie een voorbeeldrequest + voorbeeldresponse delen voor `GET /api/{versie}/public-domain-occupancies` met NIS-filter?
9. Wat is de typische data-latency in beta (hoe snel statuswijzigingen zichtbaar worden)?
10. Is productie-toegang later dezelfde auth-flow, of zijn er extra governance-/securitystappen?

## 4. NIS-code uitgelegd

1. Een NIS-code is de gemeentecode (5 cijfers), gebruikt als ruimtelijke filter in de API.
2. `NIS 2` is op zich geen bruikbare waarde; de API verwacht volledige code(s), bv. `11002` voor Antwerpen.
3. Vraag intern of aan GIPOD exact welke NIS-code(s) jullie operationeel nodig hebben.

## 5. Technische implementatievolgorde in DN

1. Eerst: `smoke test` op beta endpoint met bearer token.
2. Daarna: read-adapter voor `GET /api/{versie}/public-domain-occupancies` met `niscode` + `lastmodified`.
3. Daarna: mapping naar `WorkRecord` (met duidelijke fallbackregels voor ontbrekende velden).
4. Fallback behouden: lokale `works.generated.json` blijft actief bij API-fout.
5. Pas in volgende stap: signalisatie-uitbreiding en extra GIPOD-stromen.

### 5.1 Smoke test nu beschikbaar

Script: `scripts/gipod-beta-smoke.mjs`  
NPM command: `npm run gipod:smoke`

Benodigde environment variabelen:

1. `GIPOD_BEARER_TOKEN` (verplicht)
2. `GIPOD_NIS_CODES` (verplicht, komma-gescheiden, bv. `11002`)

Optioneel:

1. `GIPOD_BASE_URL` (default `https://gipod.api.beta-vlaanderen.be`)
2. `GIPOD_API_VERSION` (`auto`, `v1`, `v2`; default `auto`)
3. `GIPOD_ENDPOINT_PATH` (overschrijft versiekeuze expliciet, bv. `/api/v1/public-domain-occupancies`)
4. `GIPOD_LIMIT` (default `10`)
5. `GIPOD_OFFSET` (default `0`)
6. `GIPOD_LASTMODIFIED_START` (ISO datetime)
7. `GIPOD_LASTMODIFIED_END` (ISO datetime)
8. `GIPOD_TIMEOUT_MS` (default `30000`)
9. `GIPOD_SMOKE_REPORT_PATH` (optioneel, schrijft JSON bewijsrapport naar projectmap)

Voorbeeld in PowerShell:

```powershell
$env:GIPOD_BEARER_TOKEN = "<token-van-athumi>"
$env:GIPOD_NIS_CODES = "11002"
$env:GIPOD_API_VERSION = "auto"
$env:GIPOD_SMOKE_REPORT_PATH = "docs/uitvoering/evidence/gipod_beta_smoke_20260228.json"
npm run gipod:smoke
```

### 5.2 Version guard (sunset-safe)

1. De smoke test ondersteunt `GIPOD_API_VERSION=auto|v1|v2`.
2. In `auto` probeert het script eerst v2 en valt alleen terug op v1 bij endpoint-versiefouten (`404/410`).
3. Als `GIPOD_ENDPOINT_PATH` gezet is, wordt die altijd gebruikt (deterministische smoke runs).
4. Na sunset-datums geeft het script extra waarschuwing bij v1-gebruik.

### 5.3 Next execution docs

1. Real-tenant validatieplan: `docs/uitvoering/DN_GIPOD_BETA_REAL_TENANT_VALIDATIEPLAN.md`
2. Operationele acceptatie (7 dagen): `docs/uitvoering/DN_GIPOD_OPERATIONELE_ACCEPTATIE_7_DAGEN.md`
3. Release gate v1.7: `docs/uitvoering/DN_RELEASE_GATE_V1_7_CHECKLIST.md`

## 6. Open data versus API-toegang

1. "Open data" betekent niet altijd "anonieme API zonder auth".
2. In GIPOD zijn API-calls vaak beveiligd om policy, quota, auditing en contractstabiliteit te bewaken.
3. Reken dus op formele API-toegang, ook voor read-scenario's.
