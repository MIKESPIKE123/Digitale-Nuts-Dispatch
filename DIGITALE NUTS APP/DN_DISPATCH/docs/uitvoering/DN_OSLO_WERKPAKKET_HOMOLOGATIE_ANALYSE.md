# DN OSLO Werkpakket NL - Analyse en Integratieplan

Datum: 2026-03-01  
Status: Analyse v1 (werkdocument)  
Doel: toetsen of de voorgestelde OSLO-werkwijze homogeen kan worden ingeschoven op de reeds ontwikkelde DN Dispatch-aanpak.

## 1. Kort antwoord

Ja. De OSLO-nota en de huidige DN-werking zijn in elkaar te schuiven, maar niet als "extra documentlaag".  
Ze moeten als een expliciet homologatiespoor in Schil 1 worden ingepland met vaste poorten, rollen en opleverartefacten.

## 2. Bron en uitgangspunten

- Externe bron: `OSLO Standaard Werkpakket - Nederland.docx` (aangeleverd via OSLO-werkgroep).
- Interne DN-bronnen:
  - `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md`
  - `docs/architectuur-beslissingen/ADR-002-oslo-first.md`
  - `docs/uitvoering/EXECUTIEBOARD.md`
  - DN Governance-tab in de app (`src/App.tsx`)

## 3. Match OSLO-werkpakket vs huidige DN-werking

| OSLO-onderdeel | Huidige DN-dekking | Gap | Integratiebeslissing |
|---|---|---|---|
| Desk-research | Componentenregister + ADR-002 zijn aanwezig | Nog geen formeel gevalideerde bronset per veld | Formeel desk-research venster plannen met traceerbare bronlijst |
| Business workshop | Governance-overlegstructuur bestaat | Nog geen expliciete OSLO-kickoff/workshopoutput | Kickoff-workshop toevoegen met scope- en use-casebesluit |
| 4 thematische workshops | Interstedelijke en technische ritmes bestaan | Workshops niet als OSLO-reeks benoemd | 4 workshopblokken met vaste output en reviewcadans inplannen |
| Publicatie specificatie (RDF/UML/SHACL/JSON-LD) | OSLO-first richting is beslist | Artefacten ontbreken nog in repo en releaseflow | Publicatiepakket als expliciete deliverable opnemen |
| Publieke review | Governance- en partneroverleg bestaat | Geen publieke reviewprocedure op kandidaatstandaard | Reviewvenster + verwerking + afsluitend webinar opnemen |
| Erkenning datastandaard | Poortdenken bestaat al | Erkenningsdossier en nota nog niet uitgewerkt | Erkenningsvoorbereiding als aparte fase met owner |
| Projectondersteuning | Projectleiding is voorzien | Geen expliciete OSLO PM-rol benoemd | OSLO PM + product owner eigenaarschap formaliseren |

## 4. Geintegreerd werkpad vanaf 2026-03-20

| Fase | Periode | Kernoutput |
|---|---|---|
| Voortraject en scope-alignment | 2026-03-01 t.e.m. 2026-03-19 | Brondocumenten, scopegrenzen en beslisnota "wat wel/niet in Schil 1" |
| Desk-research + business workshop | 2026-03-20 t.e.m. 2026-04-17 | Gevalideerde informatiebehoeften, use cases, eerste model |
| Thematische workshops 1-2 | 2026-04-20 t.e.m. 2026-05-29 | Concepten, definities, objecten/attributen versie 0.8 |
| Thematische workshops 3-4 | 2026-06-01 t.e.m. 2026-07-10 | Relaties, kardinaliteiten, kandidaatmodel versie 1.0 |
| Draft publicatie + tooling | 2026-07-13 t.e.m. 2026-08-21 | RDF, UML/HTML, SHACL, JSON-LD en conformiteitstestbasis |
| Publieke review | 2026-08-24 t.e.m. 2026-09-25 | Verwerkte feedback en reviewlog |
| Erkenningsvoorbereiding | 2026-09-28 t.e.m. 2026-10-16 | Nota voor WG Datastandaarden/Stuurorgaan + overgang naar beheer |

## 5. Budgetkader uit OSLO-nota (indicatief)

- Desk-research: EUR 8.100
- Business workshop: EUR 8.100
- Thematische workshops 1-4: EUR 32.400
- Publicatie specificatie: EUR 6.750
- Publieke review: EUR 6.750
- Erkenning datastandaard: EUR 2.500
- Projectondersteuning: EUR 6.500
- Totaal: EUR 71.100

Interpretatie voor DN: dit is een logisch extern homologatiebudget en kan parallel lopen op de Schil 1-ontwikkeling zonder de bestaande technische backlog te blokkeren.

## 6. Rollen die expliciet nodig blijven

- Product owner DN (scope, prioriteit, go/no-go).
- Semantisch expert/editor (OSLO-modeluitwerking).
- Domeinexperten uit steden/partners (thematische workshops).
- Integratie lead/tech lead (contracten, mappings, implementatiekoppeling).
- QA/validatieverantwoordelijke (SHACL/contract tests).
- OSLO projectmanagement (proces, review en erkenningsstappen).

## 7. Besluit

De trajecten zijn compatibel en samen te voegen.  
Voor succes moet DN OSLO-homologatie behandelen als een volwaardig deliveryspoor met:

1. vaste fasering;
2. expliciete artefacten;
3. toegewezen owners;
4. zichtbare voortgang in de DN Governance-tab.
