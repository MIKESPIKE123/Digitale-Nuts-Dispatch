# ADR-002 - OSLO-First voor Canonieke Datamodellen en Contracten

Datum: 2026-02-28  
Status: accepted  
Beslissers: Product owner, data architect/OSLO specialist, solution architect, integratie lead  
Scope: Schil 1 integratiebasis en Schil 2 uitbreidingen

## Context

1. Digitale Nuts moet data uitwisselen met externe partijen (o.a. GIPOD) en later schaalbaar zijn naar andere steden.
2. Zonder canonieke semantiek ontstaan mappingfouten, interpretatieverschillen en integratiekosten per partner.
3. De huidige implementatie is sterk operationeel, maar verdere opschaling vereist expliciete standaardisatie.

## Beslissing

1. We hanteren OSLO-first als richting voor canonieke entiteiten en veldbetekenis.
2. API-contracten worden versieerbaar beheerd en gekoppeld aan mappingtabellen tussen interne velden en OSLO-concepten.
3. Contracttests worden gebruikt om breaking changes vroeg te detecteren.
4. GIPOD `public-domain-occupancies` is de eerste prioritaire keten voor deze contractdiscipline.

## Gevolgen

Positief:
1. Betere interoperabiliteit en lagere integratierisico's.
2. Snellere onboarding van nieuwe partners/steden.
3. Transparantere datakwaliteit en auditbaarheid.

Trade-offs:
1. Initiële modellering en mapping vragen extra capaciteit.
2. Versiebeheer van contracten en codelijsten wordt een doorlopende verantwoordelijkheid.

## Uitvoeringsregels

1. Nieuwe integratievelden krijgen expliciete semantische betekenis en mapping.
2. Contractwijzigingen gaan via versiebeheer en changelog.
3. Merge naar hoofdbranch vereist slagen van contracttests voor relevante gateways.

## Bronnen

1. `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md`
2. `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md`
3. `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md`
4. `docs/uitvoering/EXECUTIEBOARD.md`
