# Evaluatie: Van DN_DISPATCH naar Standalone iPad App voor Toezichters

Datum: 2026-02-21  
Status: Geanalyseerd  
Git-baseline tag: `v1.5-pre-css`  
Repository: `https://github.com/MIKESPIKE123/Apps.git`

Dit document evalueert de huidige `DN_DISPATCH` webapplicatie en beschrijft de mogelijkheden en vereisten om hieruit een afgeleide, standalone iPad-app te bouwen voor toezichters op het terrein. 

De gekozen technologische strategie is **Capacitor**, waarmee we de bestaande React/Vite codebase kunnen "wrappen" in een native iOS-container. Dit biedt de snelste time-to-market met maximaal hergebruik van code, terwijl we toch toegang krijgen tot native iPad-hardware.

---

## 1. Huidige Status: Wat is er al bruikbaar?

De huidige architectuur is zeer geschikt als fundament voor een hybride app:

*   **Modulaire React/Vite Stack:** De scheiding tussen UI (`src/components`) en domeinlogica (`src/lib`) maakt het eenvoudig om de app in een Capacitor-schil te draaien.
*   **Vaststellingsmodule:** De contracten (`src/modules/vaststelling/contracts.ts`) en de initiële offline-first sync logica (`src/modules/vaststelling/storage.ts`) zijn al ontworpen met een instabiele netwerkverbinding in het achterhoofd.
*   **Sync Queue:** Er is al een mechanisme (`DNVaststellingSyncItem`) om acties te bufferen en later naar de server te sturen.
*   **Kaartweergave:** MapLibre GL JS wordt gebruikt, wat in theorie ondersteuning biedt voor offline vector tiles.

---

## 2. Ontbrekende Elementen: Wat mankeert er nog?

Om van de huidige webversie een robuuste, native aanvoelende iPad-app voor buitengebruik te maken, moeten de volgende elementen worden toegevoegd of aangepast:

### A. Robuuste Offline Opslag (Data & Media)
*   **Huidige situatie:** De app gebruikt `localStorage` (limiet ~5-10MB), wat onvoldoende is voor het cachen van honderden dossiers en hoge-resolutie foto's.
*   **Oplossing:** Migratie naar **IndexedDB** (via bibliotheken zoals Dexie.js) of een **Capacitor SQLite plugin**. Dit is cruciaal voor het lokaal opslaan van `works.generated.json`, impactprofielen en vooral de `DNVaststellingPhotoEvidence` (foto's).

### B. Native Hardware Integratie
*   **Camera & Foto's:** De huidige web-gebaseerde file picker of HTML5 camera is niet betrouwbaar genoeg voor professioneel gebruik. We hebben de **Capacitor Camera API** nodig voor:
    *   Hoge resolutie foto's.
    *   Direct inlezen van EXIF-data (GPS-coördinaten, timestamp, richting).
    *   Compressie op het toestel zelf vóór opslag/upload.
*   **Locatievoorzieningen (GPS):** De HTML5 Geolocation API is vaak traag of onnauwkeurig. De **Capacitor Geolocation API** biedt betere nauwkeurigheid, achtergrond-tracking (indien nodig voor routering), en kompas-integratie.

### C. iPad-specifieke UX/UI (Terrein-optimalisatie)
*   **Outdoor Leesbaarheid:** Toezichters werken buiten in de zon. De UI heeft een hoog-contrast modus nodig en ondersteuning voor de native iOS Dark/Light mode.
*   **Touch & Ergonomie:** Knoppen en interactiegebieden moeten groter worden gemaakt voor gebruik met werkhandschoenen of een Apple Pencil/stylus.
*   **Schermbenutting (Master-Detail):** Een iPad heeft een groot scherm. In plaats van mobiele "stack" navigatie (scherm na scherm), moet de UI evolueren naar een Master-Detail view (bijv. lijst met werven links, details en kaart rechts).

### D. Offline Kaartmateriaal
*   **Huidige situatie:** MapLibre haalt tiles live op van het internet.
*   **Oplossing:** Implementatie van een offline tile-server mechanisme of het lokaal cachen van `.mbtiles` / GeoJSON bestanden voor de regio Antwerpen, zodat de kaart bruikbaar blijft in gebieden met slechte 4G/5G dekking.

### E. Security & Authenticatie
*   **SSO Integratie:** Koppeling met het identiteitsbeheer van Stad Antwerpen (OAuth2/OIDC) via een native in-app browser (Capacitor Browser API) voor veilige login.
*   **Biometrie:** Toevoegen van FaceID / TouchID (via Capacitor Biometrics) zodat toezichters na een sessie-timeout snel en veilig opnieuw kunnen inloggen zonder hun wachtwoord op het terrein te moeten typen.

---

## 3. Stappenplan (Roadmap naar iPad App)

### Fase 1: Proof of Concept (Capacitor Wrap)
1. Installeer `@capacitor/core`, `@capacitor/cli` en `@capacitor/ios`.
2. Initialiseer Capacitor in het Vite-project.
3. Bouw de huidige web-app en genereer het Xcode-project.
4. Test de basisfunctionaliteit op een fysieke iPad.

### Fase 2: Native Features & Storage
1. Vervang `localStorage` door IndexedDB/SQLite voor de vaststellings- en sync-modules.
2. Integreer de Capacitor Camera plugin voor het nemen van foto's bij vaststellingen.
3. Integreer de Capacitor Geolocation plugin voor nauwkeurige locatiebepaling.

### Fase 3: UX Optimalisatie & Offline Maps
1. Pas de CSS/Tailwind aan voor iPad-specifieke layouts (Master-Detail).
2. Implementeer hoog-contrast thema's voor outdoor gebruik.
3. Onderzoek en implementeer offline caching voor MapLibre GL.

### Fase 4: Security & Distributie
1. Implementeer OAuth login en FaceID.
2. Configureer de app voor distributie via Apple Business Manager (MDM) voor de iPads van Stad Antwerpen.
3. Test push-notificaties (indien gewenst voor dringende dispatch-wijzigingen).

---

## 4. Externe Kostenstructuur (Productie & Maandelijks Onderhoud)

> **Scope:** Enkel externe, terugkerende kosten. Ontwikkeltijd is uitgesloten (VS Code + Copilot/Codex).  
> **Valuta:** EUR, prijzen excl. BTW tenzij anders vermeld.  
> **Aannames:** 7 iPads (1 per toezichter), ~500 actieve dossiers, ~2.000 foto's/maand.

---

### A. Eenmalige Productiekosten (go-live)

| Post | Detail | Kostenindicatie |
|---|---|---|
| **Apple Developer Program** | Enterprise of organisatie-account (jaarlijks, maar vereist bij go-live) | €99/jaar (~€8/maand) |
| **Apple Business Manager (ABM)** | Gratis voor organisaties – vereist D-U-N-S nummer | €0 |
| **MDM-licentie (Jamf/Mosyle)** | Device management voor 7 iPads – Mosyle Business gratis tot 30 devices, Jamf Now ~€4/device/maand | €0 – €28/maand |
| **Code Signing Certificate** | Inbegrepen in Apple Developer Program | €0 |
| **SSL-certificaat backend** | Let's Encrypt (gratis) of via Digipolis infra | €0 |
| **Initiële tile-cache Antwerpen** | Eenmalig downloaden OpenStreetMap tiles regio Antwerpen (~2GB) via gratis bronnen (OpenFreeMap/Protomaps) | €0 |

**Eenmalig totaal: ~€99** (Apple Developer jaarlidmaatschap)

---

### B. Maandelijkse Externe Kosten (Productie)

#### B1. Hosting & Backend

| Service | Optie A (minimaal) | Optie B (professioneel) | Toelichting |
|---|---|---|---|
| **Backend API hosting** | Digipolis interne infra | Azure App Service B1 | €0 (intern) / ~€12/maand (Azure) |
| **Database (sync/vaststellingen)** | SQLite on-device + JSON-file sync | Azure Cosmos DB (serverless) of Supabase Free | €0 (file-based) / ~€5–25/maand |
| **Blob storage (foto's)** | Digipolis fileserver | Azure Blob Storage (~50GB, hot tier) | €0 (intern) / ~€1–2/maand |
| **CDN voor tile-serving** | Niet nodig (offline-first) | Cloudflare Free plan | €0 |

#### B2. Kaartdiensten

| Service | Kosten | Toelichting |
|---|---|---|
| **MapLibre GL JS** | €0 | Open source, geen licentiekosten |
| **OpenFreeMap / Protomaps tiles** | €0 | Gratis self-hosted of PMTiles |
| **Nominatim geocoding** | €0 | Self-hosted of publieke instantie (rate-limited) |
| **Alternatief: Mapbox** | ~€0–50/maand | Gratis tot 50.000 tile-requests; bij intensief gebruik ~€50 |
| **Alternatief: Google Maps Platform** | ~€0–28/maand | $200 gratis krediet/maand dekt ~28.000 loads |

#### B3. Apple & Distributie

| Post | Kosten/maand | Toelichting |
|---|---|---|
| **Apple Developer Program** | ~€8 | €99/jaar omgerekend |
| **TestFlight (beta testing)** | €0 | Inbegrepen |
| **MDM (Mosyle Business)** | €0 | Gratis tot 30 devices |
| **Push Notifications (APNs)** | €0 | Inbegrepen in Apple Developer |

#### B4. AI-services (optioneel, voor toekomstige uitbreidingen)

| Service | Kosten/maand | Toelichting |
|---|---|---|
| **Azure OpenAI (NLP notitie-analyse)** | ~€5–30 | GPT-4o-mini: ~€0,15/1K requests; ~200 vaststellingen/maand = ~€5 |
| **Azure Custom Vision (foto-analyse)** | ~€0–20 | Gratis tot 5.000 predictions/maand; daarna €1,50/1.000 |
| **OR-Tools / VROOM (routeoptimalisatie)** | €0 | Open source, draait lokaal of op eigen server |

#### B5. Overige diensten

| Post | Kosten/maand | Toelichting |
|---|---|---|
| **Sentry / error monitoring** | €0 | Gratis developer-tier (5K events/maand) |
| **GitHub Actions (CI/CD)** | €0 | Gratis voor publieke repos; 2.000 min/maand voor private |
| **E-mail notificaties (SendGrid)** | €0 | Gratis tot 100 mails/dag |

---

### C. Overzichtstabel: Maandelijkse Kosten per Scenario

| Scenario | Hosting | Kaart | Apple | AI | Monitoring | **Totaal/maand** |
|---|---|---|---|---|---|---|
| **Minimaal** (Digipolis infra, open source, geen AI) | €0 | €0 | €8 | €0 | €0 | **~€8** |
| **Standaard** (Azure basis, open tiles, basis AI) | €17 | €0 | €8 | €5 | €0 | **~€30** |
| **Professioneel** (Azure managed, Mapbox, volledige AI) | €39 | €50 | €8 | €50 | €26 | **~€173** |

---

### D. Hardware (eenmalig, indien nog niet aanwezig)

| Item | Prijs per stuk | Aantal | Totaal |
|---|---|---|---|
| **iPad 10e generatie (64GB WiFi+Cellular)** | ~€579 | 7 | €4.053 |
| **Beschermhoes (outdoor/rugged)** | ~€40 | 7 | €280 |
| **Apple Pencil (optioneel, voor tekeningen)** | ~€99 | 7 | €693 |
| **4G/5G data-abonnement** | ~€10/maand/device | 7 | €70/maand |

> **Opmerking:** Als Stad Antwerpen al iPads en data-abonnementen heeft voor de toezichters, vervallen deze kosten.

---

### E. Totaaloverzicht Jaar 1

| Categorie | Minimaal scenario | Professioneel scenario |
|---|---|---|
| Eenmalig (Apple Developer) | €99 | €99 |
| Eenmalig (Hardware, indien nodig) | €4.333 | €5.026 |
| Maandelijks (12 maanden) | 12 × €8 = €96 | 12 × €173 = €2.076 |
| Maandelijks data-abo (12 maanden) | 12 × €70 = €840 | 12 × €70 = €840 |
| **Totaal Jaar 1** | **€5.368** | **€8.041** |
| **Totaal Jaar 1 (zonder hardware)** | **€1.035** | **€3.015** |

---

### F. Belangrijke Besparingen t.o.v. Alternatieven

| Alternatief | Geschatte jaarkosten | Besparing met Capacitor-aanpak |
|---|---|---|
| Commercieel platform (bijv. Raxel, PlanRadar) | €15.000–€40.000/jaar | 80–95% |
| Custom native Swift ontwikkeling (extern bureau) | €50.000–€120.000 eenmalig | 95%+ |
| React Native rewrite (extern bureau) | €30.000–€60.000 eenmalig | 90%+ |

> **Conclusie kosten:** Door de Capacitor-aanpak en in-house ontwikkeling met Copilot/Codex liggen de externe productiekosten tussen **€8 en €173 per maand**, afhankelijk van gekozen services. De grootste variabele is of Digipolis-infrastructuur (gratis) of publieke cloud (Azure) wordt gebruikt.

---

## Conclusie

De overstap van de huidige `DN_DISPATCH` web-app naar een standalone iPad-app is zeer haalbaar dankzij de gekozen React-architectuur. Door **Capacitor** te gebruiken, vermijden we een dure "rewrite" in Swift of React Native. De grootste technische uitdagingen liggen niet in de UI, maar in het **vervangen van de web-storage door robuuste offline databases** en het **cachen van kaartmateriaal** voor betrouwbaar gebruik op het terrein.

De externe kostenstructuur is bijzonder laag: in het minimale scenario slechts **~€8/maand** aan Apple-licentie, oplopend tot **~€173/maand** bij volledig professionele cloud-hosting met AI-diensten. Dit maakt de iPad-app financieel haalbaar als POC én als productie-applicatie.