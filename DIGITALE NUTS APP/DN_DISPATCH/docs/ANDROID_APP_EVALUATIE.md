# Evaluatie: Van DN_DISPATCH naar Standalone Android App voor Toezichters

Datum: 2026-02-21  
Status: Geanalyseerd  
Git-baseline tag: `v1.5-pre-css`  
Repository: `https://github.com/MIKESPIKE123/Apps.git`

Dit document evalueert de huidige `DN_DISPATCH` webapplicatie en beschrijft de mogelijkheden en vereisten om hieruit een afgeleide, standalone Android-app te bouwen voor toezichters op het terrein.

De gekozen technologische strategie is **Capacitor**, waarmee we de bestaande React/Vite codebase kunnen "wrappen" in een native Android-container (WebView + native bridge). Dit biedt de snelste time-to-market met maximaal hergebruik van code, terwijl we toch toegang krijgen tot native Android-hardware.

> **Voordeel t.o.v. iOS:** Geen verplichte App Store review, geen Apple Developer jaarlicentie nodig bij interne distributie (sideloading / MDM), en bredere keuze aan betaalbare rugged hardware.

---

## 1. Huidige Status: Wat is er al bruikbaar?

De huidige architectuur is zeer geschikt als fundament voor een hybride app:

*   **Modulaire React/Vite Stack:** De scheiding tussen UI (`src/components`) en domeinlogica (`src/lib`) maakt het eenvoudig om de app in een Capacitor Android-schil te draaien.
*   **Vaststellingsmodule:** De contracten (`src/modules/vaststelling/contracts.ts`) en de initiële offline-first sync logica (`src/modules/vaststelling/storage.ts`) zijn al ontworpen met een instabiele netwerkverbinding in het achterhoofd.
*   **Sync Queue:** Er is al een mechanisme (`DNVaststellingSyncItem`) om acties te bufferen en later naar de server te sturen.
*   **Kaartweergave:** MapLibre GL JS wordt gebruikt, wat in theorie ondersteuning biedt voor offline vector tiles.
*   **Capacitor cross-platform:** Dezelfde Capacitor-plugins die voor iOS worden gebruikt, werken ook op Android — de investering in Fase 1–2 is herbruikbaar over beide platformen.

---

## 2. Ontbrekende Elementen: Wat mankeert er nog?

Om van de huidige webversie een robuuste, native aanvoelende Android-app voor buitengebruik te maken, moeten de volgende elementen worden toegevoegd of aangepast:

### A. Robuuste Offline Opslag (Data & Media)
*   **Huidige situatie:** De app gebruikt `localStorage` (limiet ~5–10MB), wat onvoldoende is voor het cachen van honderden dossiers en hoge-resolutie foto's.
*   **Oplossing:** Migratie naar **IndexedDB** (via Dexie.js) of een **Capacitor SQLite plugin** (`@capacitor-community/sqlite`). Android WebView heeft betere IndexedDB-ondersteuning dan iOS Safari, wat dit betrouwbaarder maakt.
*   **Android-specifiek:** Opslag op het interne app-bestandssysteem (`getFilesDir()`) via Capacitor Filesystem plugin voor foto's. Geen opslaglimieten zoals bij iOS.

### B. Native Hardware Integratie
*   **Camera & Foto's:** De **Capacitor Camera API** (`@capacitor/camera`) werkt op Android en biedt:
    *   Hoge resolutie foto's via de native camera-app of ingebouwde camera-view.
    *   Direct inlezen van EXIF-data (GPS-coördinaten, timestamp, richting).
    *   Compressie op het toestel zelf vóór opslag/upload.
    *   **Android-voordeel:** Geen complexe permissie-popups zoals iOS; `AndroidManifest.xml` declaratie volstaat.
*   **Locatievoorzieningen (GPS):** De **Capacitor Geolocation API** (`@capacitor/geolocation`) biedt:
    *   Fused Location Provider (Google Play Services) voor betere nauwkeurigheid dan pure GPS.
    *   Achtergrond-locatiebepaling via een foreground service (indien nodig voor routering).
    *   **Android-specifiek:** Mogelijkheid om GPS + WiFi + cellnetwerk te combineren voor snellere fix in stedelijke omgeving (Antwerpen).

### C. Android-specifieke UX/UI (Terrein-optimalisatie)
*   **Outdoor Leesbaarheid:** Toezichters werken buiten in de zon. De UI heeft een hoog-contrast modus nodig en ondersteuning voor het native Android Dark/Light thema (via `prefers-color-scheme` media query).
*   **Touch & Ergonomie:** Knoppen en interactiegebieden moeten groter worden gemaakt (minimaal 48dp) voor gebruik met werkhandschoenen of een stylus. Android Material Design richtlijnen volgen.
*   **Schermbenutting:** Android-tablets variëren sterk in schermgrootte (8"–12"). Responsive layouts met CSS Grid/Flexbox die automatisch schakelen tussen:
    *   **Tablet (≥768px):** Master-Detail view (lijst links, kaart/details rechts).
    *   **Telefoon (<768px):** Stack-navigatie met bottom navigation bar.
*   **Navigatiebalk:** Android heeft een terug-knop (gesture of soft-key). Capacitor's `@capacitor/app` plugin handelt de hardware back-button af — dit moet correct worden geïmplementeerd per view.
*   **Notificaties:** Native Android push-notificaties via **Firebase Cloud Messaging (FCM)** voor dringende dispatch-wijzigingen.

### D. Offline Kaartmateriaal
*   **Huidige situatie:** MapLibre haalt tiles live op van het internet.
*   **Oplossing:** Implementatie van offline tile-caching:
    *   **PMTiles** in het lokale bestandssysteem (via Capacitor Filesystem).
    *   Of een lokale `.mbtiles` database met de Capacitor SQLite plugin als tile-server.
    *   Regio Antwerpen: ~1–2GB aan vector tiles voor zoom 0–16.
*   **Android-voordeel:** Geen strikte opslaglimieten; tiles kunnen op de interne opslag of SD-kaart staan.

### E. Security & Authenticatie
*   **SSO Integratie:** Koppeling met het identiteitsbeheer van Stad Antwerpen (OAuth2/OIDC) via Capacitor Browser plugin of `@capacitor/app` custom URL scheme.
*   **Biometrie:** Toevoegen van vingerafdruk / gezichtsherkenning via **Capacitor Biometrics** (`@aparajita/capacitor-biometric-auth`), zodat toezichters na een sessie-timeout snel opnieuw kunnen inloggen.
*   **Android-specifiek:**
    *   Apparaatversleuteling afdwingen via MDM-beleid.
    *   App-pinning (kiosk-modus) mogelijk via Android Device Policy als toezichters enkel deze app hoeven te gebruiken.

### F. Distributie & Device Management
*   **Geen App Store vereist:** Android-apps kunnen worden gedistribueerd via:
    *   **Sideloading:** Direct `.apk`/`.aab` installeren via MDM of download-link.
    *   **Google Play Private Track:** Interne distributie via managed Google Play (gratis).
    *   **MDM push:** Via Microsoft Intune, Jamf, of Google Workspace (als Digipolis dit gebruikt).
*   **Auto-update:** Via MDM of een in-app update-check tegen een interne download-server.

---

## 3. Stappenplan (Roadmap naar Android App)

### Fase 1: Proof of Concept (Capacitor Wrap)
1. Installeer `@capacitor/core`, `@capacitor/cli` en `@capacitor/android`.
2. Initialiseer Capacitor in het Vite-project (`npx cap init`).
3. Bouw de huidige web-app (`npm run build`) en genereer het Android Studio-project (`npx cap add android`).
4. Test de basisfunctionaliteit op een fysieke Android-tablet of emulator.
5. Genereer een debug `.apk` en installeer op een testtoestel.

### Fase 2: Native Features & Storage
1. Vervang `localStorage` door IndexedDB/SQLite voor de vaststellings- en sync-modules.
2. Integreer de Capacitor Camera plugin voor het nemen van foto's bij vaststellingen.
3. Integreer de Capacitor Geolocation plugin voor nauwkeurige locatiebepaling.
4. Implementeer de Android hardware back-button afhandeling.
5. Configureer `AndroidManifest.xml` permissies (camera, locatie, internet, opslag).

### Fase 3: UX Optimalisatie & Offline Maps
1. Pas CSS aan voor responsieve tablet-layouts (Master-Detail) en telefoon-layouts (stack).
2. Implementeer hoog-contrast thema's en Android Dark Mode ondersteuning.
3. Onderzoek en implementeer offline tile-caching voor MapLibre GL (PMTiles of mbtiles).
4. Integreer Firebase Cloud Messaging voor push-notificaties.

### Fase 4: Security & Distributie
1. Implementeer OAuth2 login en biometrische authenticatie.
2. Genereer een gesigneerde release `.aab` (Android App Bundle).
3. Configureer distributie via managed Google Play of MDM (Microsoft Intune).
4. Stel auto-update mechanisme in.

---

## 4. Externe Kostenstructuur (Productie & Maandelijks Onderhoud)

> **Scope:** Enkel externe, terugkerende kosten. Ontwikkeltijd is uitgesloten (VS Code + Copilot/Codex).  
> **Valuta:** EUR, prijzen excl. BTW tenzij anders vermeld.  
> **Aannames:** 7 Android-tablets (1 per toezichter), ~500 actieve dossiers, ~2.000 foto's/maand.

---

### A. Eenmalige Productiekosten (go-live)

| Post | Detail | Kostenindicatie |
|---|---|---|
| **Google Play Developer Account** | Eenmalige registratie (niet jaarlijks!) | **€25 eenmalig** |
| **Google Workspace / managed Play** | Waarschijnlijk al aanwezig bij Digipolis | €0 |
| **MDM-licentie (Intune/Mosyle)** | Device management – Intune inbegrepen in Microsoft 365 E3/E5; Mosyle gratis tot 30 devices | €0 |
| **Code Signing Keystore** | Zelf gegenereerd, geen externe kosten | €0 |
| **SSL-certificaat backend** | Let's Encrypt (gratis) of via Digipolis infra | €0 |
| **Initiële tile-cache Antwerpen** | Eenmalig downloaden OpenStreetMap tiles regio Antwerpen (~2GB) via gratis bronnen (OpenFreeMap/Protomaps) | €0 |
| **Firebase project** | Gratis Spark-plan (voldoende voor push + analytics) | €0 |

**Eenmalig totaal: ~€25** (Google Play registratie)

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

#### B3. Google & Distributie

| Post | Kosten/maand | Toelichting |
|---|---|---|
| **Google Play Developer** | **€0** | Eenmalig €25, geen jaarlijkse kosten |
| **Firebase (Spark plan)** | €0 | Push notifications, Crashlytics, Analytics — gratis tot hoge volumes |
| **Google Play Console** | €0 | Interne test tracks en managed distributie gratis |
| **MDM (Microsoft Intune)** | €0 | Inbegrepen in Microsoft 365 E3/E5 (Digipolis) |

#### B4. AI-services (optioneel, voor toekomstige uitbreidingen)

| Service | Kosten/maand | Toelichting |
|---|---|---|
| **Azure OpenAI (NLP notitie-analyse)** | ~€5–30 | GPT-4o-mini: ~€0,15/1K requests; ~200 vaststellingen/maand = ~€5 |
| **Azure Custom Vision (foto-analyse)** | ~€0–20 | Gratis tot 5.000 predictions/maand; daarna €1,50/1.000 |
| **OR-Tools / VROOM (routeoptimalisatie)** | €0 | Open source, draait lokaal of op eigen server |
| **ML Kit (Google, on-device)** | €0 | Gratis on-device text recognition, barcode scanning |

#### B5. Overige diensten

| Post | Kosten/maand | Toelichting |
|---|---|---|
| **Firebase Crashlytics** | €0 | Gratis crash reporting (vervangt Sentry) |
| **GitHub Actions (CI/CD)** | €0 | Gratis voor publieke repos; 2.000 min/maand voor private |
| **E-mail notificaties (SendGrid)** | €0 | Gratis tot 100 mails/dag |

---

### C. Overzichtstabel: Maandelijkse Kosten per Scenario

| Scenario | Hosting | Kaart | Google/Firebase | AI | Monitoring | **Totaal/maand** |
|---|---|---|---|---|---|---|
| **Minimaal** (Digipolis infra, open source, geen AI) | €0 | €0 | €0 | €0 | €0 | **~€0** |
| **Standaard** (Azure basis, open tiles, basis AI) | €17 | €0 | €0 | €5 | €0 | **~€22** |
| **Professioneel** (Azure managed, Mapbox, volledige AI) | €39 | €50 | €0 | €50 | €0 | **~€139** |

---

### D. Hardware (eenmalig, indien nog niet aanwezig)

| Item | Prijs per stuk | Aantal | Totaal |
|---|---|---|---|
| **Samsung Galaxy Tab Active5 (rugged, 128GB, 5G)** | ~€499 | 7 | €3.493 |
| **Alternatief: Samsung Galaxy Tab A9+ (budget)** | ~€279 | 7 | €1.953 |
| **Alternatief: Rugged tablet (Getac/Panasonic)** | ~€900–1.500 | 7 | €6.300–10.500 |
| **Beschermhoes + screenprotector (als niet-rugged)** | ~€30 | 7 | €210 |
| **Stylus (optioneel, voor tekeningen)** | ~€25 | 7 | €175 |
| **4G/5G data-abonnement** | ~€10/maand/device | 7 | €70/maand |

> **Android-voordeel:** Veel bredere keuze in hardware, inclusief specifieke **rugged tablets** (IP68, MIL-STD-810) die ontworpen zijn voor buitenwerk. Prijzen beginnen ~40% lager dan vergelijkbare iPads.

---

### E. Totaaloverzicht Jaar 1

| Categorie | Minimaal scenario | Professioneel scenario |
|---|---|---|
| Eenmalig (Google Play) | €25 | €25 |
| Eenmalig (Hardware — Samsung Tab Active5) | €3.493 | €3.493 |
| Maandelijks (12 maanden) | 12 × €0 = €0 | 12 × €139 = €1.668 |
| Maandelijks data-abo (12 maanden) | 12 × €70 = €840 | 12 × €70 = €840 |
| **Totaal Jaar 1** | **€4.358** | **€6.026** |
| **Totaal Jaar 1 (zonder hardware)** | **€865** | **€2.533** |

---

### F. Vergelijking Android vs. iPad

| Aspect | Android (Capacitor) | iPad (Capacitor) |
|---|---|---|
| **Eenmalige licentie** | €25 (eenmalig) | €99/jaar |
| **Maandelijkse distributiekosten** | €0 | ~€8/maand |
| **Minimaal scenario /maand** | **€0** | **€8** |
| **Professioneel scenario /maand** | **€139** | **€173** |
| **Jaar 1 zonder hardware** | **€865** | **€1.035** |
| **Hardware (rugged tablet)** | **€499/stuk** (Tab Active5) | €579/stuk (iPad 10e gen) + €40 case |
| **Rugged opties** | Uitgebreid (Samsung, Getac, Panasonic, Zebra) | Beperkt (case-afhankelijk) |
| **Sideloading mogelijk** | ✅ Ja (direct APK) | ❌ Nee (ABM/MDM vereist) |
| **Achtergrond-services** | ✅ Volledige controle | ⚠️ Beperkt door iOS |
| **SD-kaart / uitbreidbaar geheugen** | ✅ Bij veel modellen | ❌ Niet mogelijk |
| **Crash reporting** | Firebase Crashlytics (gratis) | Sentry (gratis tier) |
| **On-device ML** | ML Kit (gratis) | Core ML (gratis) |

---

### G. Belangrijke Besparingen t.o.v. Alternatieven

| Alternatief | Geschatte jaarkosten | Besparing met Capacitor-aanpak |
|---|---|---|
| Commercieel platform (bijv. Raxel, PlanRadar) | €15.000–€40.000/jaar | 85–97% |
| Custom native Kotlin ontwikkeling (extern bureau) | €40.000–€100.000 eenmalig | 95%+ |
| React Native rewrite (extern bureau) | €30.000–€60.000 eenmalig | 90%+ |

> **Conclusie kosten:** Door de Capacitor-aanpak en in-house ontwikkeling met Copilot/Codex liggen de externe productiekosten voor Android tussen **€0 en €139 per maand**. Dit is **goedkoper dan de iPad-variant** door het ontbreken van jaarlijkse Apple-licenties en de bredere keuze aan betaalbare rugged hardware.

---

## 5. Aanbeveling: Android, iPad of Beide?

| Criterium | Android | iPad |
|---|---|---|
| Laagste kosten | ✅ | |
| Beste rugged hardware | ✅ | |
| Eenvoudigste distributie (sideloading) | ✅ | |
| Beste WebView-prestaties | | ✅ (Safari/WKWebView) |
| Consistentere UX (minder fragmentatie) | | ✅ |
| Al in gebruik bij toezichters? | ❓ Nagaan | ❓ Nagaan |

**Aanbeveling:** Start met het platform dat de toezichters al gebruiken. Door Capacitor's cross-platform aard is **90%+ van de code gedeeld** — het ondersteunen van beide platformen vergt minimale meerkosten (enkel platform-specifieke configuratie en testen).

---

## Conclusie

De overstap van de huidige `DN_DISPATCH` web-app naar een standalone Android-app is zeer haalbaar dankzij de gekozen React-architectuur en Capacitor. Android biedt **lagere licentiekosten** (€25 eenmalig vs. €99/jaar), **flexibeler distributie** (sideloading zonder app store review), en **bredere keuze aan rugged hardware** die specifiek ontworpen is voor buitenwerk.

De grootste technische uitdagingen zijn identiek aan de iPad-variant: **robuuste offline opslag**, **offline kaartmateriaal**, en **native camera/GPS-integratie**. Dankzij de gedeelde Capacitor-codebase kan met minimale extra investering een dual-platform (Android + iPad) strategie worden gevolgd.

De externe kostenstructuur is bijzonder laag: in het minimale scenario **€0/maand** aan lopende kosten (enkel €25 eenmalig), oplopend tot **~€139/maand** bij volledig professionele cloud-hosting met AI-diensten.
