# ANALYSE & IMPLEMENTATIEPLAN
## Digitaal Beheerhandboek Objecten Publieke Ruimte v2.2

Datum: 13 januari 2026
Project: Zwitsers Zakmes - Digitale Werf en Digitale Nuts
Status: v2.2 terreinapp met beheersmodule en versiebeheer

---

## EXECUTIVE SUMMARY

De infofiche is omgebouwd van een statisch document naar een terreinapp die mensen op het terrein snel en gelijkgericht laat kijken. De v2.1 focust op snelheid, duidelijkheid en direct handelen:

- 13 objecttypen in een uniforme objectdatabase
- Terreincontext die elke melding vooraf invult
- Filters op categorie, beheerder, actie en kritische objecten
- Actie-chips per object voor snelle workflows
- Visuele hiarchie die werkt in felle buitenomstandigheden
- Beheersmodule voor live wijzigingen en nieuwe themas
- Versiebeheer v2.2 met wijzigingsdocumentatie

---

## ANALYSE VAN DE VORIGE VERSIE (v2.0)

### 1) Inhoudelijke zwaktes
- Geen terreincontext: meldingen startten telkens leeg
- Geen actie-filter: toezichters konden niet snel op verplaatsen of wegnemen focussen
- Geen kritische markering voor erfgoed of contractuele beperkingen
- Geen reset of filterstatus: onduidelijk waarom objecten verdwijnen

### 2) Tekst en data
- Onleesbare symbolen en emoji-afhankelijkheid
- Inconsistent taalgebruik en termen per actor
- Contact- en GIS-velden niet duidelijk gelabeld

### 3) Gebruik op het terrein
- Weinig ondersteuning voor korte beslismomenten
- Geen snelle actie-selectie per object
- Geen samenvatting van actieve filters

---

## VERBETERINGEN IN v2.2 (GEREALISEERD)

### 1) Terreincontext
- Project, locatie, zone, startdatum en urgentie bovenaan
- Context wordt automatisch meegegeven in elke melding

### 2) Snelheid en focus
- Actie-filters toegevoegd (verplaatsen, wegnemen, beschermen, nieuw plaatsen)
- Kritiek-toggle voor erfgoed en contracten
- Filterstatus die uitlegt waarom objecten zichtbaar of verborgen zijn
- Reset-knop om direct terug naar het volledige overzicht te gaan

### 3) Visuele kwaliteit
- Nieuwe typografie (Space Grotesk + Source Sans 3) en sterke contrasten
- Cards met duidelijke hierarchie en minimale ruis
- Actie-chips per object die direct het formulier klaarzetten

### 4) Datakwaliteit
- Opschoning van teksten en labels
- Gestandaardiseerde velden (actie, risico, bescherming, doorlooptijd)
- Kritieke objecten aangeduid (laadpalen, stolpersteine)

### 5) Antwerpen CSS behouden, maar pragmatisch gebruikt
- A-UI blijft gelinkt voor merkconsistentie
- Eigen componenten toegevoegd waar terreinwerking snelheid vereist

---

### 6) Beheersmodule voor data en teksten
- Centrale beheersmodule om objecten, teksten en themas te beheren
- Nieuw object toevoegen, bestaande objecten aanpassen of verwijderen
- Export en import van JSON voor back-up en samenwerking
- Lokaal opgeslagen wijzigingen voor terreinwerking zonder netwerk
 - Thema-bibliotheek met categorie, kleur en icoon
 - Wijzigingslog die lokale wijzigingen bijhoudt

## VERDER TE VERBETEREN (AANBEVOLEN)

1) Offline terreinmodus
- Bewaar context en meldingen lokaal (localStorage)
- Later syncen wanneer netwerk terug is

2) GIS integratie
- Deep link naar Stad in Kaart per objecttype
- Inlezen van objecten binnen een werfzone

3) Ticketing en workflows
- Integratie met ServiceNow of Teams meldingen
- Status tracking per melding (ingediend, gepland, uitgevoerd)

4) Mobiele hardware
- Camera capture en GPS in het formulier
- Grote knoppen en nog hogere contrasten voor zonlicht

5) Governance
- RACI en SLA review per kwartaal
- Duidelijke eigenaar per objecttype

---

## IMPLEMENTATIE ROADMAP (HERZIEN)

Q1 2026 (NU)
- v2.2 terreinapp online in HTML
- Data opgeschoond en standaardvelden toegepast
- Filters, kritieke markering en beheersmodule toegevoegd

Q2 2026
- User testing met toezichters en projectleiders
- Integratie met GIS en basis ticketing
- Eerste versie offline caching

Q3 2026
- Piloot met 3 projecten
- Training van alle toezichters
- Rapportages per beheerder en objecttype

Q4 2026
- PWA release met camera en GPS
- QR-codes op terreinobjecten
- Dashboard voor opvolging en SLA

2027
- Computer vision voor objectdetectie
- Automatische routing op basis van objecttype en actie
- Predictive analytics

---

## CONCLUSIE

v2.2 maakt van de infofiche een echte terreinapp: iedereen kijkt met dezelfde ogen naar de straat, met ruimte voor ieders verantwoordelijkheid. De beheersmodule zorgt dat data en teksten up-to-date blijven zonder code-wijzigingen.

---

CONTACT
- Team Toezicht: toezicht@antwerpen.be
- Digipolis: digitalewerf@digipolis.be
- Project Zwitsers Zakmes: herstellingopenbareruimte@antwerpen.be

Versie: 2.2 terreinapp
Laatst bijgewerkt: 13 januari 2026
Volgende review: 13 april 2026

2026 Stad Antwerpen - Digitale Werf / Digitale nuts Ecosysteem

---

## WIJZIGINGSDOCUMENTATIE v2.2

Datum: 13 januari 2026

1) Beheersmodule toegevoegd
- Centrale module om objectdata en teksten te bewerken
- Mogelijkheid om nieuwe themas en objecten toe te voegen
- Lokaal versiebeheer via opslag in de browser

2) Versiebeheer en export
- Export en import van JSON bestanden
- Standaarddata herstel mogelijk

3) Versie bump
- Titel en versie-info aangepast naar v2.2

---

## ARCHITECTUUR VOOR CENTRALE UPDATES (DOEL: 1 BRON VOOR IEDEREEN)

### Doelbeeld
Alle medewerkers werken met dezelfde objectdata en themas. Wijzigingen worden centraal beheerd en automatisch verspreid naar elke toestel. Lokaal opslaan blijft mogelijk voor offline werken, maar wordt gezien als tijdelijke buffer.

### Kernprincipes
1) Single Source of Truth (SSOT): 1 centrale bron voor objecten en themas  
2) Versiebeheer: elke wijziging verhoogt een centraal versienummer  
3) Auditlog: wie, wat en wanneer wordt bewaard  
4) Sync: app vergelijkt lokale versie met centrale versie en vernieuwt automatisch  
5) Offline first: lokale edits worden in wachtrij gezet en gesynchroniseerd zodra netwerk terug is  

---

## VOORGESTELDE ARCHITECTUUR

### Componenten
- Frontend: HTML/PWA (de huidige app), met sync-laag  
- Backend API: REST (Node.js of .NET)  
- Database: PostgreSQL  
- Auth: Azure AD (SSO)  
- Hosting: Azure App Service  
- Logging: auditlog + monitoring (App Insights)  

### Datamodel (minimaal)
```
objects(
  id, name, category, owner, leadTime, contact, phone, critical,
  description, exclusivity, risks, actions, protection, gisLayer,
  tags, quickActions, version, updatedAt, updatedBy
)

themes(
  id, name, category, color, icon, description, version, updatedAt, updatedBy
)

changes(
  id, targetType, targetId, action, payload, createdAt, createdBy, version
)

app_config(
  currentVersion, updatedAt
)
```

---

## API CONTRACT (CONCREET)

### Config en versies
```
GET /api/config
Response:
{
  "currentVersion": 23,
  "updatedAt": "2026-01-13T09:00:00Z"
}
```

### Objecten ophalen
```
GET /api/objects
Response: [ ... lijst van objecten ... ]
```

### Themas ophalen
```
GET /api/themes
Response: [ ... lijst van themas ... ]
```

### Wijziging indienen
```
POST /api/changes
Body:
{
  "targetType": "object",
  "targetId": 3,
  "action": "update",
  "payload": { ... gewijzigde velden ... }
}
Response:
{
  "ok": true,
  "newVersion": 24
}
```

---

## SYNC-FLOW (STAP VOOR STAP)

1) App start  
- GET /api/config  
- Vergelijk lokale versie met server versie  
- Indien ouder: fetch objecten + themas  

2) Gebruiker wijzigt iets  
- POST /api/changes met payload  
- Server valideert, schrijft naar DB, verhoogt versie  

3) Andere toestellen  
- Pollen elke X minuten op /api/config  
- Bij nieuwe versie: refetch data  

4) Offline scenario  
- Wijzigingen lokaal in queue (localStorage of IndexedDB)  
- Zodra netwerk terug is: queue doorsturen  

---

## VERSIEBEHEER STRATEGIE

### Versienummering
- currentVersion in app_config  
- elke wijziging verhoogt versie  
- app houdt lokale versie bij  

### Auditlog
Elke wijziging schrijft naar changes:\n
- Wie (Azure AD user)  
- Wat (payload)  
- Wanneer  

---

## IMPLEMENTATIEPAD (PRAKTISCH)

### Fase 1 (2-4 weken)
- API + database opzetten  
- Config + object + theme endpoints  
- Export/import bestaande JSON data  

### Fase 2 (4-6 weken)
- Sync laag in de app  
- Auth met Azure AD  
- Logging en versiebeheer  

### Fase 3 (6-8 weken)
- Offline queue (IndexedDB)  
- Conflictresolutie (laatste schrijft of review)  
- Beheersrechten (rollen)  

---

## RISICOS EN AANDACHTSPUNTEN

- Governance: wie mag wijzigen?  
- Validatie: verplichte velden moeten bewaakt worden  
- Conflicten: tegelijk wijzigen door meerdere beheerders  
- Auditplicht: wijzigingen moeten traceerbaar zijn  

---

## CONCLUSIE

Met deze architectuur is de beheersmodule klaar voor centrale updates, zonder de terreinwerking te verliezen. De app blijft snel en offline-robust, maar haalt altijd de juiste data zodra netwerk beschikbaar is.
