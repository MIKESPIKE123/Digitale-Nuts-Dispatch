# DIGITALE NUTS – REFERENTIEARCHITECTUUR v1.0  
Status: Conceptueel geconsolideerd  
Doel: Interne en interstedelijke positionering  
Context: City of Things – GIPOD-gebaseerde toezichtarchitectuur  

---

# 1. Doel van dit document

Dit document consolideert de reeds aanwezige architectuurprincipes binnen Digitale Nuts.

Het doel is:

- Het bestaande denkwerk expliciet te maken  
- De gelaagde structuur zichtbaar te maken  
- De positionering t.o.v. GIPOD en OSLO te verankeren  
- De MVP helder af te bakenen  
- Voorbereiding op latere optimalisatielagen mogelijk te maken  

Dit is géén technisch implementatiedossier.  
Dit is een referentiearchitectuurkader.

---

# 2. Architectuurvisie in één zin

Digitale Nuts is een gelaagde toezichtarchitectuur bovenop GIPOD, waarbij data, verrijking, besluitvorming en UI strikt gescheiden zijn, en optimalisatielagen modulair kunnen worden toegevoegd.

---

# 3. Gelaagde Architectuur

## Overzicht (schematisch)

------------------------------------------------------------
|  Laag 5 – Optimalisatielagen (Schil 3 – toekomstgericht) |
|  (AI, adaptieve cadans, patroonanalyse, copilots)        |
------------------------------------------------------------
|  Laag 4 – Presentatie & Interactie (UI / VIBE)           |
------------------------------------------------------------
|  Laag 3 – Beslissings- & Prioriteringslaag               |
|  (Impact scoring, dispatch, conflict detection)          |
------------------------------------------------------------
|  Laag 2 – Dataverrijking & Pipeline                      |
|  (Normalisatie, geocoding, impactberekening)             |
------------------------------------------------------------
|  Laag 1 – Datafundament & Standaardisatie                |
|  (GIPOD, OSLO, uniforme API-ontsluiting)                 |
------------------------------------------------------------

---

# 4. Laag 1 – Datafundament & Standaardisatie

## 4.1 GIPOD als ruggengraat

GIPOD is de centrale ontsluitingslaag voor:

- Werfinformatie
- Tijdslijnen
- Nutsmaatschappijen
- Locatiegegevens

Architectuurprincipe:

- Geen parallelle lokale datastructuren
- Uniforme ontsluiting via API
- Herbruikbaar voor alle Vlaamse gemeenten

GIPOD fungeert als backbone waarop Digitale Nuts bouwt.

---

## 4.2 OSLO als semantische standaard

OSLO-principes zorgen voor:

- Eenduidige begrippen (werf, vaststelling, status, aannemer)
- Interoperabiliteit tussen steden
- Vermijdbare datavervuiling

Semantische interoperabiliteit is een basisvoorwaarde voor schaalbaarheid.

---

# 5. Laag 2 – Datapipeline & Verrijking

Deze laag transformeert ruwe gegevens naar bruikbare toezichtdata.

## Pipeline-logica

Import  
→ Normalisatie  
→ Geocoding  
→ Impactverrijking  
→ JSON-output  

Belangrijk principe:

Businesslogica bevindt zich buiten de UI.  
De verrijking gebeurt vóór presentatie.

Dit maakt:

- Testbaarheid
- Herbruikbaarheid
- Latere uitbreidbaarheid mogelijk

---

# 6. Laag 3 – Beslissings- & Prioriteringslaag

Dit is de kern van de toezichtarchitectuur.

## 6.1 Impactmodel

Gewogen formule met meerdere dimensies (bv. dichtheid, verkeer, gevoeligheid, maatschappelijke impact).

Resultaat:

- Objectieve prioriteitsdelta
- Transparante scoring
- Reproduceerbare logica

---

## 6.2 Dispatch-algoritme

Multi-factor scoring op basis van:

- Postcode-affiniteit
- Continuïteit
- Afstand
- Werkdruk
- Soft/hard limieten

Eigenschappen:

- Inspector continuity (persistente toewijzing)
- Conflict detection
- Aanbevolen acties

Deze laag is gescheiden van de UI.

---

# 7. Laag 4 – Presentatie & Interactie (VIBE-app)

De UI is een projectielaag van berekende logica.

Principes:

- Impact wordt visueel getoond (badges, filters)
- Kaart en planning zijn gesynchroniseerd
- Gebruiker ziet beslissingscontext

Belangrijk:

De UI stuurt geen logica aan.  
Ze toont verrijkte informatie.

De huidige VIBE-app functioneert als:

- Werkend prototype
- Referentie-implementatie van de architectuur
- MVP-startpunt

---

# 8. Laag 5 – Optimalisatielagen (Schil 3 – toekomstgericht)

Deze laag is voorbereid, maar niet onderdeel van de MVP.

Mogelijke uitbreidingen:

- Adaptieve bezoekscadans
- Routeoptimalisatie
- Patroonanalyse
- NLP op vaststellingsnotities
- Fotoanalyse
- Dispatch-copilot

Belangrijk principe:

Optimalisatie mag nooit het fundament destabiliseren.  
AI is een optionele bovenlaag, geen kernlaag.

---

# 9. MVP-afbakening

De MVP omvat:

- GIPOD-gebaseerde dataontsluiting
- Gestabiliseerde VIBE-app
- Impact scoring
- Dispatchlogica
- Basisrapportage
- Integratie via gateway-structuur

Niet in MVP:

- Zelflerende modellen
- Multi-dag optimalisatie
- Geautomatiseerde fotoanalyse
- Conversatie-interface

---

# 10. Integratieprincipes

## Gateway-pattern

Externe systemen worden benaderd via abstractielaag:

- GIPOD
- A-SIGN
- KLM

Geen hardgekoppelde integraties.

Dit maakt:

- Vervangbaarheid
- Testbaarheid
- Schaalbaarheid

---

# 11. Governanceprincipes

1. Data-eigenaarschap blijft bij bron  
2. GIPOD is structurele ontsluiting  
3. Gemeenten behouden autonomie  
4. Architectuur > toolkeuze  
5. Optimalisatie volgt stabilisatie  

---

# 12. Positionering

Digitale Nuts is:

- Geen SaaS-product
- Geen Antwerps experiment
- Geen AI-project

Het is:

Een uniforme toezichtarchitectuur bovenop GIPOD,  
met modulair uitbreidbare optimalisatielagen.

---

# 13. Conclusie

Er is reeds:

- Een datafundament  
- Een verrijkingslaag  
- Een beslissingsengine  
- Een werkende UI  
- Een integratiepatroon  

Wat nodig is:

- Consolidatie
- Interstedelijke validatie
- Governanceverankering

Niet: heruitvinding.