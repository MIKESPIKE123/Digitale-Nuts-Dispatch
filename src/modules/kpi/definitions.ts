export type KpiDefinitionItem = {
  kpi: string;
  status: string;
  formula: string;
  source: string;
  limitation: string;
};

export type KpiDefinitionBacklogItem = {
  kpiKey: string;
  status: string;
  nextAction: string;
  reference: string;
};

export const KPI_REGISTER_SYNC_NOTE =
  "Gesynchroniseerd met docs/uitvoering/DN_KPI_REGISTER_OVERZICHT.md (2026-02-21).";

export const KPI_DEFINITIONS: KpiDefinitionItem[] = [
  {
    kpi: "Dossiers in scope",
    status: "BESCHREVEN + OPERATIONEEL",
    formula: "Aantal dossiers na actieve status-, district- en postcodefilters.",
    source: "Runtime works-dataset (`works.generated.json`) + actieve filterstate.",
    limitation: "Contextafhankelijk; geen stedelijke totaalrapportering.",
  },
  {
    kpi: "Vaststellingen per toezichter (huidige week)",
    status: "BESCHREVEN + OPERATIONEEL",
    formula:
      "Som van vaststellingsrecords met geplande datum binnen ISO-week van gekozen dispatchdatum, gegroepeerd per toezichter.",
    source: "Lokale DN Vaststelling records + dispatchdatum.",
    limitation: "Gebaseerd op lokale records; niet op centrale backendhistoriek.",
  },
  {
    kpi: "% records met context (adres + nutsmaatschappij + referentie + GIPOD)",
    status: "BESCHREVEN + OPERATIONEEL",
    formula: "(Records met complete contextvelden / records in scope) x 100.",
    source: "DN Vaststelling immutable contextvelden.",
    limitation: "Meet volledigheid, niet de inhoudelijke juistheid van die velden.",
  },
  {
    kpi: "% handover ingevuld",
    status: "BESCHREVEN + OPERATIONEEL",
    formula: "(Records met `handoverDecision` / records in scope) x 100.",
    source: "DN Vaststelling mutable payload (`handoverDecision`).",
    limitation: "Kijkt enkel of keuze ingevuld is, niet of beslissing correct is.",
  },
  {
    kpi: "Gemiddelde checklistscore (0-100)",
    status: "BESCHREVEN + OPERATIONEEL",
    formula:
      "Gemiddelde van gewogen recordscore: 100 - (NOK x 15) - (missing checks x 12) - (missing verantwoordelijke x 8) + (OK bonus, max 40).",
    source: "DN Vaststelling formData + NOK-verantwoordelijke velden.",
    limitation:
      "Indicatieve kwaliteitsmeting; geen juridisch verdict en afhankelijk van correcte veldinvulling.",
  },
  {
    kpi: "Trend week op week",
    status: "BESCHREVEN + OPERATIONEEL",
    formula:
      "Vergelijking huidige week vs vorige week voor # vaststellingen, gemiddelde checklistscore, handover% en # scores < 70.",
    source:
      "DN Vaststelling records (`dn_vaststelling_records_v1`) met weekvenster op basis van geselecteerde dispatchdatum.",
    limitation:
      "Toestelgebonden trend (local storage), niet automatisch een organisatiebrede of historische backendtrend.",
  },
  {
    kpi: "Queue: queued / failed / synced",
    status: "BESCHREVEN + OPERATIONEEL",
    formula: "Telling per syncstatus in de lokale sync-wachtrij.",
    source: "DN Vaststelling sync queue (`dn_vaststelling_sync_queue_v1`).",
    limitation: "Lokale toestelstatus; geen globaal teamoverzicht.",
  },
  {
    kpi: "Top 5 prioriteitsdossiers",
    status: "BESCHREVEN + OPERATIONEEL",
    formula: "Top 5 visits volgens dispatchprioriteit, met impactscore als tie-breaker.",
    source: "Dispatch plan (`mapVisits`) + impactscore per visit.",
    limitation: "Momentopname binnen huidige filter- en kaartcontext.",
  },
];

export const KPI_DEFINITION_BACKLOG: KpiDefinitionBacklogItem[] = [
  {
    kpiKey: "toegewezen_dossiers",
    status: "OPERATIONEEL + TE BESCHRIJVEN",
    nextAction: "Formule + bron + beperking vastleggen in rapportdefinitie v1.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "open_nok_items",
    status: "TE BESCHRIJVEN",
    nextAction: "NOK-bron en open-statuscriteria formaliseren.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "high_impact_dossiers",
    status: "TE BESCHRIJVEN",
    nextAction: "Drempel en telvenster harmoniseren met impactmodel.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "aantal_vaststellingen_per_district",
    status: "TE BESCHRIJVEN",
    nextAction: "Districtsbron en weekvenster expliciteren.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "nok_ratio",
    status: "TE BESCHRIJVEN",
    nextAction: "Noemer (records of checks) vastleggen.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "failed_sync_ratio",
    status: "TE BESCHRIJVEN",
    nextAction: "Ratioformule en observatievenster bepalen.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "gemiddelde_doorlooptijd_status_open_tot_closed",
    status: "TE BESCHRIJVEN",
    nextAction: "Start/eindstatus + uitsluitingen formaliseren.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "herbezoek_ratio",
    status: "TE BESCHRIJVEN",
    nextAction: "Definitie van herbezoek en meetmoment vastleggen.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "high_impact_share",
    status: "TE BESCHRIJVEN",
    nextAction: "Noemer en impactklasse-selectie expliciteren.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
  {
    kpiKey: "top_3_risicodossiers",
    status: "TE BESCHRIJVEN",
    nextAction: "Risicoscorelogica en rankingregels vastleggen.",
    reference: "DN_KPI_REGISTER_OVERZICHT - sectie 8",
  },
];
