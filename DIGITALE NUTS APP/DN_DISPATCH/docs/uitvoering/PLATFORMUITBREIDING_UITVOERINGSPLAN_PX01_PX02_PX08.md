# Platformuitbreiding - Uitvoeringsplan PX-01, PX-02, PX-08

Datum: 2026-02-20  
Status: Actief werkdocument (uitvoering)  
Scope: consolidatie en snelle operationele winst zonder full AI

## 1. Doel

Binnen 6 weken drie platformuitbreidingen operationeel versterken:

1. `PX-01` Vaststelling+ Evidentieflow
2. `PX-02` Vergunning/Signalisatiecontrole
3. `PX-08` KPI Datamart + Beleidspanel

Resultaat: hogere datakwaliteit, minder operationele onzekerheid en betere sturing.

## 2. Waarom deze volgorde

1. `PX-01` maakt de basis betrouwbaar (bewijs, sync, context).
2. `PX-02` verhoogt directe terreinwaarde via afwijkingsdetectie.
3. `PX-08` maakt effecten meetbaar en bestuurbaar.

## 3. Werkpakketten per PX

### 3.1 PX-01 Vaststelling+ Evidentieflow

Doel:
1. records juridisch en operationeel sluitend maken.

Acties:
1. verplichte kernvelden afdwingen voor `queued/synced`;
2. media-metadata standaardiseren (`photoId`, `takenAt`, `lat`, `lon`, `actorId`, `hash`);
3. lokale payload cleanup na succesvolle sync;
4. foutscenario's testen (failed sync, retry, duplicate).

Owner:
1. Tech lead (backend/sync)
2. Frontend lead (form/validatie)
3. QA owner (regressietests)

Definition of Done:
1. geen `queued` zonder verplichte context;
2. sync-queue toont correcte server outcome;
3. regressietest happy-path + foutpad geslaagd.

### 3.2 PX-02 Vergunning/Signalisatiecontrole

Doel:
1. ontbrekende of conflicterende vergunningcontext sneller zichtbaar maken.

Acties:
1. rule engine v1 op `signVergNr`, `fase`, `status`;
2. mock `PermitsGateway` met scenario's `ok`, `missing`, `conflict`;
3. mismatch-badge in kaartpopup en vaststellingsflow;
4. 3 contracttests voor regels en scenario-uitkomsten.

Owner:
1. Business analyst (regeldefinitie)
2. Frontend/dev (engine + UI badge)
3. QA owner (tests)

Definition of Done:
1. 3 regels actief en configureerbaar;
2. 3 scenario's aantoonbaar in test en demo;
3. geen hardcoded regels in UI-componenten.

### 3.3 PX-08 KPI Datamart + Beleidspanel

Doel:
1. operationele en beleidssturing objectief maken met consistente KPI's.

Acties:
1. KPI-calculatie centraliseren (geen duplicatie in views);
2. week-op-week trendweergave met baseline;
3. snapshot-export (markdown/csv);
4. KPI-definitietabel bijwerken met bron, formule en beperking.

Owner:
1. Product owner (KPI-definitie)
2. Dev lead (calculatie + export)
3. Projectleider (acceptatie en gebruik in overleg)

Definition of Done:
1. minimaal 8 kern-KPI's met definitie;
2. export beschikbaar voor weekreview;
3. dashboard reageert correct op filters/sessiecontext.

## 4. Timing (6 weken)

### Week 1-2
1. PX-01 afronden op validatie + sync + regressietest.
2. PX-08 voorbereiden: KPI-definities en baseline.

### Week 3-4
1. PX-02 rule engine v1 + UI badges + tests.
2. PX-08 trendweergave live.

### Week 5-6
1. PX-08 snapshot-export en managementreview.
2. Gezamenlijke stabilisatieronde PX-01/PX-02/PX-08.
3. Go/No-go naar volgende uitbreidingsset.

## 5. Ritme en overleg

1. Dagelijks 15 min operationele opvolging op `EXECUTIEBOARD`.
2. Wekelijks 45 min kwaliteitsreview met KPI-snapshot.
3. Tweewekelijks beslismoment met projectleider en product owner.

## 6. Risico's en mitigatie

1. Scope-uitbreiding tijdens uitvoering  
Mitigatie: wijzigingsstop per week en expliciete change-approval.

2. Datakwaliteit onder drempel voor KPI's  
Mitigatie: verplichte veldpoortjes eerst, KPI daarna.

3. Regelcomplexiteit in PX-02 loopt op  
Mitigatie: start met 3 regels en uitbreiden pas na validatie.

## 7. Meetbare succescriteria

1. `PX-01`: daling van `failed` sync-items in weekreview.
2. `PX-02`: % dossiers met vergunningmismatch zichtbaar in UI.
3. `PX-08`: wekelijkse KPI-export gebruikt in projectoverleg.

## 8. Beslispunt na 6 weken

1. Als stabiliteit en KPI-discipline op niveau zijn: start volgende set (`PX-03`, `PX-04`).
2. Alleen bij duidelijke bottleneck: beperkte AI-pilot overwegen (geen full AI rollout).
