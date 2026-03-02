# Quick Guide - Dispatcher

Datum: 2026-02-27  
Doel: dagplanning stabiel houden en dossiers correct toewijzen.

## 1. Snelstart
1. Controleer dat de dispatchdatum op de juiste werkdag staat.
2. Zet status-, district- en impactfilters bewust.
3. Controleer toegewezen en niet-toegewezen dossiers.
4. Gebruik action cards + kaart om conflicten/clustering te zien.
5. Volg handover- en syncstatus op in de dag.

## 2. Waar let je operationeel op?
1. Niet-toegewezen verplichte dossiers eerst oplossen.
2. Werkdruk over toezichters spreiden.
3. Bij NOK: zorgen dat opvolging duidelijk gelogd staat.

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

## 5. 5 meest gemaakte fouten
1. Met een oude datum blijven werken.
2. Te strikte filters gebruiken waardoor dossiers verdwijnen.
3. Niet-toegewezen lijst niet expliciet nalopen.
4. Alleen kaart of alleen cards gebruiken in plaats van beide.
5. Geen opvolging doen op failed sync, ontbrekende handover of niet-geexporteerd toewijzingsarchief.
