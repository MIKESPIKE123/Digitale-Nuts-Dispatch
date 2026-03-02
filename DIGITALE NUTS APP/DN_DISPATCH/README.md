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

- Een project krijgt een vaste voorkeurtoezichter op basis van postcode + nabijheid.
- Die voorkeurtoezichter blijft prioritair voor latere toewijzingen.
- Projectkaarten zijn klikbaar en tonen een marker met locatieteken op de kaart.
- In elk projectkaartje staat de einddatum (`Loopt t.e.m.`).

## Recente aanvullingen (v1.6 - 2026-02-27)

- Toewijzingsarchief met snapshots per dispatchdatum, export (`.json`) en lokale reset in `DN Data & Sync`.
- Import/export van inspecteurinstellingen in `Instellingen` (inspecteurs, overrides, afwezigheden, dispatchcapaciteit).
- Vaststelling rechtstreeks openen vanuit kaartpopup:
  - `Open bestaand verslag`
  - `Nieuw verslag`
- Extra dossiercontext in action cards:
  - klikbare ReferentieID/A-SIGN en GIPOD-links,
  - toewijzingsrol (`Dedicated/Backup/Reserve`),
  - duidelijke manuele override-context.

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
- `Kaart` (live): kaartfocus en lagen
- `Dispatch` (live): toewijzingen en action cards
- `Dossiers` (live): filterbare dossierlijst
- `Data & Sync` (live): dataflow/synchronisatie
- `Instellingen` (live): configuratiebeheer
- `Tijdlijn` (roadmap)
- `Oplevering` (roadmap)
- `Rapporten` (roadmap)

Roadmap detail iteratie 1:

- `ROADMAP_ITERATIE1_PLANNING.md`

## Versiebeheer (Git)

Repository: `https://github.com/MIKESPIKE123/Digitale-Nuts-Dispatch.git`

| Branch | Doel |
|---|---|
| `main` | Stabiele productie-baseline |

Vorige lokatie (gearchiveerd): `https://github.com/MIKESPIKE123/Apps.git` branch `feature/DIGITALE_NUTS`

## Volgende uitbreidingen

- routeringsvoorstel per toezichter
- koppeling A-SIGN, GIPOD, Antwerpen Open Data
- uitwisseling met vaststellingsapp via gedeelde dossier-ID
- GRB-basiskaart en Luchtfoto Vlaanderen als kaartlagen (branch `feature/gipod-css-grb-kaart`)
- GIPOD/Webuniversum CSS-stijl (branch `feature/gipod-css-grb-kaart`)
- Standalone iPad/Android app via Capacitor (zie `docs/IPAD_APP_EVALUATIE.md` en `docs/ANDROID_APP_EVALUATIE.md`)
