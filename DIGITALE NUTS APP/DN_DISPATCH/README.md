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

App URL: `http://localhost:3012`

Of gebruik het opstartbestand:

- `OPEN DN DISPATCH - LAATSTE VERSIE.cmd`

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

Repository: `https://github.com/MIKESPIKE123/Apps.git`

| Tag | Beschrijving |
|---|---|
| `v1.4` | Isolatie digitale-nuts-app en opschoning repo root |
| `v1.5-pre-css` | Backup vóór GRB/Luchtfoto/GIPOD CSS wijzigingen (2026-02-21) |

| Branch | Doel |
|---|---|
| `main` | Stabiele productie-baseline |
| `feature/objectbeheer-v2-2` | Hoofdontwikkelbranch |
| `feature/gipod-css-grb-kaart` | GRB kaartlagen + GIPOD CSS (geïsoleerd) |

Terugkeren naar veilig punt: `git checkout v1.5-pre-css`

## Volgende uitbreidingen

- routeringsvoorstel per toezichter
- koppeling A-SIGN, GIPOD, Antwerpen Open Data
- uitwisseling met vaststellingsapp via gedeelde dossier-ID
- GRB-basiskaart en Luchtfoto Vlaanderen als kaartlagen (branch `feature/gipod-css-grb-kaart`)
- GIPOD/Webuniversum CSS-stijl (branch `feature/gipod-css-grb-kaart`)
- Standalone iPad/Android app via Capacitor (zie `docs/IPAD_APP_EVALUATIE.md` en `docs/ANDROID_APP_EVALUATIE.md`)
