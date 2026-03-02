# DN 8-Weken Staffing- en Sprintplan (Schil 1)

Datum: 2026-02-27  
Status: Werkplan v1  
Periode: formele start 2026-03-20, uitvoering 2026-03-23 t.e.m. 2026-05-15 (8 weken)  
Scope: regielaagfundament, governance-minimum en integratiebreedte start (GIPOD first)

## 0. Subsidie-afspraak en pre-fase
1. Tot en met 2026-03-19: vibe coding en structuurversterking, zonder formele termijncommit.
2. Formele termijnplanning start op 2026-03-20 (subsidie-afspraak).
3. Sprintuitvoering loopt vanaf werkweek 2026-03-23.

## 1. Doel van deze 8 weken
Binnen 8 weken van sterke demo-architectuur naar productierijpe Schil 1 fundering:
1. centrale regielaag v1;
2. IAM/audit basis in werking;
3. eerste echte integratieketen met GIPOD;
4. contract- en testdiscipline in CI;
5. operationele basis voor verdere schaal.

## 2. Resultaat op 2026-05-15
Minimale oplevering:
1. backend v1 live in acceptatie-omgeving met `Work`, `Inspection`, `SyncEvent`;
2. Entra login + basis RBAC in appflow;
3. GIPOD `public-domain-occupancies` read-koppeling operationeel;
4. auditlog op kritieke mutaties;
5. OpenAPI + contracttests + keten smoke tests;
6. release runbook en incident-afspraken voor Schil 1.

Niet in deze 8 weken:
1. volledige schil 2/3 functionaliteit;
2. volledige partnerportaaluitrol;
3. productie-AI;
4. volledige multi-tenant uitrol (wel voorbereid in model).

## 3. Teambezetting (minimum voor productieroute)

| Rol | Indicatieve inzet | Waarom nodig in 8 weken |
|---|---|---|
| Product owner (stad) | 0.4 FTE | Scopebeslissingen en acceptatie |
| Business architect | 0.2 FTE | Kader en trade-offs |
| Digipolis solution architect | 0.3 FTE | Enterprise alignment en platformkeuzes |
| Tech lead/backend | 0.8 FTE | Regielaag en API-implementatie |
| Integratie engineer | 0.8 FTE | GIPOD adapter en mappings |
| Security/DPO/CISO | 0.2 FTE | IAM, audit, DPIA-baseline |
| DevOps/SRE | 0.3 FTE | CI/CD, observability, runbooks |
| QA/test | 0.4 FTE | Contract- en ketenkwaliteit |

## 4. Duo-modus versus productiemodus

`Jij + Codex` kan direct dragen:
1. architectuur- en datamodeldetaillering;
2. backlog en user stories met acceptatiecriteria;
3. mock-first contracten en API-specificaties;
4. proof-of-concept code en documentatie;
5. partnervragenlijsten en besluitnota's.

Extra rollen blijven nodig voor echte productie:
1. Entra/IAM configuratie en beheer;
2. formele DPIA/compliance-goedkeuring;
3. productie-integratieafspraken en SLA's;
4. operationeel beheer en incidentrespons.

## 5. Sprintindeling met kalenderdata
Cadans: 4 sprints van 2 weken.

| Sprint | Data | Hoofddoel | Exit-criteria |
|---|---|---|---|
| Sprint 1 | 2026-03-23 t.e.m. 2026-04-03 | Regielaag en contractfundament | Domain model v1 + OpenAPI draft + architectuurbeslissingen bevestigd |
| Sprint 2 | 2026-04-06 t.e.m. 2026-04-17 | IAM/audit + backend basisflow | Entra auth werkend in acceptatie + audit events op kernmutaties |
| Sprint 3 | 2026-04-20 t.e.m. 2026-05-01 | GIPOD first integration | Read-koppeling live in acceptatie + mapping en retry gedocumenteerd |
| Sprint 4 | 2026-05-04 t.e.m. 2026-05-15 | Stabilisatie en release readiness | Ketentests groen + runbook + go/no-go pakket |

## 6. Sprintdetails per rol

### Sprint 1 (2026-03-23 tot 2026-04-03)
Werk:
1. domain events en statusmodel vastleggen;
2. API-contracten (`Works`, `Inspections`, `Sync`);
3. backlogreductie naar must-have Schil 1.

Rolverdeling:
1. Business architect + Digipolis architect: beslissen op doelkader en grenzen.
2. Tech lead + data architect: model en contracten opstellen.
3. QA: contracttestset opzetten.

Bewijs:
1. goedgekeurd ADR-set;
2. OpenAPI v1 draft;
3. testbare mock responses.

### Sprint 2 (2026-04-06 tot 2026-04-17)
Werk:
1. centrale backend basisservices;
2. Entra login + RBAC minimale rollen;
3. audittrail op create/update/handover/sync.

Rolverdeling:
1. Digipolis + security: IAM en policykeuzes.
2. Tech lead: implementatie auth middleware + audit pipeline.
3. DevOps: secrets, deploy en logretentie setup.

Bewijs:
1. loginflow werkt end-to-end;
2. audit events zijn querybaar;
3. security checklist v1 afgetekend.

### Sprint 3 (2026-04-20 tot 2026-05-01)
Werk:
1. GIPOD `public-domain-occupancies` connectie (beta);
2. statusmapping en idempotency flow;
3. sync retries en monitoring.

Rolverdeling:
1. Integratie engineer: adapter + mapping.
2. Tech lead: outbox/inbox + foutafhandeling.
3. QA: contract + ketentests met foutscenario's.

Bewijs:
1. read sync draait periodiek;
2. mappingtabel gepubliceerd;
3. duplicate/retry gedrag aantoonbaar correct.

### Sprint 4 (2026-05-04 tot 2026-05-15)
Werk:
1. regressie en performantie op kernflows;
2. runbook incidenten en releasebeheer;
3. go/no-go dossier voor vervolgfase.

Rolverdeling:
1. QA + DevOps: release readiness.
2. PO + architecten + security: formele go/no-go.
3. Change/opleiding: korte operationele enablement.

Bewijs:
1. release checklist 100% ingevuld;
2. runbook getest op 2 incident-simulaties;
3. duidelijke lijst open risico's met owner/datum.

## 7. Governance en beslispoorten
Vaste poorten:
1. `Architectuurpoort` op 2026-04-03.
2. `Security/IAM-poort` op 2026-04-17.
3. `Integratiepoort GIPOD` op 2026-05-01.
4. `Releasepoort Schil 1` op 2026-05-15.

Beslisregel:
1. geen doorgang naar volgende poort zonder expliciete afwijkingsbeslissing door PO + architectuur + security.

## 8. Afhankelijkheden en risico's
Top afhankelijkheden:
1. tijdige toegang tot GIPOD beta en juiste documentatie;
2. Entra/IAM ondersteuning;
3. beschikbaarheid van security/compliance review.

Top risico's:
1. integratievertraging door externe partijen;
2. scopeverruiming binnen 8 weken;
3. ontbrekende operationele ownership na oplevering.

Mitigaties:
1. mock-first en adapter-first blijven actief;
2. vaste change-cutoff per sprint;
3. owner per risico met wekelijkse opvolging.

## 9. Praktische overlegcadans
1. Dagelijks 15 min stand-up (delivery team).
2. Wekelijks architectuur/security board (60 min).
3. Tweewekelijks sprint review + planning (90 min).
4. Wekelijks partner/integratie touchpoint (30 min).

## 10. Wat jij nu concreet kan starten
Week 1 acties:
1. bevestig rollen per rol uit sectie 3; namen mogen voorlopig `TBD` blijven;
2. plan de 4 poortmomenten in agenda;
3. start met Sprint 1 backlog als harde scope op basis van `must-have` vs `niet nu`;
4. leg escalatiepad vast voor GIPOD en IAM blockers.

Als dit is ingevuld, kunnen jij en ik onmiddellijk de Sprint 1 artefacts voorbereiden en structureren.

Naamtoewijzing template:
1. zie `docs/strategie/DN_ROLLENBEZETTING_INVULMATRIX.md`.

Scopebeslisnota Schil 1:
1. zie `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md`.
