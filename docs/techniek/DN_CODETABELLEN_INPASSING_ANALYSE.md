# DN Codetabellen - Inpassingsanalyse

Datum: 2026-02-21  
Status: Analyse v1  
Doel: nagaan hoe de voorgestelde codetabellen bijdragen aan de huidige DN Dispatch codebasis en welke stappen nodig zijn voor gecontroleerde invoering.

## 1. Bronnen die zijn nagekeken

1. `src/types.ts`
2. `scripts/import-nuts-data.mjs`
3. `src/App.tsx`
4. `src/lib/dispatch.ts`
5. `src/modules/vaststelling/contracts.ts`
6. `src/modules/vaststelling/VaststellingView.tsx`
7. `src/modules/vaststelling/schema.ts`
8. `src/modules/reports/inspectionExport.ts`
9. `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md`
10. `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md`
11. `docs/uitvoering/DN_GIPOD_EXPORT_VISUALISATIE_ACTIEPLAN.md`

## 2. Korte conclusie

1. De oefening is zeer bruikbaar: ze maakt impliciete keuzes expliciet en versieerbaar.
2. Vandaag bestaan meerdere codelijsten al, maar verspreid en zonder centraal register (`id`, `code`, `active`, `deprecated`).
3. Grootste directe winst zit in standaardisatie van `WorkCategory`, `Material(Type)`, `ReferenceType`, `AttachmentType`, `ActionType`.
4. Grootste gaten zitten in `TicketType`, `PartnerType/Role`, `DestineeType`.
5. Voor OSLO-readiness is een centrale codetabellaag nodig vooraleer veldnamen definitief gestandaardiseerd worden.

## 3. Mapping voorgestelde codetabellen -> huidige app

| Voorgestelde codetabel | Huidige dekking in DN Dispatch | Bijdrage voor de app | Gap vandaag | Advies stap |
|---|---|---|---|---|
| `WorkCategory` | Reeds aanwezig als `gipodCategorie` in import, type en filters (`Categorie 1/2/3/Dringend`) | Uniforme categoriecode over dispatch, rapportering en API | Geen canonieke code (`CAT_1` etc.) en geen actief/inactief-beheer | `NU`: centrale codetabel invoeren en mapping `gipodCategorie -> code` vastleggen |
| `TicketType` | Indirect: `bonuNummer`, `referentieId`, `gipodId`, kandidaatvelden `repairTicketId/restoreTicketId` | Helder onderscheid tussen burgermelding, nutswerk, vaststelling, herbestratingsbon | Geen expliciet `ticketType`-veld | `VOLGENDE ITERATIE`: `ticketTypeCode` toevoegen op dossier/vaststelling |
| `LocationType` | Locatie bestaat als adres + coordinaat + `locationSource`; geen canonieke locatietype-keuze | Betere analyse op hinderlocatie en checklistkoppeling | Geen vaste lijst (voetpad, rijstrook, fietspad, ...) | `VOLGENDE ITERATIE`: dropdown + codetabel in Vaststelling |
| `MaterialType` | Deels via `verhardingType`-opties in Vaststelling v2 | Koppelt herstelkwaliteit aan type ondergrond | Geen formele types met code (`KWS`, `CBO`, ...) | `NU`: codetabel maken en `verhardingType` eraan koppelen |
| `Material` | Onrechtstreeks aanwezig in checklistbron (`archisnapper.csv`) | Fijnmazige kwaliteitsrapporten per materiaal | Nog geen gestructureerd veld/model | `VOLGENDE ITERATIE`: `materialCode` + `materialTypeCode` in checklistflow |
| `PartnerType` | Enkel vrije tekst zoals `nutsBedrijf`/`aannemer` | Voorbereiding op partnerportaal en correcte identificatie | Geen typed partner-entiteit | `API-FASE`: partnerregister met typecode |
| `PartnerRole` | Rolbegrippen bestaan functioneel, maar niet in data | Eenduidige roltoekenning (piloot, deelnemer, aannemer, ...) | Geen rolmodel in records/events | `API-FASE`: rolmodel op partnerkoppelingen |
| `ReferenceType` | Meerdere referenties bestaan (`gipodId`, `referentieId`, `bonuNummer`, `permitReferenceId`) | Minder ambiguiteit in rapporten en syncpayloads | Geen generiek referentiemodel met typecode | `NU`: referentie-wrapper toevoegen (`type`, `value`) in exportcontract v2 |
| `AttachmentType` | Sterke basis: foto-evidence en foto-velden (`fotoVoor`, `fotoDetail`, `fotoNa`) | Uniforme behandeling van foto, werfverslag, opleverbon | Enkel foto is impliciet ondersteund | `NU`: `attachmentTypeCode` expliciet maken (`FOTO`) |
| `ActionType` | Basis bestaat via sync-eventtypes (`inspection_saved`, `handover_decision`, `field_photos_added`) | Audittrail en rapportering op acties | Geen centraal actiecodelijstcontract | `NU`: mappingtabel actiecode + eventtype |
| `ActorType` | Actorinfo aanwezig (`inspectorSession`, `actorId`, `actorName`) | Betere governance en latere RBAC-koppeling | Geen actor-type in payload | `VOLGENDE ITERATIE`: `actorTypeCode` toevoegen |
| `DestineeType` | Nog niet aanwezig | Noodzakelijk voor communicatie en escalatieflows | Geen bestemmelingmodel | `API-FASE`: invoeren samen met communicatie/exportmodule |

## 4. Wat al sterk herbruikbaar is

1. GIPOD-import en filters leveren al een werkende basis voor `WorkCategory`.
2. Vaststelling heeft al option-sets die kunnen migreren naar centrale codetabellen.
3. Sync/events + photo evidence geven al goede ankers voor `ActionType` en `AttachmentType`.
4. Referenties bestaan al in meerdere vormen en kunnen relatief snel genormaliseerd worden.

## 5. Voorstel minimale invoerstrategie (laag risico)

### Stap 1 - Centrale codetabel-laag (zonder UI-breuk)

1. Voeg 1 centraal register toe in code (bijv. `src/config/codeTables.ts`).
2. Beheer per item: `id`, `code`, `description`, `active`, optioneel `source`, `version`.
3. Start met tabellen die al data hebben: `WorkCategory`, `MaterialType`, `ReferenceType`, `AttachmentType`, `ActionType`.

### Stap 2 - Koppelen aan bestaande velden

1. `gipodCategorie` mappen op `WorkCategory.code`.
2. `verhardingType` mappen op `MaterialType.code`.
3. `inspectionExport` uitbreiden met typed referentie/actie/bijlagecodes.

### Stap 3 - Nieuwe typed velden

1. `ticketTypeCode`, `locationTypeCode`, `actorTypeCode` toevoegen waar nu vrije tekst gebruikt wordt.
2. Backward compatibility behouden met bestaande stringvelden tijdens overgang.

### Stap 4 - OSLO standaardisatie

1. Per codetabel koppelen aan OSLO-concepten/URI's.
2. Pas daarna veldnamen definitief hernoemen in API-contracten.

## 6. Wat dit direct oplevert

1. Minder semantische ruis in rapporten en exports.
2. Snellere API-migratie (export -> echte koppeling) met minder mappingwerk.
3. Betere testbaarheid: contracttests kunnen op codes valideren in plaats van vrije tekst.
4. Veiliger evolutiepad naar partner- en AI-functionaliteit zonder datamodelbreuk.

## 7. Open beslissingen

1. Welke codeformaatregel houden we aan (bijv. `CAT_1`, `NUT_P`, `DEST_ACT`)?
2. Mag een item op `active=false` nog in historiek voorkomen (meestal: ja)?
3. Willen we meertalige labels nu al opnemen of pas bij API-laag?
4. Welke tabellen zijn "hard required" voor rapportering v1.1?

## 8. Uitvoeringslog stap 1 (voltooid)

Datum uitvoering: 2026-02-21

1. Centrale codetabellaag toegevoegd: `src/config/codeTables.ts`.
2. Eerste 5 tabellen geïmplementeerd: `WorkCategory`, `MaterialType`, `ReferenceType`, `AttachmentType`, `ActionType`.
3. Basis helperfuncties toegevoegd: lijst met actieve/inactieve entries, opzoeken op code, robuuste mapping voor work category labels/codes.
4. Testdekking toegevoegd in `src/config/codeTables.test.ts`.
5. Geen UI-routes gewijzigd; dit is bewust een niet-brekende funderingsstap.
