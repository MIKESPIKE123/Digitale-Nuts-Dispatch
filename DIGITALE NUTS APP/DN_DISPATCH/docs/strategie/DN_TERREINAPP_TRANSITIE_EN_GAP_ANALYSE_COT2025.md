# DN Terreinapp - Transitie en Gap-analyse (COT 2025)

Datum: 2026-03-01  
Status: Analyse v1  
Doel: de huidige DN Dispatch desktopbasis vertalen naar een eenvoudige, offline-first terreinapp ("digitaal zakmes") voor toezichters.

## 1. Bronnen

- `docs/uitvoering/CITY_OF_THINGS_2025_VOORAANMELDING_BRONTEKST.txt`
- `docs/IPAD_APP_EVALUATIE.md`
- `docs/ANDROID_APP_EVALUATIE.md`
- `docs/techniek/ARCHITECTUUR_DATAONTSLUITING_VASTSTELLINGEN.md`
- `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`
- `src/modules/vaststelling/*`

## 2. Kernconclusie

De huidige DN Dispatch-app is een sterke desktop- en governancebasis, maar nog geen volwaardige terreinapp.

1. Sterk: vaststellingsflow, offline queue, sync, GIPOD-context, KPI-fundament.
2. Zwak: mobiele eenvoud, native camera/GPS-flow, offline kaartlagen, snelle terreinrapportering.
3. Richting: maak een expliciet "DN Terrein"-spoor met role-based UI en offline-first defaults.

## 3. Match met COT-uitdagingen

| COT-uitdaging | Huidige dekking in DN | Gap | Beslissing |
|---|---|---|---|
| Mobiele toezichtapp als digitaal zakmes | Deel van `DN Vaststelling` bestaat | UI nog te desktop-gericht, te veel schermcomplexiteit | Maak aparte `DN Terrein` modus |
| Offline-first vaststellingen | Queue + sync + IndexedDB aanwezig | Geen volledige offline GIPOD-zoekflow/kaartcache | Offline data-pack + kaartcache toevoegen |
| Fotodocumentatie als juridisch bewijs | Foto-evidence + hash + PDF-sectie aanwezig | Native camera/EXIF/blur/annotatie niet sterk genoeg | Foto-pipeline versterken (native + QA-regels) |
| Rapportering/KPI naar procesverbetering | KPI-engine aanwezig, rapportenplan bestaat | Rapporten-view en datasets nog niet live v1 | Rapporten backlog versneld activeren |
| Koppeling met diverse backends | Contract-first architectuur gestart | Adapterstrategie per stad/legacy nog niet expliciet | Canonieke API + city adapters formaliseren |

## 4. Hoe desktop nu bruikbaar maken op terrein (zonder rewrite)

## 4.1 Snelle terreinmodus (2 sprints)
1. Voeg een expliciete `Terreinmodus` toe met alleen:
- Mijn opdrachten vandaag
- Vaststelling starten/vervolgen
- Foto's nemen en opladen
- Melding/briefing versturen
- Syncstatus en retries
2. Verberg niet-noodzakelijke tabs voor toezichters (Governance, budget, roadmap, enz.).
3. Gebruik grote touch-controls (48px+), minder tekst, meer stap-voor-stap flow.
4. Zet standaard focus op actieve toezichter en diens open dossiers.
5. Maak 1 "noodpaneel": offline-status, wachtrij, laatste sync, foutmelding.

## 4.2 Terrein-opzoekingen (MVP)
1. Snelle zoeking op `GIPOD-ID`, straat/huisnummer en dossier-ID.
2. Toon overlap "wat ligt hier nog open?" op basis van lokale cache.
3. Voeg 1-click contextacties toe:
- open GIPOD bron
- bel/mail contact
- maak melding met voorgevulde context

## 5. Wat ontbreekt voor de ideale terreinapp ("Zwitsers zakmes")

## 5.1 Product en UX
1. Rolgebaseerde journey per persona (Toezichter, SPOC, Stadsaannemer).
2. Maximum 5 hoofdacties op terrein; alle rest in backoffice.
3. Korte workflows met progressie-indicator en autosave per stap.

## 5.2 Offline en sync
1. Volwaardige offline read-cache van werkcontext (niet enkel recordqueue).
2. Deterministische conflictregels bij parallelle updates.
3. Dagelijkse "safe backup" export voor operationele zekerheid.

## 5.3 Foto- en bewijsketen (prioriteit hoog)
1. Native captureflow (camera API) in plaats van alleen browser file picker.
2. Verplichte EXIF metadata (tijd, GPS, richting) + kwaliteitscheck.
3. Privacy by design: blur (personen/nummerplaten) voor upload.
4. Annotatie op foto (pijlen/markeringen) voor snellere herstelinstructies.
5. Media outbox met resumable upload en netwerkherstel.

## 5.4 Rapportering en KPI
1. Activeer `RPT-US-001..006` (dag/week/export) als productieflow.
2. Maak KPI's direct bruikbaar per nutsbedrijf/aannemer met trend en benchmark.
3. Voeg "procesverbeterkaart" toe: top 5 structurele oorzaken en doorlooptijdverlies.

## 5.5 Integratiebreedte (juryvraag legacy backends)
1. Werk met 1 canoniek DN API-contract.
2. Bouw per stad/partner een dunne adapterlaag (`adapter-<stad>`).
3. Houd datadoorstroming uniform via OSLO-profiel + validatiegateway.

## 6. Voorstel gefaseerd pad (terrein-focus)

## Fase T0 - Stabiliseren op huidige code (0-4 weken)
1. Terreinmodus in bestaande app.
2. Touch-first layout en snelle navigatie.
3. Operationele sync/status HUD.

## Fase T1 - Bewijsketen en offline read (4-8 weken)
1. Foto-pipeline v2 (native capture, blur, EXIF-validatie).
2. Offline werkcontext-cache + lokale GIPOD-contextzoeking.
3. Basis rapporten live (dag/week/export).

## Fase T2 - Terreinapp shell (8-12 weken)
1. Capacitor shell (iPad/Android) met gedeelde codebase.
2. Device-permissies, biometrie en MDM-ready distributie.
3. Offline kaartpakketten (gebiedsgericht) en fallback-search.

## Fase T3 - Verbeterlus en opschaling (12+ weken)
1. KPI feedbackloop per nutsbedrijf/aannemer.
2. Integratie met meldingen/signalisatie en partnerportalen.
3. Opschaling naar extra steden via adapter- en governancekader.

## 7. Concrete input die nog nodig is

1. Definitie van "must-have terreinflow" (maximaal 5 acties) voor toezichters.
2. Hardwarekeuze per doelgroep: iPad, Android of beide.
3. Juridische keuzes:
- bewaartermijn foto's
- bewijsniveau (minimale metadata)
- blur verplicht of conditioneel
4. Prioritaire KPI-set voor nutsbedrijven/aannemers (v1 top 8).
5. Integratieprioriteit na GIPOD read:
- eerst meldingen
- eerst signalisatie
- eerst herstel/retributie
6. Roltoewijzing voor snelle realisatie:
- Product owner terrein
- UX lead terrein
- Integratie lead
- Data/KPI owner

## 8. Besluit

DN Dispatch kan de desktop- en governancekern blijven, maar het terrein vraagt een afgeslankte, taakgestuurde ervaring.  
De snelste route is geen volledige herbouw, wel:

1. een strikte terreinmodus op de huidige code;
2. een sterke foto/sync-bewijsketen;
3. een gecontroleerde overgang naar een native shell voor robuuste field-operatie.

## 9. Reeds bevestigde keuzes (2026-03-01)

1. 5 must-have terreinacties:
- Mijn werk
- Vaststelling
- Foto
- Melding
- Sync
2. Toestelstrategie:
- iPad first
- Android volgt later
3. Foto-principe:
- foto's moeten doorstromen naar GIPOD-gekoppelde data zodat ze zichtbaar/bruikbaar zijn voor partners.
4. KPI-principe:
- KPI-set wordt primair afgeleid uit het vaststellingsverslag.
