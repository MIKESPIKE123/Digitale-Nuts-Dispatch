import type { WorkRecord } from "../../../types";
import worksFallbackRaw from "../../../data/works.generated.json";
import type { IntegrationMode, WorksGateway, WorksQuery } from "../contracts";

const FALLBACK_WORKS = worksFallbackRaw as WorkRecord[];

export class MockWorksGateway implements WorksGateway {
  readonly name = "MockWorksGateway";
  readonly mode: IntegrationMode = "mock";

  async fetchWorks(_query: WorksQuery): Promise<WorkRecord[]> {
    return FALLBACK_WORKS.map((work) => ({ ...work, location: { ...work.location } }));
  }
}
