import type {
  ComplaintSummary,
  ComplaintsGateway,
  IntegrationMode,
} from "../contracts";

function countFromWorkId(workId: string): number {
  const chars = workId.trim().length;
  return chars === 0 ? 0 : chars % 4;
}

export class MockComplaintsGateway implements ComplaintsGateway {
  readonly name = "MockComplaintsGateway";
  readonly mode: IntegrationMode = "mock";

  async getComplaintSummary(workId: string): Promise<ComplaintSummary> {
    const openCount = countFromWorkId(workId);
    const closedCount = Math.max(0, openCount - 1);

    return {
      workId,
      openCount,
      closedCount,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}
