# DN Vaststelling - Veldenset v2 (MD vervangt Excel)

Datum: 2026-02-18  
Status: Draft voor development verwerking  
Bronbestand dat vervangen wordt: `Veldenset_OSLO_Checklists_v1.xlsx`

## 1. Scope en methodiek
Deze nota vervangt de Excel als werkdocument voor:
1. velddefinitie van `DN Vaststelling`
2. activatie-analyse tegen huidige appcode
3. OSLO-mapping
4. validatiepoortjes
5. checklist-koppeling

Analysebasis:
1. Excel-sheets: `Veldenset_v1_0`, `Dropdowns`, `OSLO_mapping_v0_9`, `Checklist_Sleuf`, `Validatiepoortjes`
2. Huidige implementatie in:
   - `src/modules/vaststelling/contracts.ts`
   - `src/modules/vaststelling/mappers.ts`
   - `src/modules/vaststelling/validation.ts`
   - `src/modules/vaststelling/VaststellingView.tsx`
   - `src/types.ts`

Legenda activatiestatus:
1. `ACTIEF`: al functioneel aanwezig in huidige app
2. `ACTIVEER_SNEL`: technisch klaar met beperkte uitbreiding (geen externe API nodig)
3. `MANUEEL_NU`: kan nu als manueel veld worden gebruikt, maar nog zonder autofill/regels
4. `API_OF_NIEUWE_DATA`: vereist externe API of nieuwe databron

## 2. Genormaliseerde veldenset v2 (volledig)

| Key | UI label | Type | Verplicht | Huidige dekking | Opslag in DN | Activatiestatus | Actie voor ontwikkeling |
|---|---|---|---|---|---|---|---|
| `recordId` | Record-ID | auto | ja | `DNVaststellingRecord.id` bestaat | root record | `ACTIEF` | Geen; gebruiken als primaire sleutel in export |
| `gipodId` | GIPOD-ID | tekst | ja | context aanwezig + prefill logica | `immutableContext.gipodId` (+ formData prefill) | `ACTIEF` | Regex validatie toevoegen in validatiepoort |
| `nutsbeheerder` | Nutsbeheerder | keuze | ja | aanwezig als `nutsBedrijf` + prefill op label "nutsbedrijf" | `immutableContext.nutsBedrijf` / `formData` | `ACTIEF` | Canonieke key alias voorzien (`nutsbeheerder` -> `nutsBedrijf`) |
| `district` | District | keuze | ja | aanwezig in context, nog niet expliciet als vast formulier-key | `immutableContext.district` | `ACTIVEER_SNEL` | Prefillrule toevoegen op label `district` |
| `adres` | Adres | tekst | ja | aanwezig via `metaLocation` + straat/huisnr/postcode/district context | `mutablePayload.metaLocation` + context | `ACTIEF` | 1 canonieke formatter afdwingen voor export |
| `geo.lat` | GPS-lat | decimaal | ja | aanwezig als `immutableContext.latitude` | `immutableContext.latitude` | `ACTIEF` | Rangecheck toevoegen (-90..90) |
| `geo.lon` | GPS-lon | decimaal | ja | aanwezig als `immutableContext.longitude` | `immutableContext.longitude` | `ACTIEF` | Rangecheck toevoegen (-180..180) |
| `locPrecisionM` | Locatie-precisie (m) | getal | nee | nog niet aanwezig | nieuw veld (formData of computed) | `ACTIVEER_SNEL` | Afgeleide waarde toevoegen (bv. `exact` vs `postcode`) + override manueel |
| `ingreepType` | Type ingreep | keuze | ja | `work.werftype` beschikbaar | `formData` (nieuw canoniek key) | `ACTIVEER_SNEL` | Prefill vanuit `work.werftype` + dropdown normalisatie |
| `fase` | Fase | keuze | ja | deels via processtatus, niet als canoniek veld | `formData` | `ACTIVEER_SNEL` | Faseveld verplicht maken + default op basis van visit/context |
| `verhardingType` | Verharding | keuze | ja | niet in huidige `WorkRecord` | `formData` | `MANUEEL_NU` | Veld toevoegen met dropdown; later API/data-prefill |
| `kritiekeZone` | Kritieke zone | boolean | nee | niet aanwezig | `formData` | `MANUEEL_NU` | Toggle toevoegen + regel koppelen aan checklist |
| `signVergNr` | Signalisatievergunning nr | tekst | nee | deels afleidbaar uit referentie/GW in context | `formData` of alias naar `referentieId` | `ACTIVEER_SNEL` | Mappingregel definiëren (`signVergNr` default = `referentieId`) |
| `herstelbonNr` | Herstelbon nr | tekst | nee | niet aanwezig | `formData` | `API_OF_NIEUWE_DATA` | Integratie met aannemer/nuts backoffice nodig |
| `termijnHerstel` | Uiterste hersteldatum | datum | ja | nog niet canoniek, `endDate` bestaat | `formData` | `ACTIVEER_SNEL` | Default = `work.endDate`, verplicht bij tijdelijk herstel |
| `status` | Status | keuze | ja | status bestaat op work + sync/handover statussen | `formData` + afgeleide statusmodel | `ACTIVEER_SNEL` | Eenduidige statemapping definiëren (work/status vs vaststelling/status) |
| `prioriteit` | Prioriteit | keuze | nee | dispatchpriority bestaat numeriek | `formData` | `ACTIVEER_SNEL` | Mapping toevoegen (bv. 120/116=hoog, 80=normaal, uitzonderingen=rood_vlag) |
| `vaststDatumTijd` | Vaststellingsdatum/tijd | datum-tijd | ja | aanwezig als `createdAt`/`updatedAt` | root record timestamp | `ACTIEF` | ISO 8601 formatter vastleggen in export |
| `toezichterId` | Toezichter | keuze | ja | actief via sessie | `inspectorSession.inspectorId` | `ACTIEF` | Geen; enkel alias naar canonieke key |
| `aannemer` | Aannemer/ploeg | tekst | nee | niet structureel beschikbaar | `formData` | `MANUEEL_NU` | Manueel veld nu activeren; later auto via GIPOD/aannemerdata |
| `fotoVoor_url` | Foto VOOR | media | ja | nog niet geïmplementeerd | nieuwe media-entity + referentie in payload | `API_OF_NIEUWE_DATA` | Foto-uploadflow + metadata contract (tijd, gps, actor) |
| `fotoDetail_url` | Foto DETAIL | media | ja | nog niet geïmplementeerd | nieuwe media-entity + referentie in payload | `API_OF_NIEUWE_DATA` | Idem; validatie "min. 1" toevoegen |
| `fotoNa_url` | Foto NA | media | ja* | nog niet geïmplementeerd | nieuwe media-entity + referentie in payload | `API_OF_NIEUWE_DATA` | Voorwaardelijke verplichting bij afsluiten/definitief herstel |
| `maatregel` | Gevraagde maatregel | tekst | nee | deels via handover note/notes | `mutablePayload.handoverDecisionNote` of `formData` | `ACTIVEER_SNEL` | Apart veld toevoegen voor duidelijke maatregeltekst |
| `opmerking` | Opmerking | tekst | nee | aanwezig als `notes` | `mutablePayload.notes` | `ACTIEF` | Lengteregel (max 500) toevoegen |
| `heropenReden` | Heropeningsreden | tekst | nee | nog niet als expliciet workflowveld | `formData` of `mutablePayload` | `ACTIVEER_SNEL` | Verplicht maken bij heropen-actie |
| `tags` | Tags | multi-keuze | nee | nog niet canoniek | `formData` | `ACTIVEER_SNEL` | Multi-select toevoegen met waarden uit dropdownlijst |

## 3. Wat kan nu direct geactiveerd worden (zonder externe API)

### 3.1 Direct production-ready met beperkte code-uitbreiding
1. `district`
2. `locPrecisionM`
3. `ingreepType`
4. `fase`
5. `signVergNr` (met `referentieId` default)
6. `termijnHerstel`
7. `status`
8. `prioriteit`
9. `maatregel`
10. `heropenReden`
11. `tags`

### 3.2 Manueel activeerbaar nu (waardevol voor terrein)
1. `verhardingType`
2. `kritiekeZone`
3. `aannemer`

### 3.3 Externe afhankelijkheden (niet blokkeren voor fase 1)
1. `herstelbonNr`
2. `fotoVoor_url`
3. `fotoDetail_url`
4. `fotoNa_url`

## 4. Dropdownset v2 (uit Excel overgenomen)

### 4.1 Nutsbeheerder
`WYRE`, `Fluvius`, `Proximus`, `Telenet`, `Orange`, `De Watergroep`, `Water-Link`, `Farys`, `Pidpa`

### 4.2 District
`Antwerpen`, `Berchem`, `Berendrecht-Zandvliet-Lillo`, `Borgerhout`, `Deurne`, `Ekeren`, `Hoboken`, `Merksem`, `Wilrijk`, `Borsbeek`

### 4.3 IngreepType
`sleuf`, `aansluiting`, `herstelling`, `cabine`, `inspectie`, `signalisatie`

### 4.4 Fase
`uitvoering`, `tijdelijk_herstel`, `definitief_herstel`

### 4.5 VerhardingType
`kassei`, `beton`, `asfalt`, `klinker`, `natuursteen`, `grasdals`, `grind`

### 4.6 Status
`open`, `in_behandeling`, `geparkeerd`, `afgesloten`

### 4.7 Prioriteit
`normaal`, `hoog`, `rood_vlag`

### 4.8 Tags
`GEPLAND`, `VRIJ`, `NS-kern`

## 5. Validatiepoortjes v2 (Excel + DN aanvulling)

## 5.1 Publiceren blokkeren als ontbrekend
1. `gipodId`
2. `nutsbeheerder`
3. `district`
4. `ingreepType`
5. `fase`
6. `verhardingType`
7. `vaststDatumTijd`

## 5.2 Foto-evidence regels
1. `fotoVoor_url` verplicht
2. `fotoDetail_url` verplicht
3. `fotoNa_url` verplicht bij:
   - `status=afgesloten` of
   - `fase=definitief_herstel`

## 5.3 Fase-afhankelijke regels
1. `termijnHerstel` verplicht indien `fase=tijdelijk_herstel`
2. `heropenReden` verplicht bij heropenen

## 5.4 Bestaande DN-validatie die behouden blijft
1. verplichte schema-velden
2. locatie (`metaLocation`) verplicht
3. verantwoordelijke verplicht bij elke `NOK`

## 6. Checklist Sleuf -> veldkoppeling v2

| Checklist item | Nodige velden | Status |
|---|---|---|
| GIPOD-ID aanwezig | `gipodId` | `ACTIEF` |
| Signalisatievergunning on site | `signVergNr` | `ACTIVEER_SNEL` |
| Fundering conform bestek | `verhardingType` + extra checklistdetail | `MANUEEL_NU` |
| Compactie | checklistdetail in formData | `MANUEEL_NU` |
| Vlakheid/veiligheid tijdelijk herstel | `fase` + checklistdetail | `ACTIVEER_SNEL` |
| Termijn ingesteld | `termijnHerstel` | `ACTIVEER_SNEL` |
| Materiaaltype correct | `verhardingType` | `MANUEEL_NU` |
| Voegwerk natuursteen | `kritiekeZone` + detailveld | `MANUEEL_NU` |
| Kritieke zone gecheckt | `kritiekeZone` | `MANUEEL_NU` |
| Einde werken verwijderd | `status=afgesloten` + foto NA | `API_OF_NIEUWE_DATA` (fotoflow) |

## 7. OSLO mapping v2 (bevestigd)
De mapping uit Excel blijft bruikbaar. Aanvullend advies:
1. Houd `recordId` als stabiele `dct:identifier`
2. Houd `vaststDatumTijd` als `sosa:resultTime`
3. Behandel `gipodId` als cross-reference naar Work-context
4. Modelleer foto-items als aparte evidence objecten met link naar observatie

## 8. Implementatievoorstel in 3 stappen

### Stap A (direct, geen externe API)
1. Activeer 11 velden uit `ACTIVEER_SNEL`
2. Voeg dropdowns toe voor `ingreepType`, `fase`, `status`, `prioriteit`, `tags`
3. Voeg validatiepoortjes toe uit hoofdstuk 5

### Stap B (manuele verrijking)
1. Activeer `verhardingType`, `kritiekeZone`, `aannemer`
2. Koppel checklist items aan deze velden

### Stap C (integratie-afhankelijk)
1. Foto-evidenceflow implementeren
2. `herstelbonNr` koppelen met externe bron

## 9. Beslissing voor development
Deze MD is het nieuwe werkdocument voor veldensetbeheer.  
De Excel hoeft niet langer als bron gebruikt te worden voor verdere uitwerking.
