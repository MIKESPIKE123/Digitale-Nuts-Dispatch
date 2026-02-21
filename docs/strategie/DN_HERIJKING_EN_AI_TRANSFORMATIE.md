# DN_DISPATCH – Herijking & AI-Transformatieanalyse

Versie: 1.0  
Status: Strategische herpositionering  
Context: Doorontwikkeling Digitale Nuts na prototypingfase

---

# 1. Twee verhaallijnen

Digitale Nuts bevindt zich niet meer in een klassieke opstartfase.  
Er lopen vandaag twee parallelle verhaallijnen die strategisch op elkaar moeten worden afgestemd:

## Verhaallijn 1 — Vernieuwde Start (Architecturale Herijking)

Het oorspronkelijke subsidieproject vertrok vanuit een klassiek model:

analyse → ontwerp → ontwikkeling → implementatie

Sindsdien is:

- De AI-context fundamenteel gewijzigd
- Interne prototyping (DN_DISPATCH) ver gevorderd
- Domeinkennis reeds verankerd in code
- UI- en scoringlogica gevalideerd
- Integratiestructuur voorbereid

Digitale Nuts is geen nulstart meer.

De kernvraag is niet langer:
> “Hoe bouwen we een tool?”

Maar:
> “Hoe positioneren we een intelligente toezichtarchitectuur?”

---

## Verhaallijn 2 — AI Mogelijkheden als Kernlaag

AI is geëvolueerd van “derde schil” (fotoherkenning) naar structurele architectuurlaag.

DN_DISPATCH toont aan dat:

- Scoringlogica reeds modulair is opgebouwd
- Impactmodellering aanwezig is
- Dispatch-algoritme uitbreidbaar is
- Gateway-pattern AI-integraties mogelijk maakt

AI is geen add-on meer.
AI wordt een strategische optimalisatielaag bovenop het dataplatform.

---

# 2. Evaluatie DN_DISPATCH

## 2.1 Sterke punten

| Aspect | Beoordeling |
|--------|------------|
| Architectuur | Uitstekend gescheiden: domeinlogica in `lib/*`, UI in `components/*`, config in `config/*`. Goed testbaar en uitbreidbaar. |
| Dispatch-algoritme | Solide multi-factor scoring (postcode-affiniteit, continuïteit +340, afstand, werkdruk). Soft/hard limieten (5/6). |
| Impact scoring | Gewogen formule met 4 dimensies: 0.35d + 0.30v + 0.20s + 0.15m. Levert directe prioriteitsdelta. |
| Decision engine | Gelaagd scoringsmodel (0–100) met conflict detection, aanbevolen acties en operationele inzichten. |
| Inspector continuity | localStorage-persistentie van eerste toewijzing → sticky bonus voor consistent toezicht. |
| Integratielaag | Gateway-pattern met mock/API toggle via Vite flags – klaar voor live koppelingen. |
| Data pipeline | Geautomatiseerde import → normalisatie → geocoding → impactverrijking → JSON output. |

Conclusie:  
De architectuur is AI-ready en modulair uitbreidbaar zonder structurele herbouw.

---

## 2.2 Beperkingen

| Beperking | Impact |
|------------|--------|
| Nearest-neighbor routing | Geen echte wegafstanden, geen verkeer, geen tijdvensters |
| Vaste bezoekscadans | Elke 2 werkdagen ongeacht risico |
| Statische gewichten | Impact/dispatch leert niet van uitkomsten |
| Geen multi-dag planning | Enkel dag-per-dag dispatch |
| Mock integraties | Geen live GIPOD/A-SIGN/klachtenkoppeling |
| Geen historische analyse | Geen feedback-loop naar planning |

Deze beperkingen vormen directe AI-kansen.

---

# 3. AI-verbetermogelijkheden

Van quick wins naar transformationeel.

---

## 3.1 Adaptive Visit Scheduling

### Probleem
Vaste cadans (2 werkdagen) is inefficiënt.

### AI-oplossing
Supervised learning model getraind op:
- NOK-ratio
- Aannemer-track record
- Werftype
- Impactzone

### ROI
- 20–30% minder onnodige bezoeken
- Snellere detectie risicowerven

### Implementatie
Nieuwe module:
`src/lib/adaptiveCadence.ts`

---

## 3.2 AI-gestuurde Routeoptimalisatie

### Probleem
Nearest-neighbor levert 15–25% langere routes.

### Oplossing

**Korte termijn**
- OR-Tools (Google)
- VROOM (VRP solver)

**Lange termijn**
- ML-verkeersvoorspelling per tijdslot

### ROI
7 inspecteurs × 5 bezoeken/dag → directe tijdswinst.

---

## 3.3 NLP op Vaststellingsnotities

### Probleem
Vrije tekst wordt niet gestructureerd benut.

### AI-oplossing
LLM-extractie voor:

- NOK-classificatie
- Ernst-inschatting
- Aannemer-patronen
- Automatische samenvatting

### Implementatie
- Lokaal LLM (Ollama / llama.cpp)
- Azure OpenAI API

---

## 3.4 Predictief Impactmodel

### Probleem
Statische gewichten (0.35/0.30/0.20/0.15) leren niet.

### Oplossing
- Auto-kalibratie gewichten
- Correlatie met klachten/incidenten
- Anomaly detection op GIS-data
- Seizoensgebonden dynamiek

---

## 3.5 Klachtencorrelatie & Proactieve Escalatie

### Probleem
ComplaintsGateway is mock; geen correlatie met dispatch.

### AI-oplossing
Pattern recognition:

- Aannemer × werftype × zone
- Predictieve verhoging inspectiecadans

---

## 3.6 AI Dispatch Copilot

### Probleem
Dispatcher moet manueel interpreteren.

### Oplossing
Conversationele interface (RAG):

Voorbeelden:
- “Welke werven in 2060 hebben hoogste prioriteit?”
- “Wat is de werkdruk volgende week bij KD?”
- “NOK-patroon Fluvius dit kwartaal?”

### Implementatie
RAG over:
- works.generated.json
- vaststellingsdata
- impactprofielen

---

## 3.7 Foto-analyse

### Probleem
Foto’s zonder automatische analyse.

### AI-oplossing
Computer vision:

- Detectie ontbrekende signalisatie
- Open putten
- Herstelkwaliteit
- Voor/na vergelijking

---

## 3.8 Multi-dag Planning met Reinforcement Learning

### Probleem
Geen weekoptimalisatie.

### AI-oplossing
RL-agent optimaliseert:

- Totale reistijd over 5 dagen
- Workload-balans
- Buffer voor urgente inspecties

---

# 4. Implementatie-roadmap

| Fase | Component | Complexiteit | Impact |
|------|-----------|--------------|--------|
| Fase 1 | OR-Tools routing | Middel | Reistijd −20% |
| Fase 1 | NLP notitie-analyse | Laag-Middel | Datakwaliteit ↑↑ |
| Fase 2 | Adaptive cadence | Middel-Hoog | Efficiëntie +25% |
| Fase 2 | Impact auto-kalibratie | Middel | Prioriteit ↑ |
| Fase 3 | AI Dispatch Copilot | Hoog | UX-transformatie |
| Fase 3 | Foto-analyse | Hoog | Automatische conformiteit |
| Fase 4 | Multi-dag RL planning | Zeer hoog | Volledige optimalisatie |
| Fase 4 | Klachtencorrelatie | Middel | Proactief toezicht |

---

# 5. Strategische Conclusie

DN_DISPATCH heeft:

- Een sterke modulaire architectuur
- Heldere domeinlogica
- Een uitbreidbare integratielaag
- AI-compatibele structuur

De grootste ROI ligt in:

1. Adaptive visit cadence  
2. Routeoptimalisatie  
3. NLP op vaststellingsnotities  

De gateway-architectuur maakt het mogelijk om AI-services als losse modules toe te voegen zonder bestaande code te breken.

Digitale Nuts evolueert daarmee van:

"registratie & dispatch tool"

naar:

"intelligente toezichtinfrastructuur met adaptieve optimalisatie"

---

# 6. Positionering

Digitale Nuts is geen klassiek SaaS-project.

Het is een:

AI-native toezichtarchitectuur  
met schaalpotentieel voor Vlaanderen.
