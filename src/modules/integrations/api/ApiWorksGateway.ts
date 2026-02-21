import type { WorkRecord } from "../../../types";
import type { IntegrationMode, WorksGateway, WorksQuery } from "../contracts";

export class ApiWorksGateway implements WorksGateway {
  readonly name = "ApiWorksGateway";
  readonly mode: IntegrationMode = "api";

  async fetchWorks(query: WorksQuery): Promise<WorkRecord[]> {
    const url = query.cacheBust ? `${query.dataUrl}?_=${Date.now()}` : query.dataUrl;

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (error) {
      const fetchMessage = error instanceof Error ? error.message : "Onbekende fetch-fout";
      throw new Error(
        `Geen verbinding met de lokale app-server (${fetchMessage}). Laat 'OPEN DN DISPATCH - LAATSTE VERSIE.cmd' openstaan.`
      );
    }

    if (!response.ok) {
      throw new Error(`Databron niet bereikbaar (${response.status}).`);
    }

    const parsed = await response.json();
    if (!Array.isArray(parsed)) {
      throw new Error("Databron heeft geen geldige lijststructuur.");
    }

    return parsed as WorkRecord[];
  }
}
