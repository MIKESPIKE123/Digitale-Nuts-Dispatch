# DN Toewijzing Toezichters - Richtlijnen

Datum: 2026-02-21  
Status: Actief (v1.2)  
Doel: heldere afspraken over inzet, reserveplanning en automatische dispatchregels.

## 1. Basisprincipes

1. Elke werf krijgt bij voorkeur de vaste toezichter met primaire postcode-dekking.
2. Bij afwezigheid (vakantie/ziekte) schakelt dispatch eerst over naar backup-postcodes.
3. Als backup-workload te hoog wordt, zet dispatch automatisch reserve-toezichters in.
4. Nabijheid blijft altijd meewegen: dichtstbijzijnde zones krijgen voorrang.

## 2. Toezichtertypes

1. `Standaardtoezichter`: structureel in team, met primaire en backup-postcodes.
2. `Reservetoezichter`: inzetbaar voor piek, afwezigheid of tijdelijke overname.
3. Reservetoezichters kunnen ook langdurig primaire postzones opnemen.

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

1. Primaire/backup-pool zonder overflow.
2. Reserve-pool zonder overflow (`isReserve = true`).
3. Primaire/backup-pool met overflow.
4. Reserve-pool met overflow (`isReserve = true`).
5. Noodpad enkel voor verplichte bezoeken:
   - enkel wanneer er **geen expliciete reserve** geconfigureerd is,
   - dan pas inzet van andere inspecteurs buiten primaire/backup-zone.

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
