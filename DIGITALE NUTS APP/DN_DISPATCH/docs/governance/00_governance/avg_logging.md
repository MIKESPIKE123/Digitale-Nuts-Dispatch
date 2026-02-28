# AVG Logging Baseline - Digitale Nuts

Datum: 2026-02-28  
Status: draft v1  
Doel: loggingprincipes voor AVG/GDPR-by-design vastleggen voor Schil 1 en opvolgende schillen.

## Context

1. Digitale Nuts verwerkt operationele data met mogelijk persoonsgegevens en gebruikersidentiteit.
2. Audittrail is nodig voor traceerbaarheid, maar moet proportioneel en doelgebonden blijven.
3. Logging zonder duidelijke regels verhoogt privacy- en compliance-risico.

## Beslissing

1. Logging volgt het principe "minimum necessary": alleen noodzakelijke velden en events.
2. Kritieke events (`create/update/handover/sync`) worden centraal en consistent gelogd.
3. Bewaartermijnen, toegang en export van logs worden per rol en doel afgebakend.

## Impact

1. Positief: betere bewijsvoering en incidentanalyse.
2. Positief: minder kans op overlogging van persoonsgegevens.
3. Trade-off: extra afstemming tussen development, security en DPO.

## Volgende stappen

1. Eventcatalogus met privacyclassificatie opstellen.
2. Bewaartermijnen en toegangsrechten afstemmen met DPO.
3. Controlepunt opnemen in releasepoort Schil 1.
