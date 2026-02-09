# Documentatie Index

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Overzicht van alle projectdocumenten

| Bestand | Doelgroep | Inhoud |
|---|---|---|
| `README.md` | iedereen | snel overzicht + start |
| `README_NEW.md` | operatie | terreinworkflow en gebruik |
| `BACKLOG_ASIGN_TERRAINVERBETERING.md` | product owner, functioneel beheer | prioriteiten + user stories uit A-Sign analyse |
| `SPRINTPLANNING_ASIGN_2026_Q1.md` | product owner, projectleiding | sprintindeling + deliverables + acceptatie |
| `BUSINESS_RULES_DOCUMENTATION.md` | functioneel beheer, trainers | business rules + compliance matrix |
| `TECHNICAL_IMPLEMENTATION_GUIDE.md` | ontwikkelaars | architectuur, codepatronen, releaseflow |
| `VERSIE_BEHEER_INSTRUCTIES.md` | releaseverantwoordelijken | stap-voor-stap versieproces |
| `CHANGELOG.md` | iedereen | historiek van releases |
| `PDF-Generator-Documentation.md` | ontwikkelaars, analisten | PDF/CSV exportopzet |
| `REVIEWER_GUIDE.md` | reviewers | reviewfocus en checks |
| `IMPLEMENTATIE_RAPPORT_DIGITALE_NUTS_2026_02.md` | projectleiding | uitgevoerde implementaties |

## Document update policy
Bij elke functionele release:
1. Update `src/version.ts`.
2. Update `CHANGELOG.md`.
3. Controleer en update alle bovenstaande `.md` bestanden op versieconsistentie.
4. Run `npm run build`.

## Minimum versievermelding per document
Elk document bevat minimaal:
- actuele appversie
- verwijzing naar `src/version.ts`
- datum van laatste documentupdate
