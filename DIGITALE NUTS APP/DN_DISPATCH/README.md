# DN Dispatch

Visuele dispatch-app voor nutsdossiers met focus op:

- kaartweergave per dag
- straatzoeker op de kaart (lokaal + geocoder fallback)
- postcoderanden als toggle-layer
- toewijzing per postcode (7 toezichters met initialen)
- capaciteit 5 + 1 overflow
- verplichte start/eindbezoeken en tussencadans
- wekelijkse opleveringsopvolging (mail/telefoon)

## Starten

```bash
npm install
npm run dev
```

App URL (default): `http://localhost:3012`
Alternatieve poort: `OPEN DN DISPATCH - LAATSTE VERSIE.cmd 3017`

Poortgedrag:
- `3012` en `3017` draaien exact dezelfde app; het verschil is alleen welke lokale serverinstantie je open hebt.
- De dev-server staat nu op `strictPort`, dus een bezette poort schuift niet meer stil door naar een andere poort.

Of gebruik het opstartbestand:

- `OPEN DN DISPATCH - LAATSTE VERSIE.cmd`
- Dit bestand sluit eerst automatisch oude lokale dev-instanties op poorten `3012/3016/3017` (plus gekozen poort) af en start daarna 1 verse instantie.

## Kwaliteitschecks

```bash
npm run quality
```

Dit draait:
- typecheck (`tsc -b`)
- unit tests (`vitest`)

## Samenwerking en documentatie

Voor samenwerking en repo-afspraken:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/README.md`

Licentie:

- Deze repo gebruikt een aangepaste, purpose-limited licentie: `LICENSE`
- Kernvoorwaarden:
  - gebruik en afgeleiden moeten bijdragen aan de publieke doelstelling van Digitale Nuts;
  - winstgedreven software-exploitatie is niet toegestaan onder deze licentie;
  - redelijke en aantoonbare kostenterugwinning voor implementatie, beheer en ondersteuning is wel toegestaan;
  - naamsvermelding van `Stad Antwerpen / Publieke Ruimte / Nuts` en de `VLAIO City of Things 2025` context is verplicht;
  - logo's en merkgebruik vallen niet onder de licentie.
- Verplichte attributietekst staat in `NOTICE`.

## Dataflow

1. Bronselectie:
   - primair: nieuwste `DATA/Export_*.xlsx` (case-insensitive, dus `export_*.xlsx` werkt ook),
   - fallback: `DATA/Weekrapport Nutswerken totaallijst.xlsx` (sheet `Totaallijst`).
2. Importscript: `npm run import:data`.
3. Genereert:
   - `src/data/works.generated.json` (fallback in bundle)
   - `public/data/works.generated.json` (runtime databron)
   - `public/data/postcode-boundaries.geojson` (kaartlaag postcoderanden)
4. De app leest runtime via `/data/works.generated.json`.
5. In `npm run dev` is er een sync-endpoint `POST /api/sync-dispatch-data` voor "Synchroniseer nu" (import van zowel works-data als impactprofielen).

## Impactprioritering (open data)

- Impactdata import: `npm run import:impact`
- Fase 4 evaluatie (volledige keten): `npm run impact:phase4`
- Evaluatie-output:
  - `DATA/impact_priority_evaluation.json`
  - `DATA/impact_priority_evaluation.csv`
- Opleidingsdocument:
  - `docs/TOEPASSING_05_IMPACT_PRIORITERING_OPLEIDING.md`

## Filters in scope

- Nutsdossiers:
  - exportflow: GIPOD Innames uit nieuwste export
  - fallbackflow: `BONU*` of jaartal `2025|2026|2027` in dossiernummer (met exclusie `SWPR*`, `SWOU*`, `DL*`)
- Status:
  - `VERGUND`
  - `IN EFFECT`
- GIPOD bronfase:
  - `In uitvoering`
  - `Concreet gepland`
  - `Niet uitgevoerd`
  - `Uitgevoerd`
- Categorie GW:
  - `Categorie 1`
  - `Categorie 2`
  - `Categorie 3`
  - `Dringend`
- Vergunningstatus:
  - `AFGELEVERD`
  - `IN_VOORBEREIDING`
  - `NIET_VEREIST`
  - `ONBEKEND(_MAAR_VERWACHT)`

## Dispatchregels

- Runtimebasisselectie start op de operationele kernstatussen `VERGUND` en `IN EFFECT`.
- Dispatch prioriteert eerst dossiers met goedgekeurde signalisatievergunning (`AFGELEVERD`).
- Daarna volgen dossiers met vergunningcontext (`IN_VOORBEREIDING` of geldige vergunningreferentie).
- Dossiers zonder vergunningcontext blijven mogelijk als operationele opvulling, maar pas nadat dossiers met vergunningcontext eerst aan bod kwamen.
- Dossiers met expliciete signalen `vergunning afgelopen` of `vergunning verlopen` worden wel uit dispatchkandidaten gehouden.
- Een project krijgt een vaste voorkeurtoezichter op basis van postcode + nabijheid.
- Die voorkeurtoezichter blijft prioritair voor latere toewijzingen.
- Projectkaarten zijn klikbaar en tonen een marker met locatieteken op de kaart.
- In elk projectkaartje staat de einddatum (`Loopt t.e.m.`).

## Recente aanvullingen

### v1.6 (2026-02-27)

- Toewijzingsarchief met snapshots per dispatchdatum, export (`.json`) en lokale reset in `DN Data & Sync`.
- Import/export van inspecteurinstellingen in `Instellingen` (inspecteurs, overrides, afwezigheden, dispatchcapaciteit).
- Vaststelling rechtstreeks openen vanuit kaartpopup:
  - `Open bestaand verslag`
  - `Nieuw verslag`
- Extra dossiercontext in action cards:
  - klikbare ReferentieID/A-SIGN en GIPOD-links,
  - toewijzingsrol (`Dedicated/Backup/Reserve`),
  - duidelijke manuele override-context.

### v1.7+ (2026-02 t.e.m. 2026-03)

- Routeringsvoorstel per toezichter — nearest-neighbor algo (`src/lib/routes.ts`) met curved route lines op kaart en UI toggle.
- GRB-basiskaart (grijs + kleur) en Luchtfoto Vlaanderen als kaartlagen (`public/styles/grb-gray.json`, `grb-color.json`, `luchtfoto-vl.json`).
- GIPOD/Webuniversum CSS-stijl — Flanders Art Sans/Mono fonts, Vlaamse overheid kleurenpalet.
- Gateway architectuur voor A-SIGN/GIPOD/KLM/OpenData — contracts, factory, mock + API gateways.
- GIPOD Notificaties — `ApiNotificationsGateway` met polling, taxonomy sync, dispatch alert block.
- Postcoderanden kaartlaag — GeoJSON boundaries + labels voor 16 postcodes (direct MapLibre API).
- Impact prioritering — open data scoring (bevolkingsdichtheid, kwetsbaarheid, dienstdruk, mobiliteit).
- KPI Dashboard v1 — 6+ KPI cards met trend.
- Handleiding view — Q&A, quick guides, pitch presentation, demo scripts.
- Governance view — 8-weken planning, 60-dagen traject, subsidieroadmap, budget, OSLO homologatie.
- Tijdlijn view — planning over de tijd met visuele balken.
- Dossiers view — filterbare dossierlijst met sortering en zoekfunctie.

## Configuratie

- Toezichters + postcodezones: `src/config/inspectors.ts`
- Feestdagen: `src/config/holidays.ts`
- Postcode-centroids: `src/config/postcodeCentroids.ts`
- UI-instellingen (namen, initialen, vakantiedagen, auto-sync): `localStorage` via knop `Instellingen`

## Integratie-flags (mock/API)

De integratielaag zit in `src/modules/integrations/*` met gateway-contracten:
- `WorksGateway`
- `InspectionsGateway`
- `PermitsGateway`
- `ComplaintsGateway`

Zet Vite-flags in `.env.local` om mock of API-mode te kiezen:

```bash
VITE_USE_MOCK_WORKS=false
VITE_USE_MOCK_GIPOD=false
VITE_USE_MOCK_ASIGN=false
VITE_USE_MOCK_KLM=false
```

Bij `true` gebruikt de app mock gateways. Bij `false` gebruikt de app de API-gateway implementatie.

## Navigatie (modulair)

- `Dashboard` (live): operationeel overzicht + snelle acties
- `Dispatch` (live): toewijzingen, kaart en action cards per toezichter
- `Vaststelling` (live): terreinregistratie per toezichter
- `Dossiers` (live): filterbare dossierlijst
- `Tijdlijn` (live): planning over de tijd met vergund/einde datums, visuele balken
- `Oplevering` (roadmap): wekelijkse opvolging na einde werf
- `Rapporten` (roadmap): output voor beleid en operationeel team
- `Data & Sync` (live): dataflow/synchronisatie
- `Handleiding` (live): quick guide, Q&A en demo scripts
- `Instellingen` (live): configuratiebeheer (inspecteurs, overrides, afwezigheden, dispatchcapaciteit)
- `Governance` (live): programmaplanning, poorten, budgetopvolging, OSLO homologatie

Roadmap detail iteratie 1:

- `ROADMAP_ITERATIE1_PLANNING.md`

## Versiebeheer (Git)

Repository: `https://github.com/MIKESPIKE123/Digitale-Nuts-Dispatch.git`

| Branch | Doel |
|---|---|
| `main` | Stabiele productie-baseline |

Vorige lokatie (gearchiveerd): `https://github.com/MIKESPIKE123/Apps.git` branch `feature/DIGITALE_NUTS`

## Volgende uitbreidingen

- Koppeling A-SIGN, GIPOD, Antwerpen Open Data — gateway architectuur klaar, mocks functioneel; echte API stubs behalve `ApiNotificationsGateway` en `ApiInspectionsGateway` die al live werken
- Standalone iPad/Android app via Capacitor (zie `docs/IPAD_APP_EVALUATIE.md` en `docs/ANDROID_APP_EVALUATIE.md`)
- DN Rapporten (dag/week/export)
- DN Oplevering (wekelijkse opvolging na einde werf)
