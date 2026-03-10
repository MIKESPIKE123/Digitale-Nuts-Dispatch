# Quick Guide - Dispatcher

Datum: 2026-03-06  
Doel: dagplanning stabiel houden en dossiers correct toewijzen.

## 1. Snelstart
1. Controleer dat de dispatchdatum op de juiste werkdag staat.
2. Vertrek standaard van `VERGUND` + `IN EFFECT`; gebruik `VERGUNNING VERLOPEN` alleen als expliciete uitzonderingsfilter.
3. Zet district-, bron-, categorie- en impactfilters bewust.
4. Controleer toegewezen en niet-toegewezen dossiers.
5. Gebruik action cards + kaart om conflicten/clustering te zien.
6. Volg handover- en syncstatus op in de dag.

## 2. Waar let je operationeel op?
1. Niet-toegewezen verplichte dossiers eerst oplossen.
2. Werkdruk over toezichters spreiden.
3. Bij NOK: zorgen dat opvolging duidelijk gelogd staat.
4. Controleer de mix vergunningcontext: dossiers met vergunningcontext moeten zichtbaar voorrang krijgen, maar operationele opvulling zonder vergunningcontext blijft mogelijk.

## 3. Nieuw in v1.6 (dagelijks gebruiken)
1. Toewijzingsarchief (`DN Data & Sync`):
   - bekijk per dispatchdatum toegewezen bezoeken, manuele overrides en dekkingsgraad t.o.v. vaststellingen;
   - exporteer periodiek met `Exporteer archief (.json)`.
2. Import/export inspecteurinstellingen (`DN Instellingen`):
   - gebruik `Exporteer toezichters (.json)` als back-up;
   - gebruik `Importeer toezichters (.json)` om config over te zetten naar andere lokale instantie.
3. Vaststelling starten vanuit kaartpopup:
   - `Open bestaand verslag` opent bestaand record;
   - `Nieuw verslag` start meteen een nieuwe draft met contextprefill.
4. Extra context in action cards:
   - klikbare ReferentieID/A-SIGN en GIPOD-link;
   - zichtbare toewijzingsrol (`Dedicated/Backup/Reserve`) en manuele override-info.

## 4. Einde van je dag
1. Controleer of queue `failed` items bevat.
2. Zorg dat open acties aan owner en timing gekoppeld zijn.
3. Rapporteer korte dagstatus naar projectleider.

## 4bis. Nieuw na v1.6
1. Gebruik `Routevoorstel tonen` om verplaatsingen per toezichter sneller te beoordelen.
2. Schakel tussen standaardkaart, `GRB Grijs`, `GRB Kleur` en `Luchtfoto` voor extra terreincontext.
3. Volg urgente GIPOD-notificaties op in het dispatch-actieblok.
4. Gebruik impactbadges (`LAAG/MIDDEL/HOOG`) als extra prioriteringssignaal.

## 5. 6 meest gemaakte fouten
1. Met een oude datum blijven werken.
2. Te strikte filters gebruiken waardoor dossiers verdwijnen.
3. Niet controleren of dossiers met vergunningcontext effectief eerst aan bod kwamen.
4. Niet-toegewezen lijst niet expliciet nalopen.
5. Alleen kaart of alleen cards gebruiken in plaats van beide.
6. Geen opvolging doen op failed sync, ontbrekende handover of niet-geexporteerd toewijzingsarchief.
