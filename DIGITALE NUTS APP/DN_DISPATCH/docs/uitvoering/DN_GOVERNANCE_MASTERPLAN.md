# DN Governance Masterplan

Datum: 2026-02-28  
Status: Actief stuurdocument voor DN Governance tab in de app  
Scope: planning, schillen, actieplannen, overlegmomenten en budgetopvolging

## 0. Bronbasis (samengebracht)
1. `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md`
2. `docs/strategie/PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md`
3. `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md`
4. `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md`
5. `docs/uitvoering/EXECUTIEBOARD.md`
6. `C:\Users\5129\Downloads\DETAIL_PLANNING_Digitale_nuts.pdf`
7. `C:\Users\5129\Downloads\BIJLAGE D_OVERZICHT_PLANNING_DIGITALE_NUTS (1).pdf`
8. `C:\Users\5129\Downloads\Digitale_Nuts_city_of_things_2025_projectbegroting.xlsx`
9. `docs/IPAD_APP_EVALUATIE.md`
10. `docs/ANDROID_APP_EVALUATIE.md`

## 1. Planninglagen

### 1.1 Operationeel (DN Dispatch werkafspraak)
Termijnkader:
1. Tot en met 2026-03-19: pre-fase (vibe coding + structuur).
2. Formele planningstart: 2026-03-20.
3. Schil 1 uitvoeringsvenster: 2026-03-23 t.e.m. 2026-05-15.

| Blok | Periode | Doel |
|---|---|---|
| Pre-fase | tot en met 2026-03-19 | Structuurversterking zonder formele termijncommit |
| Sprint 1 | 2026-03-23 t.e.m. 2026-04-03 | Regielaag + contractfundament |
| Sprint 2 | 2026-04-06 t.e.m. 2026-04-17 | IAM/RBAC + auditbasis |
| Sprint 3 | 2026-04-20 t.e.m. 2026-05-01 | GIPOD read-koppeling + idempotency/retry |
| Sprint 4 | 2026-05-04 t.e.m. 2026-05-15 | Stabilisatie + release readiness |

### 1.2 Interstedelijk 60-dagen traject
| Fase | Periode | Hoofdoutput |
|---|---|---|
| Dag 1-20 | 2026-03-20 t.e.m. 2026-04-08 | Baseline KPI + stakeholdermatrix + blokkers |
| Dag 21-40 | 2026-04-09 t.e.m. 2026-04-28 | Datafundament, MVP-afbakening, governanceafstemming |
| Dag 41-60 | 2026-04-29 t.e.m. 2026-05-18 | Intentieverklaring, kerncoalitie, 12-18m roadmap |

### 1.3 Subsidie-meerjarenplanning (bron PDF bijlagen)
| Laag | Periode | Focus |
|---|---|---|
| Laag 1 - Kernontwikkeling (MVP) | 2026-02-06 t.e.m. 2027-03-05 | Analyse, MVP app/portaal, pilot, governance laag 1 |
| Laag 2 - Functionele uitbreiding | 2027-03-12 t.e.m. 2027-12-31 | Integraties, BI, AI-pilot HITL, governance laag 2 |
| Laag 3 - Geavanceerd + opschaling | 2027-12-31 t.e.m. 2028-10-06 | Predictie, retributie, disseminatie, Vlaamse opschaling |

## 2. Actieplannen nu actief
1. `PX-01/PX-02/PX-08` weekplanning W1-W6 (2026-03-23 t.e.m. 2026-05-01).
2. `RPT-US` rapporten W1-W6 (2026-03-23 t.e.m. 2026-05-01).
3. Scopebewaking via `MH-*` (must-have) en `NN-*` (niet nu) met poortdiscipline.

## 3. Governance- en overlegstructuur

### 3.1 Schil 1 poorten
1. Architectuurpoort: 2026-04-03.
2. Security/IAM-poort: 2026-04-17.
3. Integratiepoort GIPOD: 2026-05-01.
4. Releasepoort Schil 1: 2026-05-15.

### 3.2 Subsidie-stuurgroep mijlpalen (PDF)
1. ST1: 2026-02-06.
2. ST2: 2026-08-21.
3. ST3: 2027-03-05.
4. ST4: 2027-12-31.
5. ST5: 2028-06-16.

### 3.3 Werkcadans
1. Dagelijks: stand-up (15 min).
2. Wekelijks: architectuur/security board (60 min).
3. Wekelijks: partner/integratie touchpoint (30 min).
4. Tweewekelijks: sprint review + planning (90 min).
5. Tweewekelijks: productboard.
6. Halfjaarlijks: klankbordgroep.

## 4. Budgetplanning (samengebracht)

### 4.1 Totaal financieel kader (Excel totalen)
1. Totale projectkosten: 2.433.589,54 EUR.
2. Netto te financieren saldo (NFS): 1.946.871,63 EUR.
3. Overige bijdragen/ontvangsten: 486.717,91 EUR.
4. NFS-aandeel van totale kosten: 80,0%.
5. Projectperiode begroting: 01/01/2026 - 30/06/2028.

### 4.2 Partnerverdeling (totaal)
| Partner | Totaal (EUR) |
|---|---|
| Stad Antwerpen | 1.806.538,97 |
| Stad Vilvoorde | 67.727,40 |
| Stad Brugge | 67.727,40 |
| Stad Kortrijk | 67.076,70 |
| Stad Sint-Niklaas | 47.804,25 |
| Athumi | 376.714,83 |

### 4.3 Indicatieve budgetverdeling uit subsidie-inspiratienota
1. Programma coordinatie/business: 1.000.000 EUR.
2. Technische lagen totaal: 1.400.000 EUR.
3. Laag 1: 750.000 EUR.
4. Laag 2: 400.000 EUR.
5. Laag 3: 250.000 EUR.

### 4.4 Operationele externe run-rate scenario's (mobiele varianten)
| Variant | Scenario | Extern per maand | Jaar 1 excl. hardware |
|---|---|---|---|
| iPad | Minimaal | 8 EUR | 1.035 EUR |
| iPad | Professioneel | 173 EUR | 3.015 EUR |
| Android | Minimaal | 0 EUR | 865 EUR |
| Android | Professioneel | 139 EUR | 2.533 EUR |

## 5. Vertaling in de app
1. Nieuwe hoofdtab: `DN Governance` in `src/App.tsx`.
2. Visualisatieblokken in de tab:
   1. operationele doorloop (vanaf 2026-03-20);
   2. 60-dagen traject;
   3. schillenplanning uit subsidie;
   4. grafische MS-tijdsbalk (enkel grote blokken);
   5. actieplannen;
   6. poorten en overlegcadans;
   7. contactmatrix projectorganisatie (rol, naam, e-mail, organisatie, groep);
   8. MH/NN scopebewaking;
   9. budgetdashboard + partnertabel;
   10. mobiele run-rate scenario's.
3. Doel: 1 centrale plek om projectdoorloop op te volgen en te communiceren.
4. `.md`-bronnen in de governanceblokken zijn klikbaar en openen in een aparte MD-viewer in de app.

## 6. Beheerafspraak
1. Na elk reviewmoment: update datum, status en beslissingen in deze masterfile.
2. Bij budgetwijziging: eerst Excel totalen aanpassen, daarna deze file en DN Governance tab.
3. Bij poortbeslissing: log in `EXECUTIEBOARD.md` en reflecteer in DN Governance tab.
