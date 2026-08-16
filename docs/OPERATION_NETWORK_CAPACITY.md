# Operation Network Capacity and Trust Court

Status: checked-in design and deterministic synthetic court; no realtime service or public co-op is claimed to exist.

This contract bounds a possible invite-only, two-player Operation vertical slice. It is an admission gate, not deployment authorization. Realtime work remains gated on at least 20 complete, opt-in paired Standard-versus-Operation playtest receipts and a benchmark using the eventual provider's measured billing units.

## Fixed first-slice boundary

| Boundary | Checked value |
|---|---:|
| Access | Invite code only; no public matchmaking |
| Players | Exactly 2 per room |
| Simulation | Server-authoritative fixed tick |
| Tick rate | 20 Hz |
| State broadcast | 10 Hz per player |
| Maximum client input payload | 64 bytes |
| Maximum state payload | 1,024 bytes per recipient |
| Target / maximum concurrent rooms | 10 / 20 |
| Active compute allowance | 4 ms per simulation tick |
| Input rate | 30/player/second, burst 10 |
| Join attempts | 5/minute |
| Reconnect | 45-second grace, 3 attempts, server snapshot only |

The source of truth is `DEFAULT_OPERATION_CAPACITY_MODEL` in `src/utils/operationCapacity.js`. Changes to any number must update the deterministic court and be justified by measured provider evidence before deployment.

## Capacity arithmetic

For a room of duration `D` seconds:

- simulation ticks = `D × 20`
- input messages = `D × 20 × 2 players`
- state messages = `D × 10 × 2 recipients`
- active compute = `ticks × 4 ms`
- maximum payload bytes = `(input messages × 64) + (state messages × 1,024)`

A 15-minute room therefore predicts 18,000 ticks, 54,000 messages, 20,736,000 maximum payload bytes, and 72,000 ms of active compute. These are conservative envelope calculations, not observed production use.

The initial calendar-month hard ceilings are 8,000,000 messages, 2,000,000 active-compute milliseconds, and USD 5.00 estimated spend. Cost estimation uses explicit placeholder assumptions of 1,000,000 messages/USD and 1,000,000 active-compute milliseconds/USD. Those assumptions are intentionally visible and must be replaced with current provider measurements before a network prototype can pass release review.

## Hibernation and room lifecycle

An empty or fully disconnected room becomes hibernation-eligible after 30 seconds. Hibernation stops the simulation tick and persists only the Operation identifier, seed, tick, encounter state, two player slots, and authoritative score ledger. Wake-up restores that snapshot before accepting input. Hibernation is an idle-cost control; it is never counted as a way to reduce active-match compute.

A disconnected player may reclaim the same invite slot for 45 seconds with at most three reconnect attempts. The server sends an authoritative snapshot; the client cannot upload replacement world state. After grace expires, the slot follows `hibernate-then-forfeit`. Solo play does not depend on room infrastructure.

## Trust boundary

Clients may send only `input`, `ready`, `reconnect`, and `ack` messages. The room validates message type, sequence, payload size, and per-player rate before applying input. Clients never author enemies, health, item drops, encounter completion, world state, or score.

The server owns the world simulation and score ledger and signs the final receipt. A client-supplied score is ignored. Async rival receipts remain presentation evidence: their split, path, and branch state cannot mutate combat and cannot enter a trusted leaderboard without separate server verification.

## Admission control and kill switch

New-room admission stops automatically when any tracked monthly usage reaches 90% of its hard message, active-compute, or USD ceiling, when 20 rooms already exist, or when the manual switch is set. Existing rooms are allowed to reach the next safe completion/hibernation boundary using the reserved 10% headroom. Public matchmaking is absent. Solo and asynchronous Operation play remain available when the switch is tripped.

Operational alarms must use the same three counters as the model. Re-enabling admission requires usage below threshold plus an explicit operator decision; a process restart must not silently clear a tripped state.

## Deterministic synthetic benchmark

`runSyntheticOperationCapacityBenchmark` is pure arithmetic: identical model, seed, room count, duration, monthly match count, and attempted input rate produce the same checksum and receipt. It checks:

1. maximum concurrent rooms;
2. predicted messages, active compute, and cost against monthly hard caps;
3. rate limiting under an abusive input rate;
4. automatic new-room shutdown while solo remains available; and
5. validity of invite, hibernation, reconnect, authority, and signed-score boundaries.

Run the focused court with:

```powershell
npx vitest run src/utils/operationCapacity.test.js src/utils/operationRivals.test.js src/utils/operationPlaytest.test.js
```

Synthetic success proves only that the checked assumptions are internally consistent. It does not prove latency, provider billing, regional behavior, disconnect recovery, security under hostile traffic, or player fun. Before any invite reaches a remote player, repeat the court against a headless authoritative implementation with two synthetic clients, measured payloads, malicious-input fixtures, reconnect/hibernation chaos, and provider cost receipts.
