# Roadmap Iteratie 1 - Planning Suite

Doel: de roadmap-views `Tijdlijn`, `Afhankelijkheden` en `Capaciteit per week` concreet uitwerken als operationele module binnen de Digitale Nuts App.

## Scope Iteratie 1

1. Gantt planning met baseline vs actueel.
2. Afhankelijkheden met conflict-detectie.
3. Weekcapaciteit per toezichter met overload-signalen.

## Wireframe Voorstellen

### 1) Tijdlijn / Gantt View

```text
+----------------------------------------------------------------------------------+
| Filters: [Week/maand] [Status] [District] [Toezichter] [Risico >= X]           |
+----------------------+-----------------------------------------------------------+
| Dossierlijst         | Tijdlijn (horizontale as)                                |
|----------------------|-----------------------------------------------------------|
| BONU2026-001         | [baseline ========]                                       |
| 2000 Antwerpen       |     [actueel =====]     ! vertraging +3d                 |
| IN EFFECT            |  *start  *eind *oplevering                                |
|----------------------|-----------------------------------------------------------|
| GW2025-106803        | [baseline =====] [actueel ========]                       |
| 2018 Antwerpen       |                     ^ kritische einddatum                 |
+----------------------+-----------------------------------------------------------+
| Legende: baseline / actueel / milestones / critical path                         |
+----------------------------------------------------------------------------------+
```

### 2) Afhankelijkheden View

```text
+----------------------------------------------------------------------------------+
| Filter: [FS/SS/FF] [Status: OK/RISICO/GEBLOKKEERD] [District]                   |
+----------------------------------------------------------------------------------+
| Voorganger         | Type | Opvolger          | Lag | Status       | Actie       |
|--------------------|------|-------------------|-----|--------------|-------------|
| BONU2026-001       | FS   | BONU2026-045      | 2d  | GEBLOKKEERD  | Escaleer    |
| GW2025-106803      | SS   | BONU2026-020      | 0d  | RISICO       | Herplan     |
+----------------------------------------------------------------------------------+
| Grafiekpaneel: nodes + pijlen (kleur op status)                                  |
+----------------------------------------------------------------------------------+
```

### 3) Capaciteit per week

```text
+----------------------------------------------------------------------------------+
| Week: [2026-W08]  [Vorige] [Volgende]                                            |
+----------------------------------------------------------------------------------+
| Toezichter | Beschikbare dagen | Gepland | Follow-up | Max cap | Utilisatie |   |
|------------|--------------------|---------|-----------|---------|------------|---|
| AB         | 5                  | 23      | 2         | 25      | 92%        |OK |
| CD         | 4 (1 afwezig)      | 24      | 1         | 20      | 120%       |!! |
| EF         | 5                  | 18      | 3         | 25      | 72%        |OK |
+----------------------------------------------------------------------------------+
| Footer: totaal niet-toegewezen, totaal overflow, gemiddelde util                  |
+----------------------------------------------------------------------------------+
```

## Data Model Mapping (velden)

### Gantt planning - kernvelden

1. `workId`, `dossierId`, `phase`
2. `baselineStart`, `baselineEnd`
3. `planStart`, `planEnd`
4. `actualStart`, `actualEnd`
5. `expectedDurationDays`, `remainingDays`, `progressPct`
6. `criticalPath`, `slackDays`
7. `riskScore`, `complexityScore`
8. `lastVisitDate`, `nextVisitDueDate`

### Afhankelijkheden - kernvelden

1. `predecessorWorkId`
2. `successorWorkId`
3. `type` (`FS`, `SS`, `FF`, `SF`)
4. `lagDays`
5. `status` (`OK`, `RISICO`, `GEBLOKKEERD`)
6. `reason`
7. `lastEvaluatedAt`

### Capaciteit per week - kernvelden

1. `inspectorId`, `weekIso`
2. `availableWorkdays`, `absenceDates`, `holidayDates`
3. `capacityPerDay`, `overflowPerDay`, `maxWeeklyCapacity`
4. `plannedVisits`, `plannedFollowUps`, `unassignedVisits`
5. `travelMinutes`
6. `utilizationPct`, `overflowVisits`, `loadStatus`

## Prioritaire Databron-uitbreidingen

1. Baseline datums (`baselineStart`, `baselineEnd`) bewaren op dossierniveau.
2. Historiek van statuswijzigingen (`VERGUND -> IN EFFECT -> ...`).
3. Bezoeklog met timestamp per werf (`lastVisitDate`).
4. Afwezigheden per toezichter per datum.
5. API-id koppelingen (`referentieId`, `gipodId`) als sleutel voor externe statusupdates.

## Iteratievolgorde

1. `Tijdlijn`:
   - tabel + balken met baseline/actueel.
   - milestones als badges op balk.
2. `Afhankelijkheden`:
   - relationele tabel + statusberekening.
   - conflictregels en waarschuwingen.
3. `Capaciteit per week`:
   - weekaggregatie per toezichter.
   - overload-signalen + herverdeel-suggestie.

## Acceptatiecriteria Iteratie 1

1. Per dossier is baseline en actuele planning zichtbaar.
2. Minstens 1 dependency-type (`FS`) is operationeel met conflictmelding.
3. Weekcapaciteit toont util% en overload status per toezichter.
4. Alle views reageren op bestaande contextfilters (status, district, toezichter).

