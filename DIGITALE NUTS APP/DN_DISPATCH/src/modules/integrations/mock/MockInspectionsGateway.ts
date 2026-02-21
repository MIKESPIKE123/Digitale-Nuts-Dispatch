import type {
  InspectionSyncCommand,
  InspectionSyncResult,
  InspectionsGateway,
  IntegrationMode,
} from "../contracts";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export class MockInspectionsGateway implements InspectionsGateway {
  readonly name = "MockInspectionsGateway";
  readonly mode: IntegrationMode = "mock";
  private readonly seenIdempotencyKeys = new Set<string>();

  async syncInspection(command: InspectionSyncCommand): Promise<InspectionSyncResult> {
    const now = new Date().toISOString();
    const buildAck = (outcome: "accepted" | "duplicate" | "rejected") => ({
      outcome,
      inspectionId: command.inspectionId,
      idempotencyKey: command.idempotencyKey,
      syncEventId: `${command.itemId}-${command.attempts}`,
      processedAt: now,
      serverVersion: "mock-v1",
      mappedStatus: "in_progress" as const,
      statusMappingSource: "mock-default",
    });

    if (this.seenIdempotencyKeys.has(command.idempotencyKey)) {
      return {
        ok: true,
        statusCode: 208,
        ack: buildAck("duplicate"),
        duplicate: true,
      };
    }

    const forceFail =
      command.itemId.toLowerCase().includes("fail") ||
      command.payload.forceSyncFail === true;

    await wait(120);

    if (forceFail) {
      return {
        ok: false,
        statusCode: 503,
        error: "MOCK_SYNC_FAILURE",
        ack: buildAck("rejected"),
      };
    }
    this.seenIdempotencyKeys.add(command.idempotencyKey);

    return {
      ok: true,
      statusCode: 200,
      ack: buildAck("accepted"),
      duplicate: false,
    };
  }
}
