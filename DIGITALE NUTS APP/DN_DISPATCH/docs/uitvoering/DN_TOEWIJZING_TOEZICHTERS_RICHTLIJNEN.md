# DN Toewijzing Toezichters - Richtlijnen

Datum: 2026-02-27  
Status: Actief (v1.6)  
Doel: heldere afspraken over inzet, reserveplanning en automatische dispatchregels.

## 1. Basisprincipes

1. Elke werf krijgt bij voorkeur de vaste toezichter met primaire postcode-dekking.
2. Bij afwezigheid (vakantie/ziekte) schakelt dispatch eerst over naar backup-postcodes.
3. Als backup-workload te hoog wordt, zet dispatch automatisch reserve-toezichters in.
4. Nabijheid blijft altijd meewegen: dichtstbijzijnde zones krijgen voorrang.

## 2. Toezichtertypes

1. `Standaardtoezichter`: structureel in team, met primaire en backup-postcodes.
2. `Reservetoezichter`: inzetbaar voor piek, afwezigheid of tijdelijke overname.
3. `Reserve` is een rol, geen afwezigheidsstatus: zonder afwezigheid of inzetvenster blijft een reserve technisch inzetbaar.
4. Reservetoezichters kunnen ook langdurig primaire postzones opnemen, maar worden pas aangesproken in de reservefase.

## 3. Inzettermijn per toezichter

Elke toezichter heeft een inzetvenster:

1. `Actief van` (optioneel)
2. `Actief tot` (optioneel)

Regels:

1. Leeg venster = altijd inzetbaar.
2. Buiten het venster wordt de toezichter niet ingepland.
3. Bij omgekeerde invoer (`van > tot`) wordt dit automatisch omgewisseld.

## 4. Volgorde van automatische toewijzing

Voor elke kandidaat-werf hanteert dispatch deze volgorde:

1. Manuele override (indien gekozen toezichter én inzetbaar).
2. Dedicated-pool zonder overflow.
3. Dedicated-pool met overflow.
4. Backup-pool zonder overflow.
5. Backup-pool met overflow.
6. Reserve-pool zonder overflow (`isReserve = true`).
7. Reserve-pool met overflow (`isReserve = true`).
8. Noodpad enkel voor verplichte bezoeken:
   - enkel wanneer er **geen expliciete reserve** geconfigureerd is,
   - dan pas inzet van andere inspecteurs buiten primaire/backup-zone.

Praktisch:

1. `isReserve = true` sluit de toezichter uit de dedicated/backup-pools.
2. Daardoor wordt een reservetoezichter pas "gelicht" nadat dedicated en backup uitgeput zijn.

Binnen elke pool bepaalt score:

1. Postcode-match (primair > backup > reserve/noodpad).
2. Continuiteit (sticky inspector bonus).
3. Nabijheid (afstand/route).
4. Huidige workload.

Belangrijk:

1. Continuiteit mag postcodebeleid niet meer doorbreken.
2. Een sticky toewijzing naar een niet-passende zone krijgt dus geen voorrang op primaire/backup.

## 5. Afwezigheidsplanning

Afwezigheid per toezichter wordt in `DN Instellingen` beheerd:

1. Enkele datum: `YYYY-MM-DD`
2. Periode: `YYYY-MM-DD..YYYY-MM-DD`

Regels:

1. Afwezige toezichters krijgen geen dispatch-toewijzing op die dag.
2. De UI toont expliciet `afwezig` op filterchips en in action cards.
3. Afwezigheidsregels gelden boven continuiteit.
4. Ook `niet inzetbaar` (buiten `Actief van/tot`) is een harde blokkering.

## 6. UI-conventies (helderheid)

1. Filterchips tonen status:
   ` [R]` = reserve, `(afw)` = afwezig, `(niet actief)` = buiten inzettermijn.
2. Instellingen tonen:
   `Toezichters`, `Reservetoezichters`, `Extra toegevoegd`, `Afwezig`, `Niet inzetbaar`.
3. Action cards tonen bij status:
   `Afwezig ... backup/reserve ingezet` of  
   `Niet inzetbaar ... buiten actieve termijn`.
4. In kaart-popup toont `Toezichter` nu expliciet rol tussen haakjes:
   `dedicated`, `backup` of `reserve`.

## 7. Operationele afspraken

1. Nieuwe reserve-toezichters krijgen altijd:
   - unieke ID (`I8`, `I9`, ...),
   - minstens 1 primaire postcode,
   - duidelijke inzettermijn indien tijdelijk.
2. Bij langdurige inzet:
   - reserve kan primaire postzones overnemen,
   - status `reserve` blijft behouden voor capaciteitstransparantie.
3. Wekelijks reviewmoment:
   - controleer actieve vensters,
   - controleer afwezigheidsplanning,
   - bevestig eventuele tijdelijke overnames.

## 8. DoD voor wijzigingen aan toewijzing

1. Configuratie is opgeslagen in `DN Instellingen`.
2. Dispatch toont correcte labels en vermijdt niet-inzetbare toezichters.
3. Contract-/logicatests slagen (`dispatch`, `appSettings`, `E2E smoke`).
4. Wijziging is gedocumenteerd in dit richtlijnenbestand.

## 9. Update 2026-02-21 (afgerond)

1. Fix toegepast op dispatchlogica: continuity/sticky kan niet langer buiten postcodebeleid forceren.
2. Reserve-inzet gebruikt nu expliciet `isReserve = true` als aparte pool.
3. Nieuwe regressietest toegevoegd: sticky naar andere zone mag niet winnen van primaire postcode.

## 10. Variabele 5/6-regel (nieuw in v1.2)

De klassieke `5/6` limiet is nu configureerbaar in `DN Instellingen`.

### 10.1 Globale parameters

1. `Global soft limiet` (default 5)
2. `Global hard limiet` (default 6)
3. `Weight standaard bezoek` (default 1.0)
4. `Weight complex bezoek` (default 1.5)

### 10.2 Per-toezichter overrides

Per toezichter kunnen optioneel ingesteld worden:

1. `Soft ov.` (eigen soft limiet)
2. `Hard ov.` (eigen hard limiet)
3. `Vaste load` (dagbelasting door andere taken, bv. overleg/administratie)
4. `Ervaringsfactor` (0.5-1.5; hoger = efficiënter, lagere effectieve load per bezoek)

### 10.3 Huidige loadlogica

1. Complexe load wordt toegepast op `Categorie 1`, `Categorie 2` en `Dringend`.
2. Startload per toezichter = `vaste load`.
3. Bezoekload wordt gewogen met standaard/complex weight en ervaringsfactor.
4. Dispatch gebruikt soft/hard limiet op deze gewogen dagload i.p.v. enkel tellen van aantal bezoeken.

## 11. Back-up en herstel van toezichters (nieuw in v1.3)

Doel: geen verlies van toezichterconfiguratie tussen verschillende localhost-instanties of toestellen.

### 11.1 Beschikbare workflow in de app

1. Open `Instellingen`.
2. Gebruik `Exporteer toezichters (.json)`.
3. Bewaar bestand extern (OneDrive/Git/teamshare).
4. Gebruik in andere instantie `Importeer toezichters (.json)`.

### 11.2 Wat wordt geëxporteerd

1. `customInspectors` (I8, I9, ...).
2. `inspectorOverrides` (naam, initialen, primaire/backup-wijken, reservevlag, inzettermijn).
3. `inspectorAbsences` (afwezigheidsranges).
4. `dispatchCapacity` (globale + per-toezichter capaciteitsoverrides).

### 11.3 Wat niet wordt overschreven door import

1. Vakantiekalender (`holidays`).
2. Auto-sync vlag en interval.

### 11.4 Uitgevoerde taken op 2026-02-22

1. Centrale import/exportfuncties toegevoegd in `src/lib/appSettings.ts`.
2. UI-acties toegevoegd in `Instellingen` voor JSON export/import.
3. Contracttests toegevoegd voor exportformaat, importmerge en foutafhandeling.

### 11.5 Verduidelijking importbestand en mergegedrag (v1.6)

1. Exportbestand bevat metadata:
   - `format = dn_dispatch_inspectors`
   - `version = 1`
   - `exportedAt` (ISO timestamp)
2. De import accepteert zowel:
   - dit expliciete exportformaat (`format/version/settings`), als
   - een rechtstreeks JSON-object met dezelfde settingsvelden.
3. Import werkt als merge op huidige instellingen:
   - inspecteurconfiguratie en capaciteitsblokken worden vervangen door importinhoud,
   - niet meegegeven velden blijven op huidige waarden staan.
4. Aanbevolen workflow:
   - eerst exporteren als back-up,
   - dan importeren,
   - daarna direct een dispatchdatum openen en labels `[R]`, `(afw)` en `(niet actief)` controleren.

## 12. Manuele dispatcher override per dossier (beschikbaar sinds v1.4, actief in v1.5)

Doel: dispatcher kan operationeel bijsturen zonder de globale instellingen te wijzigen.

### 12.1 Gedrag in de UI

1. In `Action cards per toezichter` staat per kaart een veld `Manuele toewijzing`.
2. Keuze `Automatisch` = terug naar standaard dispatchlogica.
3. Keuze van een toezichter forceert voorkeursinzet voor dat dossier.
4. `Reset` verwijdert de manuele override onmiddellijk.

### 12.2 Regels in dispatch

1. Manuele override heeft voorrang op sticky continuity.
2. Afwezigheid en niet-inzetbaar (buiten actieve termijn) blijven harde blokkeringen.
3. Als gekozen toezichter niet inzetbaar is, valt dispatch terug op backup/reserve-pool.

### 12.3 Persistente opslag

1. Overrides worden lokaal bewaard onder `dn_dispatch_manual_inspector_override_v1`.
2. Bij herladen van de app blijven overrides actief zolang de lokale storage behouden blijft.
3. Validatie op inspector-ID gebeurt bij laden/saven zodat foutieve IDs automatisch wegvallen.

### 12.4 Uitgevoerde taken op 2026-02-22

1. Nieuwe manuele override state + storage toegevoegd in `src/App.tsx`.
2. Action card UI uitgebreid in `src/components/InspectorBoard.tsx`.
3. Styling en responsive gedrag toegevoegd in `src/styles.css`.

## 13. Toewijzingsarchief en opvolging (nieuw in v1.5)

Doel: historiek tonen van wie welk project kreeg toegewezen en dit kunnen vergelijken met gemaakte vaststellingen.

### 13.1 Wat wordt bijgehouden

1. Snapshot per dispatchdatum met:
   - toegewezen bezoeken per toezichter,
   - unieke toegewezen werken,
   - aantal manuele overrides,
   - unassigned werken.
2. Snapshot wordt lokaal bewaard in `dn_dispatch_assignment_history_v1`.

### 13.2 Overzicht in de app

1. Scherm `DN Data & Sync` bevat nu:
   - tabel `Toewijzingsarchief` (toegewezen vs vaststellingen per toezichter),
   - tabel `Recente snapshots`.
2. De vergelijking gebruikt:
   - toewijzing op dispatchdatum,
   - vaststellingsrecords met dezelfde geplande bezoekdatum en workId.

### 13.3 Export en beheer

1. Knop `Exporteer archief (.json)` voor externe analyse.
2. Knop `Wis lokaal archief` voor reset van lokale historiek.

### 13.4 Uitgevoerde taken op 2026-02-22

1. Nieuwe historiekmodule toegevoegd in `src/lib/assignmentHistory.ts`.
2. Basis tests toegevoegd in `src/lib/assignmentHistory.test.ts`.
3. UI-overzichten toegevoegd in `src/App.tsx` (view `Data & Sync`).

### 13.5 Verduidelijking snapshots (v1.6)

1. Een snapshot wordt automatisch geactualiseerd bij:
   - wijziging van dispatchresultaat,
   - wijziging van manuele toewijzing,
   - wijziging van geselecteerde dispatchdatum.
2. Per dispatchdatum wordt 1 actuele snapshot bijgehouden (upsert).
3. Lokale historiek wordt begrensd op 180 snapshots (`MAX_ASSIGNMENT_HISTORY_ITEMS`).
4. Vergelijking met vaststellingen gebeurt op combinatie:
   - `workId`
   - geplande bezoekdatum (`dispatchDate`).
5. Gebruik `Exporteer archief (.json)` als periodieke back-up (week- of maandritme).

## 14. Vaststelling openen vanuit kaartpopup (nieuw in v1.6)

Doel: vanuit kaartcontext zonder extra klikpaden naar het juiste vaststellingsscherm gaan.

### 14.1 Beschikbare acties in popup

1. `Open bestaand verslag`:
   - opent het bestaande record van dat dossier (indien aanwezig),
   - knop is disabled zolang er nog geen bestaand verslag is.
2. `Nieuw verslag`:
   - start een nieuwe draft op basis van de geselecteerde dispatchvisit.

### 14.2 Gedrag en guardrails

1. De popupactie werkt alleen binnen de actieve dispatchcontext van de huidige toezichter.
2. Als er geen bestaande vaststelling is, toont de app een duidelijke melding.
3. De start van een nieuw verslag gebruikt contextprefill (o.a. BONU/GW/GIPOD/adres).

## 15. Extra toewijzingscontext en links in action cards (v1.6)

Doel: dispatcher sneller laten beslissen zonder extra schermwissels.

### 15.1 Nieuwe context in Inspector Board

1. Klikbare `ReferentieID` (A-SIGN) indien link beschikbaar.
2. Klikbare `GIPOD`-referentie indien link beschikbaar.
3. Extra metaregels op kaartniveau:
   - GIPOD bronstatus + categorie,
   - vergunningstatus,
   - toewijzingsrol (`Dedicated`, `Backup`, `Reserve`),
   - operationele timing (`Start voorzien` of `In uitvoering sinds`, plus `Loopt t.e.m.`).
4. Duidelijke toewijzingscontext:
   - `Voorkeurtoezichter`,
   - `Tijdelijke herverdeling`,
   - of expliciete `Manuele override`.

### 15.2 Operationele afspraak

1. Gebruik action card-context als eerste beslislaag.
2. Gebruik kaartpopup als tweede controlelaag voor dossier- en vaststellingsactie.
3. Houd manuele overrides beperkt tot echte afwijkingen; reset zodra normale verdeling terug mogelijk is.
