# ADR-003 - AI Buiten de Schil 1 SaaS-Kern (HITL en Modulair)

Datum: 2026-02-28  
Status: accepted  
Beslissers: Product owner, business architect, security/DPO, tech lead  
Scope: Schil 1 en Schil 2 positionering van AI

## Context

1. AI biedt duidelijke meerwaarde, maar verhoogt in vroege fase risico op scope-expansie, compliance-druk en operationele complexiteit.
2. Schil 1 focust op stabiele ketenfundamenten: regielaag, IAM/audit en eerste integraties.
3. De app moet AI-ready blijven zonder afhankelijk te worden van 1 AI-provider of oncontroleerbare beslissingen.

## Beslissing

1. In Schil 1 komt geen productie-AI in de kernflow voor dispatch of juridische beslissingen.
2. AI wordt modulair voorbereid via adapters/gateways en blijft buiten de kern-SaaSlogica.
3. Elke AI-toepassing blijft Human-In-The-Loop (HITL): mens valideert eindbeslissingen.
4. AI-uitrol schuift functioneel naar latere schillen na stabiliteit, governance en meetbare kwaliteitscriteria.

## Gevolgen

Positief:
1. Focus op robuuste basis en snellere oplevering van Schil 1.
2. Lager compliance- en governance-risico in vroege fase.
3. Minder vendor lock-in en betere onderhandelingspositie.

Trade-offs:
1. Sommige optimalisatiewinsten komen later.
2. Extra ontwerpwerk nodig om AI-koppelingen later veilig in te pluggen.

## Uitvoeringsregels

1. AI-resultaten zijn adviserend, niet autonoom beslissend.
2. AI-interfaces worden contractueel losgekoppeld van kernentiteiten.
3. Voor productie-AI is een aparte go/no-go vereist met security, governance en meetplan.

## Bronnen

1. `docs/strategie/DN_HERIJKING_EN_AI_TRANSFORMATIE.md`
2. `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md`
3. `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md`
4. `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md`
