# ADR-001 - Hybride Model als Kernarchitectuur

Datum: 2026-02-28  
Status: accepted  
Beslissers: Product owner, business architect, solution architect, tech lead  
Scope: Schil 1 baseline en doorwerking naar Schil 2/3

## Context

1. Digitale Nuts moet tegelijk operationeel inzetbaar zijn op korte termijn en schaalbaar blijven voor interstedelijke uitrol.
2. De huidige app bevat waardevolle operationele flow, maar moet structureel gekoppeld worden aan regielaag, integratie en governance.
3. Een monolithische UI-centrische aanpak verhoogt risico op datakoppeling-problemen, lage testbaarheid en moeilijke opschaling.

## Beslissing

1. We hanteren een hybride, gelaagde architectuur met duidelijke scheiding tussen:
   - datafundament en standaardisatie;
   - datapipeline/verrijking;
   - beslissings- en prioriteringslogica;
   - presentatie/UI;
   - optionele optimalisatielagen.
2. Businessregels en dispatchlogica blijven buiten de UI en worden als aparte domeinlogica beheerd.
3. Externe systemen worden ontsloten via adapters/gateways, niet via hardgekoppelde calls in schermlogica.

## Gevolgen

Positief:
1. Hogere testbaarheid en betere wijzigbaarheid per laag.
2. Sterkere basis voor interstedelijke herbruikbaarheid.
3. Minder lock-in op UI-keuzes of 1 leverancier.

Trade-offs:
1. Meer ontwerpdiscipline en contractbeheer nodig.
2. Extra afstemming tussen teams (architectuur, integratie, security) blijft noodzakelijk.

## Uitvoeringsregels

1. Nieuwe features respecteren laaggrenzen; geen businesslogica in view-components.
2. Integraties krijgen eerst contract en test, daarna implementatie.
3. Wijzigingen op kernlaag vereisen impactcheck op governance, API en rapportering.

## Bronnen

1. `docs/techniek/DN_REFERENTIEARCHITECTUUR.md`
2. `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md`
3. `docs/strategie/REGIELAAG_GOVERNANCE_INTEGRATIES_ROLLENMODEL.md`
