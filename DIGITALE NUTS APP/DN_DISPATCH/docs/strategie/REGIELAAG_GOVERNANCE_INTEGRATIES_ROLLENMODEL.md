# DN Regielaag, Governance en Integraties - Rollenmodel en Uitvoeringsaanpak

Datum: 2026-02-27  
Status: Werkdocument v1  
Scope: `DN_DISPATCH` (Schil 1 eerst, Schil 2/3 voorbereid)

## 1. Waarom dit document
De implementatie van regielaag, governance en integratiebreedte is te groot voor 1 profiel.  
Dit document maakt expliciet:
1. welke rol wat moet opnemen;
2. wie eigenaar is per werkpakket;
3. wat intern kan, en wat externe ondersteuning nodig heeft;
4. wat haalbaar is in duo-modus (projectleider + Codex).

## 2. Kort antwoord op de rolvraag
1. `Business architect` is nodig voor doelarchitectuur, scopegrenzen en besliskaders.
2. `KPMG-type analyse` is nuttig voor onafhankelijke doorlichting, businesscase, governance en aanbestedingsonderbouwing.
3. `Digipolis technisch` is cruciaal voor IAM, security-baselines, platformstandaarden, exploitatie en aansluiting op stedelijke enterprise-architectuur.
4. `Externe ontwikkelaar/integrator` is meestal nodig voor uitvoerende backend- en connectorbouw op productieniveau.

Pragmatische keuze voor DN:
1. laat business architect + Digipolis technisch samen het doelkader vastleggen;
2. gebruik externe analyse enkel gericht (governance/businesscase/procurement), niet als vervanging van uitvoerende architectuur;
3. zet een technische integratiepartij in voor bouw en hardening.

## 3. Rollen en verantwoordelijkheden

| Rol | Hoofdverantwoordelijkheid | Typische output |
|---|---|---|
| Product owner (stad) | Prioriteiten, waarde, acceptatie | Backlog, releasebeslissingen, acceptatiecriteria |
| Business architect | Doelarchitectuur en capability map | Architectuurkaders, principes, transitiepad |
| Enterprise/Solution architect (Digipolis) | Vertaling naar stedelijke platformkeuzes | Referentiearchitectuur, integratiepatronen |
| Security architect + DPO/CISO | NIS2/GDPR-by-design | DPIA, controls, audit- en loggingkader |
| Data architect/OSLO specialist | Canoniek model en semantiek | OSLO mapping, JSON-LD/SHACL regels, contracten |
| Tech lead/backend lead | Regielaag implementatie | Services, API's, eventverwerking, datamodel |
| Integratie engineer(s) | Externe koppelingen en mappings | GIPOD/A-SIGN/KLM adapters, retries, monitoring |
| DevOps/SRE | CI/CD, observability, operationele betrouwbaarheid | Pipelines, monitoring, runbooks, back-up/herstel |
| QA lead/test engineer | Contract- en ketentests | Teststrategie, regressie, release gates |
| Change/opleiding | Adoptie op terrein en backoffice | Handleidingen, training, feedbackloop |

## 4. RACI per werkpakket (Schil 1)
Legenda: `R` Responsible, `A` Accountable, `C` Consulted, `I` Informed

| Werkpakket | PO | Business architect | Digipolis architect | Security/DPO | Data architect | Tech lead | Integratie engineer | DevOps | QA |
|---|---|---|---|---|---|---|---|---|---|
| WP1 Regielaag-ontwerp (domain + API) | A | C | C | I | R | R | I | I | C |
| WP2 OSLO-contractlaag | C | C | C | I | A/R | C | C | I | R |
| WP3 GIPOD connect in/out | C | I | C | I | C | A | R | C | R |
| WP4 IAM/RBAC/audittrail | I | I | C | A/R | I | R | I | C | C |
| WP5 Governance (NIS2/GDPR/API policy) | I | C | C | A/R | C | C | I | C | I |
| WP6 Exploitatie/monitoring | I | I | C | C | I | C | C | A/R | C |
| WP7 UAT en operationele adoptie | A | C | I | I | I | C | I | I | R |

## 5. Wat kan jij + Codex samen doen
Dit kan zonder extern team, direct:
1. concretiseren van doelarchitectuur in werkbare tussenstappen;
2. opstellen van OSLO mappingdrafts, contracten en acceptance criteria;
3. bouwen van mock-first adapters en testharnassen;
4. uitwerken van backlog, sprintplannen, release gates en documentatie;
5. realiseren van proof-of-concept backendcomponenten en migratiestrategie;
6. voorbereiden van vragenlijsten voor GIPOD/A-SIGN/KLM en partneroverleg.

Dit kan deels, maar met minstens 1 extra interne specialist:
1. productieklare CI/CD en operationeel monitoringkader;
2. formele security controls en audit logging op enterprise-niveau;
3. transitie van lokale opslag naar centrale productie-datalaag.

Dit kan niet volledig zonder organisatie- en partnerrollen:
1. productie-SSO/Entra autorisaties en formele IAM-governance;
2. DPIA-goedkeuringen, bewaartermijnen en juridische datacontracten;
3. toegang, SLA's en escalatieafspraken met externe databronnen;
4. 24/7 exploitatieverantwoordelijkheid en incidentrespons.

## 6. Aanbevolen kernteam voor 90 dagen (minimum)
1. Product owner: 0.4 FTE
2. Business architect: 0.2 FTE
3. Digipolis solution architect: 0.3 FTE
4. Tech lead/backend: 0.8 FTE
5. Integratie engineer: 0.8 FTE
6. Security/DPO/CISO input: 0.2 FTE
7. QA/test: 0.4 FTE
8. DevOps/SRE: 0.3 FTE

Indicatie: dit is een compact team. Minder kan voor prototype, maar niet voor betrouwbare ketenproductie.

## 7. Leveranciers- en organisatiekeuze
Aanbevolen model:
1. `Intern`: product ownership, architectuurbeslissingen, governancekaders.
2. `Digipolis`: enterprise alignment, IAM/security, platformkeuzes en exploitatiekaders.
3. `Extern`: uitvoerende bouw van backend/integraties met overdracht naar intern beheer.

Niet aanbevolen model:
1. analysepartij als enige motor zonder uitvoerende technische lead;
2. volledig extern zonder interne architectuur- en governance-eigenaarschap.

## 8. Beslissingsvragen voor de komende 2 weken
1. Wie tekent af op doelarchitectuur: business architect, Digipolis architect, of beide?
2. Wie is formeel eigenaar van IAM/RBAC en audit controls?
3. Welke integratie wordt first-in-line: GIPOD `public-domain-occupancies` read of write?
4. Welke minimale SLA en incidentflow geldt voor Schil 1?
5. Welke onderdelen worden extern aanbesteed en welke intern gebouwd?

## 9. Conclusie
Ja, jij en ik kunnen de inhoudelijke versnelling en technische voorbereiding sterk trekken.  
Nee, voor productie op regielaag/governance/integratiebreedte is een klein multidisciplinair team noodzakelijk.  
De juiste aanpak is dus: duo als versneller + gerichte inzet van architectuur, security, integratie en exploitatieprofielen.

## 10. Operationele planning
Voor de concrete 8-weken invulling met kalenderdata, sprintdoelen en poortmomenten:
1. zie `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md`.
2. voor naamtoewijzing per rol (met `TBD` mogelijk):  
   `docs/strategie/DN_ROLLENBEZETTING_INVULMATRIX.md`.
