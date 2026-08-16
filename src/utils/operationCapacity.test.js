import { describe, expect, it } from "vitest";
import {
  createOperationCapacityModel,
  estimateOperationCapacity,
  evaluateOperationKillSwitch,
  runSyntheticOperationCapacityBenchmark,
  validateOperationCapacityModel,
} from "./operationCapacity.js";

describe("Operation realtime capacity and trust court", () => {
  it("checks an invite-only two-player authoritative model end to end", () => {
    const model = createOperationCapacityModel();
    expect(validateOperationCapacityModel(model)).toEqual({ ok: true, errors: [] });
    expect(model).toMatchObject({
      access: { inviteOnly: true, playersPerRoom: 2, publicMatchmaking: false },
      simulation: { authority: "server", tickRateHz: 20, stateBroadcastRateHz: 10 },
      payload: { maxInputBytes: 64, maxStateBytes: 1024 },
      rooms: { targetConcurrent: 10, maxConcurrent: 20 },
      hibernation: { enabled: true, activeTickingWhileHibernating: false },
      reconnect: { graceSeconds: 45, resumeFromAuthoritativeSnapshot: true },
      trust: { worldStateAuthority: "server-only", scoreAuthority: "server-only", clientScoreAccepted: false },
      killSwitch: { denyNewRooms: true, soloPlayUnaffected: true },
    });
  });

  it("rejects client-authored score/world state and missing cost safety", () => {
    const invalid = createOperationCapacityModel({
      access: { publicMatchmaking: true },
      trust: { scoreAuthority: "client", clientScoreAccepted: true },
      monthly: { hardCostUsdCap: 0 },
      killSwitch: { enabled: false },
    });
    expect(validateOperationCapacityModel(invalid)).toMatchObject({ ok: false });
    expect(validateOperationCapacityModel(invalid).errors).toEqual(expect.arrayContaining([
      "invite_only_access", "monthly_hard_cap", "score_and_world_trust_boundary", "kill_switch",
    ]));
  });

  it("predicts tick, payload, message, active-compute, and monthly cost envelopes", () => {
    const model = createOperationCapacityModel();
    expect(estimateOperationCapacity(model, { roomMatches: 1, matchSeconds: 60 })).toMatchObject({
      ticksPerMatch: 1200,
      inputMessagesPerMatch: 2400,
      stateMessagesPerMatch: 1200,
      messagesPerMatch: 3600,
      payloadBytesPerMatch: 1_382_400,
      activeComputeMsPerMatch: 4800,
    });
  });

  it("runs a deterministic synthetic room court and enforces rate and room caps", () => {
    const model = createOperationCapacityModel();
    const options = {
      rooms: 20,
      matchSeconds: 60,
      monthlyRoomMatches: 10,
      seed: 8675309,
      attemptedInputsPerPlayerPerSecond: 100,
    };
    const first = runSyntheticOperationCapacityBenchmark(model, options);
    const second = runSyntheticOperationCapacityBenchmark(model, options);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      deterministic: true,
      pass: true,
      rateLimitCourt: { attemptedRate: 100, acceptedRate: 30, droppedInputs: 168000 },
    });
    expect(runSyntheticOperationCapacityBenchmark(model, { ...options, rooms: 21 })).toMatchObject({
      pass: false,
      failures: ["max_rooms"],
    });
  });

  it("denies only new rooms near a hard monthly cap and leaves solo play available", () => {
    const model = createOperationCapacityModel();
    const decision = evaluateOperationKillSwitch(model, {
      messages: model.monthly.hardMessageCap * 0.91,
    });
    expect(decision).toMatchObject({
      tripped: true,
      reasons: ["message_cap"],
      allowNewRooms: false,
      preserveActiveRooms: true,
      soloPlayAvailable: true,
    });
  });
});
