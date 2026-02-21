# DN GIPOD Export - Actieplan Visualisatie in DN Dispatch

Datum: 2026-02-21  
Status: Uitvoering v1 voltooid (iteratie 1)  
Doel: GIPOD-export structureel inlezen, koppelen aan bestaande appvelden en zichtbaar maken op kaart + vaststellingen.

## 0. Uitvoeringslog (afgerond op 2026-02-21)

### 0.1 Voltooide taken in code

1. `import-nuts-data.mjs` leest nu automatisch de nieuwste `Export_*.xlsx` uit `DATA`.
2. Fallback blijft bestaan naar `Weekrapport Nutswerken totaallijst.xlsx` als geen export aanwezig is.
3. GIPOD-exportmapping is geïmplementeerd:
- `Id -> gipodId`,
- `referentieId` wordt op `gipodId` gezet,
- adres uit `Beschrijving`,
- beheerder als `nutsBedrijf`,
- locatie uit `Locatie` (`POINT`) naar kaartcoördinaten.
4. Vergunningverrijking via weekrapport is geïmplementeerd op basis van `export.Id == weekrapport.Gipod ID`.
5. Nieuwe werkvelden in datamodel toegevoegd:
- `sourceStatus`, `gipodCategorie`, `gipodType`, `gipodSoort`,
- `vgwUitgestuurd`,
- `permitStatus`, `permitStatusSource`, `permitJoinConfidence`, ...
6. Dispatchfilters uitgebreid met:
- GIPOD fase,
- Categorie GW,
- Vergunningstatus.
7. UI in DN Dispatch uitgebreid:
- nieuwe filterchips in linker paneel,
- extra GIPOD/vergunningcontext in kaartpopup en action cards.
8. DN Dossiers-tabel uitgebreid met fase/categorie/vergunningkolommen.
9. DN Vaststelling uitgebreid met dropdown `Nuts-bedrijf (beheerder)` op basis van unieke nutsbedrijven uit dataset.
10. Validatie:
- `npm run import:data` geslaagd,
- `npm run typecheck` geslaagd,
- `npm run test -- --run` geslaagd.

### 0.2 Resultaat van huidige importrun

Bron: `export_20260221132439.xlsx`

1. Ingelezen rijen: `7012`.
2. Opgeleverde records in app-dataset: `4911`.
3. Exacte kaartlocaties: `4911`.
4. Top bronstatussen: `Uitgevoerd`, `Concreet gepland`, `Niet uitgevoerd`, `In uitvoering`.

### 0.3 Waar manuele dataverbetering nodig is

1. Niet alle exportrijen bevatten voldoende adresseerbare context voor opname (`7012` -> `4911`):
- ontbrekende of niet-bruikbare postcode/adresonderdelen moeten in bron verbeterd worden.
2. Beheerdernamen bevatten varianten (`Wyre`/`WYRE`, `Water-link`/`Water-Link`):
- aliaslijst in brondata of referentielijst is nodig voor stabiele standaardisatie.
3. Vergunningkoppeling blijft deels beperkt:
- slechts een deel van de GIPOD-IDs matcht met weekrapport (verwacht wegens scopeverschil Cat 1/2/3).
4. GIPOD status en vergunningstatus kunnen semantisch afwijken:
- dit vereist bronafstemming op “single source of truth” en expliciete prioriteitsregels.

### 0.4 Gewenste uitbreiding van de GIPOD-export

1. Voeg expliciete kolom toe met unieke vergunningreferentie (die ook in weekrapport/API voorkomt).
2. Voeg kolom `heeft hinder` en/of hinderklasse toe in dezelfde export.
3. Voeg district/administratieve zone als aparte kolom toe (nu indirect via parsing).
4. Voeg gestandaardiseerde beheerdercode (naast naam) toe voor robuuste mapping.
5. Voeg expliciete OSLO/URI-kolommen toe waar beschikbaar (entity-id’s in plaats van vrije tekst).

### 0.5 Gerichte manuele correctie (2026-02-21)

1. GIPOD `19223308` had een gekende mismatch tussen ficheverwachting en pinlocatie.
2. Correctie is tijdelijk afgevangen via import-override in `scripts/import-nuts-data.mjs`:
- adres gefixeerd op `FRANKRIJKLEI 21, 2000 Antwerpen`,
- pinlocatie handmatig op juiste punt gezet.
3. Linklogica in map-popup is ook gecorrigeerd:
- `ReferentieID` blijft informatief (geen foutieve A-SIGN link),
- A-SIGN link gebruikt nu weekrapport `Ref-key` (`permitRefKey`) als primaire sleutel i.p.v. GIPOD-nummer.
4. Deze override blijft expliciet gedocumenteerd tot brondata/API dit structureel oplost.

### 0.6 Structurele locatiecorrectie projectie (2026-02-21)

1. Root cause bevestigd: Lambert72 -> WGS84 omzetting gebruikte een foutieve centrale meridiaan.
2. Gevolg: punten stonden systematisch te ver westelijk (orde honderden meters, vaak ~800m).
3. Oplossing in `scripts/import-nuts-data.mjs`:
- centrale meridiaan gecorrigeerd naar EPSG:31370 waarde (`4.367486666666666°`),
- hoekberekening robuuster gemaakt met `atan2`.
4. Dataset opnieuw opgebouwd met `npm run import:data`.
5. Resultaat: locaties sluiten nu structureel beter aan op straatadres/GIPOD-context; dossier `19501294` is mee gecorrigeerd zonder manuele override.

### 0.7 Automatische locatie-QA check (2026-02-21)

1. Importscript voert nu een automatische QA-check uit op locatiekwaliteit:
- vergelijking tussen dataset-POINT en adres-geocode,
- verdachte afwijkingen boven drempel worden gelogd.
2. Rapportbestand: `DATA/dispatch_location_qa_report.json`.
3. Console-output bij import:
- aantal gecontroleerde dossiers,
- aantal verdachte dossiers,
- maximale afwijking in meter.
4. Standaardinstellingen:
- `maxChecks=25`,
- `thresholdMeters=250`.
5. Configureerbare omgevingsvariabelen:
- `DN_LOCATION_QA_ENABLED` (`0` om QA uit te zetten),
- `DN_LOCATION_QA_MAX_CHECKS`,
- `DN_LOCATION_QA_THRESHOLD_METERS`,
- `DN_LOCATION_QA_MAX_REPORT_ITEMS`.
6. QA hergebruikt bestaande geocode-cache; bij lege cache worden nieuwe geocodes opgehaald met throttling.

### 0.8 Adres-uitlijning + tijdelijke override op afwijkers (2026-02-21)

1. Nieuwe importstap `address alignment` toegevoegd:
- records met exacte POINT-locatie worden vergeleken met adres-geocode,
- bij afwijking boven drempel wordt pin op adres-geocode gezet.
2. Rapportbestand: `DATA/dispatch_location_alignment_report.json`.
3. Default parameters:
- `thresholdMeters=90`,
- `maxGeocodesPerRun=120` (om Nominatim-gebruik beheersbaar te houden).
4. Door budgetlimiet kunnen niet alle afwijkers in één run gecorrigeerd zijn; meerdere imports bouwen dit op via cache.
5. Voor direct gemelde cases tijdelijke override toegevoegd:
- `GIPOD 19586569` (`Frankrijklei 67`),
- `GIPOD 19296287` (`Kruikstraat 28`).

### 0.9 Kaartzoeker anomalie (lokaal vs extern) gefixt (2026-02-21)

1. Oorzaak: kaartzoeker nam bij lokale match onmiddellijk het dossierpunt en deed geen externe geocode-prioritering.
2. Effect: adreszoekopdracht kon op dezelfde (foute) werfpin uitkomen.
3. Oplossing in `src/components/MapPanel.tsx`:
- voor volledige adresqueries (huisnummer + postcode) krijgt externe geocode voorrang,
- lokale en externe resultaten worden samengevoegd,
- resultaatlijst toont nu bronlabel (`extern` of `lokaal`).

### 0.10 Vaste regressiecheck op bekende adressen (2026-02-21)

1. Script toegevoegd: `scripts/validate-known-addresses.mjs`.
2. Vaste inputlijst: `scripts/known-addresses-regressiecheck.json` (momenteel 15 adressen).
3. Uitvoer:
- JSON: `DATA/known_address_validation_report.json`,
- MD: `docs/uitvoering/DN_KNOWN_ADDRESS_REGRESSIECHECK.md`.
4. NPM-commando: `npm run qa:known-addresses`.

### 0.11 Popup vereenvoudiging + juiste vergunningslink (2026-02-21)

1. `Dossierdetails` in map-popup vereenvoudigd volgens operationele behoefte:
- `Adres`, `VGW uitgestuurd` en `ReferentieID` verwijderd uit dit blok,
- adres blijft enkel onder `Locatie & context`.
2. `Dossier GIPOD ID` is nu klikbaar met deeplink naar GIPOD (`/inname/{gipodId}`).
3. `Toezichter` toont nu rol tussen haakjes: `dedicated`, `backup` of `reserve`.
4. `Signalisatievergunning nr` linkt nu primair via weekrapport `Ref-key` naar A-SIGN:
- `https://parkeerverbod.antwerpen.be/admin/sgw/requests/{Ref-key}`.
5. Datamodel/import uitgebreid met `permitRefKey` zodat link niet meer foutief op basis van GIPOD-id of GW-nummer gelegd wordt.

## 1. Uitgangspunten die we vastleggen

1. Bronbestand komt uit `DN_DISPATCH/DATA` met patroon `Export_*.xlsx` (case-insensitive, dus `export_*.xlsx` telt ook).
2. We gebruiken altijd de meest recente exportversie in die map:
- eerst op datum in bestandsnaam (`Export_YYYYMMDD...`),
- fallback op `LastWriteTime`.
3. We blijven het weekrapport (`Weekrapport Nutswerken totaallijst.xlsx`) parallel gebruiken voor signalisatievergunning-context.
4. GIPOD blijft primaire bron voor werfstatus, maar vergunningstatus blijft leidend bij conflicterende statusinterpretatie.

## 2. Wat de nieuwste export nu bevat (feitelijke scan)

Bron: `DATA/export_20260221132439.xlsx` (sheet `resultaten`)

1. Rijen: `7012`.
2. Kolommen: `Id`, `Referentie`, `Beschrijving`, `Beheerder`, `Status`, `Start`, `Einde`, `Soort`, `Type`, `Categorie`, `Locatie`, `VGW uitgestuurd`.
3. Statusverdeling:
- `Uitgevoerd`: 3968
- `Concreet gepland`: 1769
- `Niet uitgevoerd`: 719
- `In uitvoering`: 556
4. Categorieverdeling:
- `Categorie 3`: 5834
- `Dringend`: 492
- `Categorie 1`: 369
- `Categorie 2`: 317
5. Locatieformaat: `POINT (x y)` in alle rijen (geen lege locatie).
6. Beheerder bevat bruikbare unieke lijst voor nutsbedrijven (o.a. Fluvius, Proximus, Water-link, Wyre, ...).

## 3. Veldmapping naar DN Dispatch (to-be)

| GIPOD exportkolom | Doelveld in app | Mappingsregel |
|---|---|---|
| `Id` | `gipodId` | Technische GIPOD-ID voor deeplink (`/inname/{id}`) en koppeling met weekrapport. |
| `Referentie` | `gipodReferentie` | Ruwe bronreferentie uit GIPOD-export; `referentieId` in app volgt GIPOD-id. |
| `Ref-key` (weekrapport) | `permitRefKey` | Technische sleutel voor correcte A-SIGN deeplink (`/requests/{ref-key}`). |
| `Beschrijving` | `straat` + `huisnr` + `postcode` (+ district-afleiding) | Parser op tekst zoals `2140 ANTWERPEN, Florastraat 93`; fallback op postcode-centroid bij parsefout. |
| `Beheerder` | `nutsBedrijf` | 1-op-1 overnemen, wel genormaliseerd voor casing/duplicaten. |
| `Status` | `sourceStatus` + afgeleide `status` | `sourceStatus` bewaart ruwe GIPOD-status; `status` blijft compatibel voor dispatch (`VERGUND`/`IN EFFECT`). |
| `Start` | `startDate` | Datum/tijd omzetten naar ISO-datum (tijd optioneel in extra veld). |
| `Einde` | `endDate` | Datum/tijd omzetten naar ISO-datum. |
| `Soort` | `gipodSoort` (nieuw) | Technisch contextveld voor rapportering/filtering. |
| `Type` | `gipodType` (nieuw) | Technisch contextveld voor rapportering/filtering. |
| `Categorie` | `gipodCategorie` (nieuw) | Waarden `Categorie 1/2/3/Dringend` voor mapfiltering. |
| `Locatie` | `location.lat/lng` + `locationSource` | `POINT (x y)` (Lambert72) converteren naar WGS84; `locationSource = exact`. |
| `VGW uitgestuurd` | `vgwUitgestuurd` (nieuw bool/enum) | Normalisatie `ja/nee/onbekend`. |

## 4. Vergunningslogica (GIPOD + weekrapport)

Doel: altijd tonen of signalisatievergunning `afgeleverd`, `in voorbereiding`, `niet vereist` of `onbekend` is.

### 4.1 Koppeling

1. Primair koppelen op `weekrapport.Gipod ID == export.Id`.
2. Secundaire fallback keys voorzien (voor latere anomalieën): `ReferentieID`, `Ref-key`.
3. Koppeling krijgt confidence-label (`high`/`medium`/`low`) voor diagnose.

### 4.2 Beslisregels voor vergunningstatus

1. Als weekrapportstatus op gekoppeld dossier `Vergund` of equivalent is: `AFGELEVERD`.
2. Als weekrapportstatus `Ingediend`/`In behandeling`/equivalent is: `IN_VOORBEREIDING`.
3. Als geen koppeling:
- `Categorie 1` of `Categorie 2`: `ONBEKEND_MAAR_VERWACHT`.
- `Categorie 3` zonder indicatie: `NIET_VEREIST_JAARVERGUNNING` (tenzij bijkomende hinder-signalen).
4. Bij conflict tussen GIPOD fase en vergunningstatus:
- vergunningstatus blijft leidend voor vergunningbadge,
- GIPOD status blijft zichtbaar als bronstatus (transparantie).

## 5. Visualisatie in app (kaart + filters + popup)

### 5.1 Filteruitbreiding in linker paneel (DN Dispatch)

1. Nieuwe groep `GIPOD fase`:
- `In uitvoering`
- `Concreet gepland`
- `Uitgevoerd`
- `Niet uitgevoerd`
2. Nieuwe groep `Categorie GW`:
- `Categorie 1`
- `Categorie 2`
- `Categorie 3`
- `Dringend`
3. Nieuwe groep `Vergunningstatus`:
- `Afgeleverd`
- `In voorbereiding`
- `Niet vereist`
- `Onbekend`
4. Toggle `Alleen in uitvoering` standaard `aan`.

### 5.2 Kaartweergave

1. Markerbadge blijft prioriteit/route tonen, maar krijgt extra visuele indicator:
- randkleur op basis van `gipodCategorie`,
- klein vergunning-icoon/statusdot.
2. Popup krijgt blok `GIPOD & Vergunning` met:
- GIPOD bronstatus,
- categorie,
- soort/type,
- vergunningstatus + confidence,
- `VGW uitgestuurd`.

### 5.3 Vaststellingen

1. `nutsBedrijf` uit context blijft prefill.
2. In formulier komt een dropdown met unieke `Beheerder/NUTS-bedrijf` waarden uit dataset.
3. Standaardselectie = `nutsBedrijf` van gekozen dossier.

## 6. Technische uitvoering (stappen)

### Stap A - Importlaag

1. `scripts/import-nuts-data.mjs` uitbreiden:
- bronselectie `latest Export_*.xlsx`,
- fallback naar weekrapport als export ontbreekt,
- mapping + normalisatie volgens sectie 3.
2. Parser toevoegen voor:
- `Beschrijving` -> adrescomponenten,
- `Locatie POINT(x y)` -> lat/lng.
3. Extra outputvelden opnemen in `works.generated.json`.

### Stap B - Datamodel

1. `src/types.ts` uitbreiden met nieuwe GIPOD/vergunningsvelden.
2. Backward compatibility bewaren zodat bestaande dispatchlogica blijft werken.

### Stap C - Verrijking met vergunningstatus

1. Weekrapport in importfase mee inlezen.
2. Join en beslisregels toepassen (sectie 4).
3. Vergunningstatus in werkrecord opslaan.

### Stap D - UI

1. Filterstate + filterchips uitbreiden in `src/App.tsx`.
2. Kaartpopup uitbreiden in `src/components/MapPanel.tsx`.
3. Eventueel action cards extra regel geven met vergunningstatus.

### Stap E - Vaststellingsdropdown

1. Unieke nutsbedrijflijst uit records opbouwen.
2. Dropdown toevoegen in `src/modules/vaststelling/VaststellingView.tsx`.

### Stap F - Tests

1. Unit tests op importmapping (status, categorie, vergunningstatus).
2. Contracttest op outputschema (nieuwe verplichte velden).
3. E2E-smoke: filter `In uitvoering` + vergunningbadge zichtbaar.

## 7. Acceptatiecriteria (Definition of Done)

1. Bij `npm run import:data` wordt automatisch de nieuwste `Export_*.xlsx` gebruikt.
2. Kaart toont effectief dossiers `In uitvoering` uit GIPOD export met extra filters.
3. Popup toont per dossier zowel GIPOD-status als vergunningstatus.
4. Vaststellingsmodule gebruikt unieke nutsbedrijflijst als dropdownbron.
5. `typecheck` en tests slagen.

## 8. Bekende risico's en mitigatie

1. `Beschrijving` kan onregelmatig zijn:
- mitigatie: parser met fallback + logging van onparseerbare adressen.
2. Koppeling export-weekrapport is niet 100%:
- mitigatie: confidence-label + expliciete `onbekend`-status in UI.
3. Dubbels in beheerdernamen (`Wyre` vs `WYRE`):
- mitigatie: canonicalisatie + aliasmapping.

## 9. Eerstvolgende concrete uitvoering

1. Importscript ombouwen naar `latest Export_*.xlsx` + mapping + locatieconversie.
2. Type-uitbreiding en schema-output hard zetten.
3. Daarna UI-filters en popup in dezelfde iteratie aansluiten.

## 10. Richting volgende rondes (API + OSLO)

1. Export-inleesflow is tijdelijk en wordt vervangen door een formele API-koppeling.
2. Nieuwe velden uit deze iteratie moeten vóór API-go-live formeel aan OSLO-concepten gekoppeld worden.
3. Referentiedocument voor die standaardisatie: `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md`.
