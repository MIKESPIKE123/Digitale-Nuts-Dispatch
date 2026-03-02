# DN Schil 1 Scope - Must-Have vs Niet Nu

Datum: 2026-02-27  
Status: Beslisnota v1  
Doel: scope vastzetten voor Schil 1 en scope creep vermijden in de periode 2026-03-20 t.e.m. 2026-05-15.

## 1. Uitgangspunten
1. Architectuurfase: regielaagfundament, governance-minimum en eerste integratie.
2. Integratiefocus: GIPOD beta, `public-domain-occupancies`.
3. Team werkt rolgebaseerd; namen mogen `TBD` blijven.
4. Tot en met 2026-03-19: pre-fase (vibe coding + structuur), zonder formele termijncommit.
5. Wijzigingen op deze scope mogen enkel via poortbeslissing.

## 2. Must-Have (Schil 1 nu)

| ID | Scope-item | Waarom must-have | Acceptatie op hoofdlijn |
|---|---|---|---|
| MH-01 | Centrale backend v1 (`Work`, `Inspection`, `SyncEvent`) | Van lokale tool naar ketenfundament | Data loopt via backend, niet enkel lokaal |
| MH-02 | OpenAPI/contracten v1 (`Works`, `Inspections`, `Sync`) | Interoperabiliteit en testbaarheid | Contract gepubliceerd en gebruikt in tests |
| MH-03 | Entra login + basis RBAC | Minimale enterprise toegang | Loginflow werkt en rollen beperken toegang |
| MH-04 | Audittrail op kritieke acties | Governance en bewijsvoering | Kernmutaties zijn traceerbaar |
| MH-05 | GIPOD read-koppeling (`public-domain-occupancies`) | Eerste echte ketenkoppeling | Sync levert actuele gegevens op in acceptatie |
| MH-06 | Idempotency + retry op syncflow | Betrouwbaarheid van integraties | Dubbele events geven geen dubbele verwerking |
| MH-07 | Contracttests + keten smoke tests in CI | Releasekwaliteit | Testset groen als releasevoorwaarde |
| MH-08 | Release runbook + incidentflow v1 | Operationele beheersbaarheid | Runbook is getest en bruikbaar |
| MH-09 | Scope- en poortdiscipline per sprint | Scopebeheersing | Elke sprint eindigt met expliciete go/no-go |

## 3. Niet Nu (expliciet uit scope in deze fase)

| ID | Item | Reden uitstel | Herbekijken op |
|---|---|---|---|
| NN-01 | Volledige GIPOD write-back productieflow | Eerst read-keten en stabiliteit bewijzen | 2026-05-15 |
| NN-02 | Productie-integratie A-SIGN | Extra afhankelijkheden, verhoogt risico nu | 2026-05-15 |
| NN-03 | Productie-integratie KLM/klachten | Niet blokkerend voor Schil 1 kern | 2026-05-15 |
| NN-04 | Volwaardig partnerportaal | Vereist extra rollenbeheer en procesafspraken | 2026-05-15 |
| NN-05 | Bewonerscommunicatie/QR module | Schil 2 prioriteit | 2026-05-15 |
| NN-06 | AI Assist/predictieve planning | Dataketen moet eerst stabiel zijn | 2026-05-15 |
| NN-07 | Retributie en juridisch logboek volledig | Schil 3 scope | 2026-05-15 |
| NN-08 | Volledige multi-tenant uitrol | Eerst single-tenant robuust maken | 2026-05-15 |
| NN-09 | Formele OSLO-certificatie end-to-end | Wel voorbereiden, nog niet afronden | 2026-05-15 |

## 4. Scope freeze en wijzigingsregels
1. Baseline freeze op 2026-03-20.
2. Nieuwe scope-items alleen via poortbeslissing:
   1. Architectuurpoort (2026-04-03)
   2. Security/IAM-poort (2026-04-17)
   3. Integratiepoort GIPOD (2026-05-01)
   4. Releasepoort Schil 1 (2026-05-15)
3. Elk nieuw item moet bevatten:
   1. impact op planning;
   2. impact op risico;
   3. owner-rol;
   4. expliciete compensatie (wat schuift dan uit scope).

## 5. Week-1 beslischecklist
1. Bevestig dat alle `MH-*` items binnen 8 weken haalbaar zijn.
2. Bevestig dat alle `NN-*` items niet stiekem in sprintbacklog zitten.
3. Koppel elke `MH-*` aan minimaal 1 sprintdeliverable.
4. Registreer afwijkingen in poortbesluiten.

## 6. Relatie met andere documenten
1. Operationele planning: `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md`.
2. Rollenmodel: `docs/strategie/REGIELAAG_GOVERNANCE_INTEGRATIES_ROLLENMODEL.md`.
3. Rolleninvulling: `docs/strategie/DN_ROLLENBEZETTING_INVULMATRIX.md`.
4. Backloglabeling (`MH`/`NN`): `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md` en `docs/uitvoering/EXECUTIEBOARD.md`.
