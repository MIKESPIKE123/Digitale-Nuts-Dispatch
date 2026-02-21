import type {
  ComplaintSummary,
  ComplaintsGateway,
  IntegrationMode,
} from "../contracts";

export class ApiComplaintsGateway implements ComplaintsGateway {
  readonly name = "ApiComplaintsGateway";
  readonly mode: IntegrationMode = "api";

  async getComplaintSummary(workId: string): Promise<ComplaintSummary> {
    return {
      workId,
      openCount: 0,
      closedCount: 0,
      lastUpdatedAt: null,
    };
  }
}
