# Analyse: GRB-kaart, Luchtfoto Vlaanderen & GIPOD CSS voor DN_DISPATCH

Datum: 2026-02-21  
Status: Geanalyseerd — implementatie gepland  
Git-branch: `feature/gipod-css-grb-kaart`  
Git-backup tag: `v1.5-pre-css` (staat vóór wijzigingen, terugkeren: `git checkout v1.5-pre-css`)

Dit document analyseert drie mogelijke verbeteringen voor de kaartweergave en het visueel ontwerp van DN_DISPATCH:

1. **GRB (Grootschalig Referentie Bestand)** als achtergrondkaart
2. **Luchtfoto Vlaanderen** als extra kaartlaag
3. **GIPOD CSS-stijl** als ontwerp-referentie voor de app

---

## 1. GRB als Achtergrondkaart

### Wat is het GRB?

Het **Grootschalig Referentie Bestand** is de officiële basiskaart van Vlaanderen, beheerd door **Digitaal Vlaanderen** (voorheen Informatie Vlaanderen / AGIV). Het bevat:

- Gebouwen (3D-footprints)
- Perceelgrenzen
- Wegassen en wegoppervlakken
- Waterlopen
- Spoorwegen
- Kunstwerken (bruggen, tunnels)

Dit is de meest **gedetailleerde en accurate** basiskaart voor Vlaanderen — veel preciezer dan OpenStreetMap voor gebouwcontouren en perceelgrenzen.

### Beschikbare Services

| Service | URL | Protocol | Gratis? |
|---|---|---|---|
| **GRB WMS** | `https://geo.api.vlaanderen.be/GRB/wms` | WMS 1.3.0 | ✅ Ja |
| **GRB WMTS** | `https://geo.api.vlaanderen.be/GRB/wmts` | WMTS 1.0.0 | ✅ Ja |
| **GRB-basiskaart (grijs)** | `https://geo.api.vlaanderen.be/GRBgray/wmts` | WMTS 1.0.0 | ✅ Ja |
| **GRB-selectie** | `https://geo.api.vlaanderen.be/GRB-selectie/wms` | WMS 1.3.0 | ✅ Ja |

> **Alle GRB-services zijn gratis** en vereisen geen API-key of authenticatie. Ze vallen onder de **open data licentie** van Vlaamse overheid.

### Compatibiliteit met MapLibre GL JS

| Aspect | Status | Toelichting |
|---|---|---|
| **WMTS raster tiles** | ✅ Compatibel | MapLibre ondersteunt `raster` sources met WMTS tile-URL's |
| **WMS** | ✅ Compatibel | Via `raster` source met `tiles` parameter (WMS GetMap als tile-URL template) |
| **Vector tiles** | ❌ Niet beschikbaar | GRB biedt geen Mapbox Vector Tiles (MVT/pbf) formaat |
| **Projectie** | ⚠️ Let op | GRB-services gebruiken standaard **EPSG:31370** (Lambert 72) of **EPSG:3857** (Web Mercator). MapLibre werkt met EPSG:3857 — we moeten de juiste SRS meegeven. |

### Technische Implementatie

#### Optie A: GRB WMTS als raster-laag (aanbevolen)

```typescript
// In MapPanel.tsx of als nieuwe MAP_STYLE_OPTION
const GRB_WMTS_URL =
  "https://geo.api.vlaanderen.be/GRB/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=grb_bsk&STYLE=default" +
  "&FORMAT=image/png" +
  "&TILEMATRIXSET=GoogleMapsVL" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

// MapLibre style definitie
{
  version: 8,
  sources: {
    "grb-wmts": {
      type: "raster",
      tiles: [GRB_WMTS_URL],
      tileSize: 256,
      attribution: "© Digitaal Vlaanderen – GRB"
    }
  },
  layers: [
    {
      id: "grb-background",
      type: "raster",
      source: "grb-wmts"
    }
  ]
}
```

#### Optie B: GRB WMS als raster-laag

```typescript
const GRB_WMS_URL =
  "https://geo.api.vlaanderen.be/GRB/wms?" +
  "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap" +
  "&LAYERS=GRB_BSK&CRS=EPSG:3857" +
  "&BBOX={bbox-epsg-3857}" +
  "&WIDTH=256&HEIGHT=256&FORMAT=image/png";
```

#### Optie C: GRB-basiskaart grijs (ideaal als neutrale achtergrond)

```typescript
const GRB_GRAY_WMTS_URL =
  "https://geo.api.vlaanderen.be/GRBgray/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=grb_bsk_grijs&STYLE=default" +
  "&FORMAT=image/png" +
  "&TILEMATRIXSET=GoogleMapsVL" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";
```

> **Aanbeveling:** De **GRB grijs-variant** is het meest geschikt als achtergrondkaart voor DN_DISPATCH. De grijstinten zorgen ervoor dat de gekleurde markers en postcodelagen goed zichtbaar blijven.

### GRB Lagen Overzicht (meest relevant voor DN_DISPATCH)

| Laagnaam | Inhoud | Nut voor DN_DISPATCH |
|---|---|---|
| `GRB_BSK` | Basiskaart (volledig) | Achtergrondkaart |
| `GRB_BSK_GRIJS` | Basiskaart in grijstinten | Neutrale achtergrond |
| `GRB_GBG` | Gebouwen | Context bij adreslocaties |
| `GRB_WBN` | Wegbanen | Routecontext |
| `GRB_KNW` | Kunstwerken | Bruggen/tunnels bij werven |
| `GRB_ADP` | Administratieve percelen | Eigendomsgrenzen |

### Beperkingen GRB als MapLibre Achtergrond

| Beperking | Impact | Workaround |
|---|---|---|
| Enkel raster, geen vector tiles | Zwaarder (meer data, minder scherp bij hoog zoomniveau) | Acceptabel voor achtergrond; huidige OpenFreeMap vector tiles houden we als alternatief |
| Maximaal zoomniveau ~20 | GRB is gedetailleerd tot perceelniveau; voldoende | Geen |
| Geen interactieve features | Kan niet klikken op GRB-gebouwen | Niet nodig; onze eigen data-overlay is interactief |
| Alleen Vlaanderen | Buiten Vlaanderen is het wit/leeg | Fallback op OpenFreeMap voor randgebieden |
| Trager dan vector tiles | Raster tiles zijn ~3-5x groter | Cache-headers zijn goed; browser-cache helpt |

---

## 2. Luchtfoto Vlaanderen als Kaartlaag

### Beschikbare Services

| Service | URL | Protocol | Gratis? |
|---|---|---|---|
| **Orthofoto's (meest recent)** | `https://geo.api.vlaanderen.be/OMWRGBMRVL/wmts` | WMTS 1.0.0 | ✅ Ja |
| **Orthofoto's (WMS)** | `https://geo.api.vlaanderen.be/OMWRGBMRVL/wms` | WMS 1.3.0 | ✅ Ja |
| **Orthofoto's winteropnamen** | `https://geo.api.vlaanderen.be/OMWRGBMRVL/wmts` | WMTS 1.0.0 | ✅ Ja |

> De **OMWRGBMRVL** (Orthomozaïek Winteropname RGB Meest Recente Versie Vlaanderen) is de standaard luchtfoto-service. Gratis, geen API-key vereist.

### Technische Implementatie

```typescript
const LUCHTFOTO_WMTS_URL =
  "https://geo.api.vlaanderen.be/OMWRGBMRVL/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=omwrgbmrvl&STYLE=default" +
  "&FORMAT=image/png" +
  "&TILEMATRIXSET=GoogleMapsVL" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

// MapLibre style definitie
{
  version: 8,
  sources: {
    "luchtfoto-vl": {
      type: "raster",
      tiles: [LUCHTFOTO_WMTS_URL],
      tileSize: 256,
      attribution: "© Digitaal Vlaanderen – Orthofotomozaïek"
    }
  },
  layers: [
    {
      id: "luchtfoto-background",
      type: "raster",
      source: "luchtfoto-vl"
    }
  ]
}
```

### Integratie in MAP_STYLE_OPTIONS

De huidige `MAP_STYLE_OPTIONS` in `App.tsx` kan worden uitgebreid:

```typescript
const MAP_STYLE_OPTIONS = [
  { id: "clean",        label: "Clean",        url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "werfcontrast", label: "Werfcontrast", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "nacht",        label: "Nacht",        url: "https://tiles.openfreemap.org/styles/dark" },
  { id: "analyse",      label: "Analyse",      url: "https://tiles.openfreemap.org/styles/bright" },
  // NIEUW: Vlaamse overheidskaarten
  { id: "grb",          label: "GRB",          url: "/styles/grb-gray.json" },
  { id: "grb-kleur",    label: "GRB Kleur",    url: "/styles/grb-color.json" },
  { id: "luchtfoto",    label: "Luchtfoto",    url: "/styles/luchtfoto-vl.json" },
] as const;
```

Elk `.json` bestand in `public/styles/` is een MapLibre style spec met de juiste WMTS source.

### Beperkingen Luchtfoto

| Beperking | Impact | Workaround |
|---|---|---|
| Raster-only (geen vector) | Hogere bandbreedte | Browser-cache; optioneel tile-limit per sessie |
| Resolutie varieert per seizoen | Winteropnamen zijn soms minder scherp | De "meest recente versie" combineert de beste opnamen |
| Labels ontbreken | Straatnamen zijn niet zichtbaar op luchtfoto | Overlay: GRB-labels of OpenFreeMap labels als transparante laag erboven |
| Offline moeilijker | ~5-10GB voor regio Antwerpen op hoge zoom | Niet primair bedoeld als offline kaart; GRB is beter daarvoor |

### Meerwaarde voor Toezichters

| Usecase | Voordeel |
|---|---|
| **Terreinherkenning** | Toezichters zien direct de actuele situatie op locatie (gebouwen, parkeerstroken, groenzones) |
| **Werfomgeving beoordelen** | Breedte wegenis, nabijheid gebouwen, mogelijke hinder voor voetgangers |
| **Vergelijken voor/na** | Luchtfoto als baseline vs. vastgestelde situatie bij inspectie |
| **Conflicten detecteren** | Visueel verifiëren of een werf op de juiste locatie is gemarkeerd |

---

## 3. GIPOD CSS-stijl als Ontwerp-referentie

### Wat is de GIPOD-stijl?

Het **GIPOD-portaal** (https://gipod.vlaanderen.be) gebruikt de **Vlaamse overheid huisstijl** gebaseerd op het **Webuniversum v3** design system. Dit is een officieel en herkenbaar design framework dat ook door andere Vlaamse overheidsapplicaties wordt gebruikt (bijv. Mijn Burgerprofiel, MAGDA, Omgevingsloket).

### Huidige DN_DISPATCH CSS vs. GIPOD-stijl

| Eigenschap | DN_DISPATCH (huidig) | GIPOD / Webuniversum |
|---|---|---|
| **Font** | Sora + IBM Plex Mono | **Flanders Art Sans** (officieel) of Roboto (fallback) |
| **Primaire kleur** | `#0a9396` (teal) | `#0055CC` (Vlaams blauw) of `#FFE615` (Vlaams geel) |
| **Achtergrond** | `#eef3f5` (lichtblauw-grijs) | `#F7F9FC` (lichtgrijs) of `#FFFFFF` |
| **Tekst** | `#0f172a` (donkerblauw-zwart) | `#333332` (antraciet) |
| **Accent** | `#005f73` (donker teal) | `#0055CC` (blauw) |
| **Warning** | `#b45309` (amber) | `#FFE615` (geel) of `#FFC515` |
| **Danger** | `#991b1b` (rood) | `#DB3434` (rood) |
| **Border radius** | 14px | 3px (strakker, zakelijker) |
| **Shadow** | Soft shadows | Minimale of geen shadows |
| **Cards** | Rounded, shadowed | Flat, bordered |

### GIPOD/Webuniversum Design Tokens

De Vlaamse overheid publiceert hun design system als open-source:

- **GitHub:** https://github.com/milieuinfo/webcomponenten-vl
- **Documentatie:** https://overheid.vlaanderen.be/webuniversum
- **NPM packages:** `@govflanders/vl-ui-*`

#### Kernkleuren (Vlaamse Overheid Palet)

```css
:root {
  /* Primair */
  --vl-primary:          #0055CC;   /* Vlaams blauw */
  --vl-primary-dark:     #003B8E;
  --vl-primary-light:    #E8EEFB;
  
  /* Accenten */
  --vl-accent:           #FFE615;   /* Vlaams geel */
  --vl-accent-dark:      #FFC515;
  
  /* Functioneel */
  --vl-success:          #009E47;
  --vl-warning:          #FFE615;
  --vl-error:            #DB3434;
  --vl-info:             #0055CC;
  
  /* Neutralen */
  --vl-text:             #333332;
  --vl-text-light:       #666666;
  --vl-background:       #F7F9FC;
  --vl-background-alt:   #E8EBEE;
  --vl-border:           #CBD2DA;
  --vl-border-light:     #E8EBEE;
  
  /* Typografie */
  --vl-font-family:     "Flanders Art Sans", "Roboto", "Helvetica Neue", sans-serif;
  --vl-font-mono:       "Flanders Art Mono", "Roboto Mono", monospace;
  --vl-font-size-base:   16px;
  --vl-line-height-base: 1.5;
  
  /* Spacing */
  --vl-spacing-xs:       4px;
  --vl-spacing-sm:       8px;
  --vl-spacing-md:       16px;
  --vl-spacing-lg:       24px;
  --vl-spacing-xl:       32px;
  
  /* Borders */
  --vl-border-radius:    3px;
  --vl-shadow:           0 1px 3px rgba(0, 0, 0, 0.12);
}
```

### Voorstel: Hybride Aanpak (DN_DISPATCH + GIPOD-stijl)

Volledige overname van het Webuniversum is niet nodig (en vereist de officiële webcomponenten-bibliotheek). In plaats daarvan stellen we een **hybride aanpak** voor: de GIPOD-kleuren en -typografie overnemen, maar de bestaande componentstructuur van DN_DISPATCH behouden.

#### Mapping: Huidige CSS-variabelen → GIPOD-equivalent

```css
:root {
  /* ──── Basis ──── */
  --bg:            #F7F9FC;         /* was #eef3f5 → GIPOD lichtgrijs */
  --panel:         #FFFFFF;         /* behouden */
  --panel-alt:     #E8EBEE;         /* was #f4f8fb → GIPOD alt-grijs */
  --text:          #333332;         /* was #0f172a → GIPOD antraciet */
  --muted:         #666666;         /* was #475569 → GIPOD lichtgrijs tekst */
  
  /* ──── Kleur accenten ──── */
  --accent:        #0055CC;         /* was #0a9396 → Vlaams blauw */
  --accent-strong: #003B8E;         /* was #005f73 → Vlaams donkerblauw */
  --warning:       #FFC515;         /* was #b45309 → GIPOD geel */
  --danger:        #DB3434;         /* was #991b1b → GIPOD rood */
  
  /* ──── Vormgeving ──── */
  --radius:        3px;             /* was 14px → GIPOD strak */
  --shadow:        0 1px 3px rgba(0,0,0,0.12);  /* was soft shadow → GIPOD minimal */
  --border:        1px solid #CBD2DA;            /* was #d8e2ea → GIPOD border */
}

body {
  font-family: "Flanders Art Sans", "Roboto", "Segoe UI", sans-serif;
  /* Verwijder radial-gradient achtergrond → plat GIPOD-grijs */
  background: var(--bg);
}
```

#### Visueel Verschil

| Element | Huidig (DN_DISPATCH) | Na GIPOD-stijl |
|---|---|---|
| **Knoppen** | Rounded (14px), teal | Strak (3px), blauw |
| **Cards** | Soft shadow, rounded | Flat, dunne border |
| **Achtergrond** | Gradient teal | Vlak lichtgrijs |
| **Headers** | Teal/donker teal | Vlaams blauw |
| **Chips/Tags** | Rounded pills | Licht afgeronde badges |
| **Fonts** | Sora (modern/speels) | Flanders Art Sans (overheidsstijl) |

### Impact op Bestaande Code

| Bestand | Aanpassing | Omvang |
|---|---|---|
| `src/styles.css` | `:root` variabelen vervangen + body achtergrond | ~15 regels |
| `src/styles.css` | `border-radius` waarden in card/chip/button selectors | ~20 regels |
| `src/styles.css` | Font imports aanpassen (Google Fonts → Flanders Art) | 1 regel |
| `index.html` | Font preload link toevoegen | 1 regel |
| Componenten | Geen wijzigingen nodig (gebruiken CSS variabelen) | 0 |

> **Belangrijk:** Omdat DN_DISPATCH consequent CSS custom properties gebruikt (`var(--accent)`, `var(--text)`, etc.), is het omschakelen naar GIPOD-kleuren een **puur CSS-wijziging** zonder React-component aanpassingen.

### Font Beschikbaarheid

| Font | Bron | Licentie | Status |
|---|---|---|---|
| **Flanders Art Sans** | Vlaamse overheid | Vrij voor overheidsapplicaties | Beschikbaar via Webuniversum CDN of npm |
| **Roboto** (fallback) | Google Fonts | Open source (Apache 2.0) | Gratis, universeel beschikbaar |

De Flanders Art fonts zijn beschikbaar via:
```
https://cdn.milieuinfo.be/vlaanderen-font/LATEST/
```

Of als npm package:
```
@govflanders/vl-ui-core (bevat fonts + base CSS)
```

---

## 4. Voorstel: Uitgebreide Kaart-stijlselector

Na implementatie van GRB + Luchtfoto + GIPOD-stijl zou de kaart-stijlselector er als volgt uitzien:

```
┌─────────────────────────────────────────────────────┐
│  Kaartstijl                                         │
│                                                     │
│  [Clean] [Werfcontrast] [Nacht] [Analyse]          │
│  [GRB Grijs] [GRB Kleur] [Luchtfoto]              │
│                                                     │
│  Lagen                                              │
│  ☑ Postcoderanden                                   │
│  ☑ Impactzones                                      │
│  ☐ GRB Gebouwen (overlay)                          │
│  ☐ GRB Percelen (overlay)                          │
└─────────────────────────────────────────────────────┘
```

### Gecombineerde Lagen (Luchtfoto + GRB overlay)

De krachtigste configuratie voor terreinwerk:

```
Laag 1 (basis):    Luchtfoto Vlaanderen
Laag 2 (overlay):  GRB gebouwen (transparant, alleen contouren)
Laag 3 (overlay):  Postcoderanden DN_DISPATCH
Laag 4 (overlay):  Werfmarkers + routes
```

Dit geeft toezichters een luchtfoto met gebouwcontouren, postcodegrenzen en werflocaties — ideaal voor terreinherkenning.

---

## 5. Samenvatting & Aanbeveling

| Item | Haalbaarheid | Kosten | Prioriteit |
|---|---|---|---|
| **GRB grijs als achtergrondkaart** | ✅ Eenvoudig (WMTS raster source) | €0 (gratis publieke service) | **Hoog** — meest accurate Vlaamse basiskaart |
| **GRB kleur als alternatief** | ✅ Eenvoudig | €0 | Middel — optioneel naast grijs |
| **Luchtfoto Vlaanderen** | ✅ Eenvoudig (WMTS raster source) | €0 (gratis publieke service) | **Hoog** — grote meerwaarde voor terreinwerk |
| **GIPOD CSS-migratie** | ✅ Eenvoudig (enkel CSS variabelen) | €0 (open design system) | **Middel** — visuele herkenning Vlaamse overheid |
| **GRB gebouwen overlay** | ⚠️ Middel (aparte WMS-laag) | €0 | Laag — nice-to-have op luchtfoto |
| **Flanders Art fonts** | ✅ Eenvoudig (CDN link) | €0 | Middel — onderdeel van GIPOD-stijl |

### Aanbevolen Implementatievolgorde

1. **GRB grijs + Luchtfoto** toevoegen aan `MAP_STYLE_OPTIONS` (1–2 uur werk)
2. **GIPOD CSS-variabelen** in `:root` omschakelen (30 minuten)
3. **Flanders Art Sans** font laden via CDN (10 minuten)
4. **GRB gebouwen overlay** als optionele laag (2–4 uur, inclusief toggle-UI)
5. **Gecombineerde luchtfoto + GRB contourlaag** (1–2 uur)

> **Totale geschatte inspanning:** 5–9 uur voor alle vijf items. Geen externe kosten.
