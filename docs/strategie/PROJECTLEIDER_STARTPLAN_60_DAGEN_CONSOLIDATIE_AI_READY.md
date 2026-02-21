# Projectleider Startplan - 60 Dagen Consolidatie en AI-Ready

Datum: 2026-02-20  
Status: Actief werkdocument  
Scope: `DN_DISPATCH` + `DN Vaststelling`  

## 1. Doel

Dit document vertaalt de bestaande analyses naar een uitvoerbaar startplan voor de nieuwe projectleider:

1. eerst consolidatie van de huidige Vibe-coded app;
2. daarna AI-ready voorbereiding zonder full AI-uitrol;
3. optioneel vervroegen van beperkte AI-componenten met expliciete impactafweging.

## 2. Kernconclusie uit de huidige documentatie

1. De architectuurbasis is sterk (modulair, contract-first, mock-first, testbaar).
2. De grootste risico's zitten niet in UI, maar in ketenfundering:
- centrale datawaarheid;
- identity/security/audit;
- consistente contracten met partners.
3. De hoogste korte-termijnwinst zit in consolidatie en operationele discipline.
4. AI moet standaard in schil 3 blijven in communicatie, maar architecturaal al voorbereid worden.

## 3. Verbeteringsvoorstellen zonder full AI

| Prioriteit | Verbetering | Waarom nu | Meetbaar effect binnen 60 dagen |
|---|---|---|---|
| P0 | 1 bron van waarheid voor status en sync | voorkomt discussie over "welke data klopt" | minder failed/rework in terreinflow |
| P0 | Stabilisatie van veldkwaliteit (`docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md`) | betere databetrouwbaarheid voor rapportering en later AI | hoger % complete records |
| P0 | QA-gates en release-ritme (`docs/uitvoering/EXECUTIEBOARD.md`) | minder regressies in demo/operatie | snellere, voorspelbare oplevering |
| P1 | KPI-definities en trendmeting standaardiseren | versnelt beslissingen en teamalignment | minder interpretatiediscussie in overleg |
| P1 | Partnerinput structureren rond minimumvelden | verkort pad naar echte API-integratie | sneller van mock naar echte koppeling |
| P1 | Opleidingsritme per rol (quick guides + demoflow) | versnelt adoptie en verlaagt foutkans | kortere inwerktijd nieuwe teamleden |

## 4. 60-dagen uitvoeringsplan (gekoppeld aan interstedelijk plan)

### Dag 1-20: Verkenning en baseline

Doel:
1. app en samenwerking op dezelfde baseline krijgen.

Acties:
1. start met `docs/uitvoering/EXECUTIEBOARD.md` als enige operationele waarheid;
2. leg 8-10 kern-KPI's vast (definitie, formule, bron, beperking);
3. valideer veldenset-poortjes en syncstatus met terreinteam;
4. voer partnergesprekken met vaste datavraag (minimumvelden).

Output:
1. baseline KPI snapshot;
2. lijst structurele blokkers met owner en datum;
3. akkoord over MVP-scope zonder AI-uitbreiding.

### Dag 21-40: Conceptuele afstemming en standaardisatie

Doel:
1. van losse verbeteringen naar herhaalbaar model.

Acties:
1. contract- en mappingafspraken formaliseren (GIPOD/OSLO/API);
2. quality gates activeren per release;
3. impactprocedure (`impact:phase4`) opnemen in weekritme;
4. trainingscyclus uitvoeren: toezichter, dispatcher, projectleider.

Output:
1. werkende operationele standaard;
2. interstedelijk bespreekbare datataal;
3. aantoonbare verbetering op kwaliteit en doorlooptijd.

### Dag 41-60: Formalisering en schaalvoorbereiding

Doel:
1. consolidatie omzetten naar bestuurbaar groeipad.

Acties:
1. roadmap 12-18 maanden finaliseren met schiltoewijzing;
2. governancekader vastleggen (eigenaarschap, wijzigingen, validatie);
3. keuze maken over beperkte AI-pilot (ja/nee) op basis van meetresultaten.

Output:
1. formeel afgestemd uitvoeringskader;
2. duidelijke criteria wanneer AI vervroegd mag worden;
3. overdraagbaar pakket voor volgende steden/partners.

## 5. Waar de app versneld leren mogelijk maakt

| Leerdoel | Hoe DN_DISPATCH helpt | Praktische cadans |
|---|---|---|
| Sneller teamleren op operatie | demo-script + quick guides + vaste flow | dagelijkse 10-min demo-run |
| Sneller leren op datakwaliteit | validatiepoortjes + sync outcomes + KPI-paneel | wekelijkse kwaliteitsreview |
| Sneller leren op prioritering | impactfase 4 vergelijkingsoutput (oud/nieuw) | tweewekelijkse kalibratie |
| Sneller leren tussen steden | gestandaardiseerde contracten/docs | maandelijks interstedelijk overleg |
| Sneller leren in sturing | executieboard met bewijs per item | 2x per week beslisoverleg |

## 6. AI-ready voorbereiding (zonder full AI)

Deze backlog moet klaarstaan voordat full AI wordt opgestart:

1. consistente logging van outcomes (`OK/NOK`, hersteltermijn, herbezoek);
2. volledige audittrail op beslissingen en statuswijzigingen;
3. stabiele contractlaag met versiebeheer;
4. labeldiscipline op notities en evidence;
5. datakwaliteitsdrempels per kritieke feature.

## 7. AI naar voren halen: alleen met duidelijke effecten

### Optie A (laag risico): routeoptimalisatie met OR-Tools

Voorwaarde:
1. route-inputdata is stabiel en gevalideerd.

Positief effect:
1. direct meetbare reistijdwinst.

Negatief effect:
1. extra complexiteit in planning-uitlegbaarheid.

Besluitregel:
1. alleen starten als reistijd een top-3 operationeel knelpunt is in baseline.

### Optie B (middel risico): notitie-structurering (NLP assist)

Voorwaarde:
1. heldere privacyregels en menselijke review blijven verplicht.

Positief effect:
1. snellere codering van vrije tekst naar categorieen.

Negatief effect:
1. risico op foutclassificatie zonder reviewdiscipline.

Besluitregel:
1. alleen starten als handmatige categorisatie aantoonbaar bottleneck is.

## 8. Besliskaders voor projectleider

1. Geen AI-opschaling zonder stabiele datafundering.
2. Geen nieuwe module zonder KPI-impact en eigenaar.
3. Geen release zonder QA-gates en rollbackpad.
4. Geen interstedelijke belofte zonder aantoonbaar bewijs in app/metrics.

## 9. Eerste 10 werkdagen checklist (praktisch)

1. Bevestig documentstructuur en leesvolgorde met team.
2. Herbevestig sprintscope op consolidatie i.p.v. featuregroei.
3. Leg baseline vast voor sync, datacompleetheid en throughput.
4. Plan 3 rolgerichte oefensessies met quick guides.
5. Plan interstedelijk gesprek met focus op datafundament.
6. Maak beslissingstemplate "AI nu of later" met criteria uit sectie 7.

## 10. Referentiedocumenten

1. `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md`
2. `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md`
3. `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md`
4. `docs/strategie/DN_HERIJKING_EN_AI_TRANSFORMATIE.md`
5. `docs/uitvoering/EXECUTIEBOARD.md`



