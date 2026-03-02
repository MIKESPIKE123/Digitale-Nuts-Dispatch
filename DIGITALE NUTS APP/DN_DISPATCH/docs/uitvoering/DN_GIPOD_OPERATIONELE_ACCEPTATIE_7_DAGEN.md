# DN GIPOD Operationele Acceptatie - 7 Dagen

Datum: 2026-02-28  
Status: Ready for execution  
Doel: gecontroleerde operationele acceptatie van de notificatieflow in reële dispatchwerking.

## 1. Testvenster

1. Duur: 7 kalenderdagen (min. 5 werkdagen).
2. Scope: Governance Inbox + Dispatch urgentieblok.
3. Input: echte notificaties uit beta-tenant.

## 2. Dagelijks ritme

1. Startcheck (09:00): inboxstatus, poll-status, eventuele fouten.
2. Middagcheck (13:00): nieuwe urgente notificaties en opvolgingsactie.
3. Eindcheck (16:30): issue-log, SLA-impact, lessons learned.

## 3. Dagelijkse registratie (template)

Gebruik onderstaande tabel per dag:

| Datum | #Nieuwe notificaties | #Task/Warning | #Statusupdates | #429 events | Incidenten (S1/S2/S3) | Opmerking |
|---|---:|---:|---:|---:|---|---|
| YYYY-MM-DD |  |  |  |  |  |  |

## 4. Acceptatie KPI's

1. `KPI-01`: >= 95% van Task/Warning notificaties binnen zelfde werkdag beoordeeld.
2. `KPI-02`: 0 retry-storm incidenten bij 429.
3. `KPI-03`: statusupdate werkt in >= 90% van gevallen zonder handmatige retry.
4. `KPI-04`: contextlink naar werk/dossier beschikbaar in >= 90% van urgente notificaties.

## 5. Issueboard model

Severity:

1. `S1`: blokkeert kernflow (geen notificaties of geen updates mogelijk).
2. `S2`: kernflow werkt deels, operationele workaround nodig.
3. `S3`: cosmetisch of lichte usability-impact.

Issue velden:

1. `Issue-ID`
2. `Datum/Tijd`
3. `Scenario`
4. `Severity`
5. `Beschrijving`
6. `Owner`
7. `Status`
8. `Herstelversie`

## 6. Eindevaluatie (dag 7)

1. KPI-evaluatie en trendoverzicht.
2. Open issues met resterend risico.
3. Voorstel: `GO` of `NO-GO` naar release gate v1.7.
