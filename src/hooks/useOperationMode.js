import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "../utils/analytics.js";
import { saveRunToHistory, saveStudioGameEvent } from "../storage.js";
import { buildStudioGameEvent } from "../utils/runIntelligence.js";
import { setMusicVibe, soundOperationObjective, soundOperationReinforcement, soundWaveClear } from "../sounds.js";
import { readPreference } from "../utils/gamePreferences.js";
import { addText } from "../systems/transientPresentation.js";
import { getRunIntegrityReceipt, recordRunIntegrityFault } from "../systems/runIntegrity.js";
import { RUN_PHASE } from "../systems/runTermination.js";
import { createRunHistoryEntry, readRunModeFlags } from "../systems/runSession.js";
import { chooseMissionDirective } from "../systems/missionDirector.js";
import { buildOperationReceipt, chooseOperationRoute, createOperationState, getCurrentEncounter, resolveOperationEncounter } from "../systems/operationDirector.js";
import { applyOperationArenaTransition, buildOperationArenaReceipt, createOperationArenaState } from "../systems/operationArenaState.js";
import { buildOperationRematchCartridge, buildOperationReplayReceipt } from "../utils/operationRivals.js";
import { createOperationObjectiveState, evaluateOperationObjectiveClear, getOperationEncounterAction, isOperationEncounterActionMatch, recordOperationObjectiveAction } from "../systems/operationEncounterContract.js";
import { deriveOperationCampaignCarryIn, loadOperationCampaignProgress, recordOperationCompletion, saveOperationCampaignProgress } from "../utils/operationCampaignProgress.js";
import { normalizePlayerMusicVibe, resolveOperationEncounterScore } from "../systems/operationAudioDirector.js";
import { buildOperationProximitySnapshot, operationProximitySnapshotsEqual } from "../systems/operationProximity.js";
import { buildOperationMissionSnapshot } from "../systems/operationMissionSnapshot.js";

export function applyOperationEncounterScore(verb) {
  const playerVibe = normalizePlayerMusicVibe(readPreference("cod-music-vibe", "action"));
  const decision = resolveOperationEncounterScore(verb, playerVibe);
  if (decision.targetVibe) setMusicVibe(decision.targetVibe);
  return decision;
}

export function restoreOperationPlayerScore() {
  const playerVibe = normalizePlayerMusicVibe(readPreference("cod-music-vibe", "action"));
  setMusicVibe(playerVibe);
  return playerVibe;
}

export function useOperationMode({
  gsRef, modeRuntimeRef = { current: null }, sizeRef, frameMonitorRef, startTimeRef, difficultyRef, statsRef, activePerksRef, modeRefs,
  setScore, setHealth, setPaused, setPauseReason, setLiveAnnounce,
}) {
  const stateRef = useRef(null);
  const arenaRef = useRef(null);
  const completeRef = useRef(null);
  const objectiveRef = useRef(null);
  const [state, setState] = useState(null);
  const [arenaState, setArenaState] = useState(null);
  const [directive, setDirective] = useState(null);
  const [completeReceipt, setCompleteReceipt] = useState(null);
  const [objectiveState, setObjectiveState] = useState(null);
  const [proximitySnapshot, setProximitySnapshot] = useState(null);

  const chooseLiveDirective = useCallback((encounter, operationState, objectiveState, gs, elapsedMs = 0) => (
    chooseMissionDirective(buildOperationMissionSnapshot({
      encounter,
      operationState,
      objectiveState,
      gs,
      activePerks: activePerksRef?.current || [],
      elapsedMs,
    }))
  ), [activePerksRef]);

  const readProximitySnapshot = useCallback(() => {
    const currentState = stateRef.current;
    const currentArena = arenaRef.current;
    const encounter = getCurrentEncounter(currentState);
    const action = getOperationEncounterAction(encounter);
    if (!currentArena || !encounter || !action || completeRef.current) return null;
    const target = currentArena.interactables.find((item) => item.id === action.targetId) || null;
    return buildOperationProximitySnapshot({ player: gsRef.current?.player, target });
  }, [gsRef]);

  useEffect(() => {
    if (!state || completeReceipt) return undefined;
    const intervalId = globalThis.setInterval(() => {
      const nextSnapshot = readProximitySnapshot();
      setProximitySnapshot((current) => operationProximitySnapshotsEqual(current, nextSnapshot) ? current : nextSnapshot);
    }, 100);
    return () => globalThis.clearInterval(intervalId);
  }, [completeReceipt, readProximitySnapshot, state]);

  const reset = useCallback(() => {
    const hadActiveOperation = Boolean(stateRef.current);
    stateRef.current = null;
    arenaRef.current = null;
    completeRef.current = null;
    objectiveRef.current = null;
    setState(null); setArenaState(null); setObjectiveState(null); setDirective(null); setCompleteReceipt(null); setProximitySnapshot(null);
    if (hadActiveOperation) restoreOperationPlayerScore();
  }, []);

  const start = useCallback(({ operation, challenge = {}, seed }) => {
    let nextState = createOperationState({ operationId: operation.id, seed });
    const requestedIndex = operation.routeOptions.indexOf(String(challenge.operationRoute || ""));
    const routeIndex = requestedIndex >= 0 ? requestedIndex : seed % operation.routeOptions.length;
    const route = operation.routeOptions[routeIndex];
    const routeSource = requestedIndex >= 0 ? "player_selected" : "seed_fallback";
    nextState = chooseOperationRoute(nextState, route);
    const campaignCarryIn = deriveOperationCampaignCarryIn(loadOperationCampaignProgress(), operation.id);
    nextState = { ...nextState, campaignCarryIn };
    let nextArena = createOperationArenaState({ width: sizeRef.current.w, height: sizeRef.current.h, seed });
    nextArena = applyOperationArenaTransition(nextArena, routeIndex === 0
      ? { targetId: "turret-northeast", command: "power", inputSource: "keyboard", actorId: "route-map" }
      : { targetId: "extraction-toilet-bravo", command: "contaminate", inputSource: "keyboard", actorId: "route-map" });
    if (campaignCarryIn?.transition?.targetId && campaignCarryIn?.transition?.command) {
      nextArena = applyOperationArenaTransition(nextArena, { ...campaignCarryIn.transition, inputSource: "keyboard", actorId: "campaign-ledger" });
    }
    const encounter = getCurrentEncounter(nextState);
    const nextObjective = createOperationObjectiveState(encounter);
    const nextDirective = chooseLiveDirective(encounter, nextState, nextObjective, gsRef.current, 0);
    stateRef.current = nextState; arenaRef.current = nextArena; objectiveRef.current = nextObjective; completeRef.current = null;
    setState(nextState); setArenaState(nextArena); setObjectiveState(nextObjective); setDirective(nextDirective); setCompleteReceipt(null);
    const proximityTarget = nextArena.interactables.find((item) => item.id === getOperationEncounterAction(encounter)?.targetId) || null;
    setProximitySnapshot(buildOperationProximitySnapshot({ player: gsRef.current?.player, target: proximityTarget }));
    if (encounter?.verb) applyOperationEncounterScore(encounter.verb);
    // S163: the encounter verb is behavioral. Start its handler once the run state exists.
    queueMicrotask(() => { const g = gsRef.current; const rt = modeRuntimeRef.current; if (g?.operationMode && encounter?.verb && rt) { rt.clearVerbObjective(g); rt.startVerbObjective(g, encounter.verb, rt.verbSpecFor(encounter.verb, encounter), { W: sizeRef.current.w, H: sizeRef.current.h }); } });
    return {
      operationMode: true, operationId: operation.id, operationRoute: route, operationRouteSource: routeSource,
      operationEncounterIndex: 0, operationEncounterVerb: encounter?.verb || null,
      _operationInteractionKeys: new Set(), _operationInteractionBonuses: {}, _operationInteractionTotal: 0,
      _operationSplits: [], _operationBranches: [{ fork: "deployment-route", choice: route, elapsedMs: 0 }],
      _operationPressureMultiplier: Number(nextState.routeConsequence?.pressureMultiplier) || 1,
    };
  }, [chooseLiveDirective, gsRef, modeRuntimeRef, sizeRef]);

  const interact = useCallback((action) => {
    const gs = gsRef.current;
    const currentState = stateRef.current;
    const currentArena = arenaRef.current;
    const encounter = getCurrentEncounter(currentState);
    const contract = getOperationEncounterAction(encounter);
    if (!gs?.operationMode || !currentArena || !encounter || completeRef.current || gs._waveTransitDone || gs._respiteLock) {
      return { accepted: false, reasonCode: "INTERACTION_STALE", proximity: null };
    }
    if (!isOperationEncounterActionMatch(encounter, action)) {
      return { accepted: false, reasonCode: "INTERACTION_MISMATCH", proximity: null };
    }
    const target = currentArena.interactables.find((item) => item.id === contract.targetId) || null;
    const proximity = buildOperationProximitySnapshot({ player: gs.player, target });
    setProximitySnapshot(proximity);
    if (!proximity.inRange) {
      const rangeCopy = proximity.available
        ? `${proximity.distanceToRangePx} pixels ${proximity.direction.toLowerCase()} to range.`
        : "Target position unavailable.";
      setLiveAnnounce(`${contract.label} out of range. ${rangeCopy}`);
      return { accepted: false, reasonCode: proximity.reasonCode, proximity };
    }
    const key = `${encounter.id}:${action?.targetId}:${action?.command}`;
    const used = gs._operationInteractionKeys || (gs._operationInteractionKeys = new Set());
    if (used.has(key)) return { accepted: false, reasonCode: "INTERACTION_DUPLICATE", proximity };
    try {
      const nextArena = applyOperationArenaTransition(currentArena, action);
      const arenaReceipt = buildOperationArenaReceipt(nextArena);
      const nextObjective = recordOperationObjectiveAction(objectiveRef.current, action, {
        arenaSequence: nextArena.sequence,
        transitionFingerprint: arenaReceipt.transitionFingerprint,
      });
      used.add(key); arenaRef.current = nextArena; setArenaState(nextArena);
      objectiveRef.current = nextObjective; setObjectiveState(nextObjective);
      const effect = contract?.effect || {};
      const bonus = Math.max(0, Math.floor(Number(effect.scoreBonus) || 0));
      gs._operationInteractionBonuses[encounter.id] = bonus;
      gs._operationInteractionTotal = Math.min(525, (gs._operationInteractionTotal || 0) + bonus);
      gs.score += bonus;
      gs.player.health = Math.min(gs.player.maxHealth, gs.player.health + Math.max(0, Number(effect.heal) || 0));
      if (effect.pressureMultiplier) gs._operationPressureMultiplier = effect.pressureMultiplier;
      if (effect.enemyDamageRatio) {
        gs.enemies.forEach((enemy) => {
          const damage = Math.max(1, Math.floor((Number(enemy.maxHealth) || Number(enemy.health) || 1) * effect.enemyDamageRatio));
          enemy.health = Math.max(1, (Number(enemy.health) || 1) - damage);
        });
      }
      setScore(gs.score); setHealth(Math.floor(gs.player.health));
      addText(gs, gs.player.x, gs.player.y - 48, `OBJECTIVE LINKED · ${String(effect.id || "confirmed").toUpperCase()}`, "#72E8FF", true);
      soundOperationObjective(encounter.verb);
      setLiveAnnounce(`${contract.label} confirmed. ${contract.benefit}`);
      setDirective(chooseLiveDirective(encounter, currentState, nextObjective, gs, Date.now() - startTimeRef.current));
      track("operation_arena_interaction", { operationId: currentState.operationId, encounterId: encounter.id, encounterVerb: encounter.verb, targetId: action.targetId, command: action.command, sequence: nextArena.sequence });
      return { accepted: true, reasonCode: "INTERACTION_ACCEPTED", proximity };
    } catch (error) {
      recordRunIntegrityFault(gs, { stage: "operation_arena_interaction", error, wave: gs.currentWave });
      return { accepted: false, reasonCode: "INTERACTION_REJECTED", proximity };
    }
  }, [chooseLiveDirective, gsRef, setHealth, setLiveAnnounce, setScore, startTimeRef]);

  const resolveWave = useCallback(() => {
    const gs = gsRef.current;
    const currentState = stateRef.current;
    const encounter = getCurrentEncounter(currentState);
    if (!gs?.operationMode || !encounter) return { handled: false, completed: false };
    const arenaReceipt = buildOperationArenaReceipt(arenaRef.current);
    const interactionBonus = Math.min(100, Math.max(0, Number(gs._operationInteractionBonuses?.[encounter.id]) || 0));
    // S163: a behavioral verb must be done (door breached, point held, cart delivered,
    // target hunted, pump sabotaged, exit reached, boss down) before the room clears.
    const verbState = gs.activeVerbObjective;
    const verbDone = !verbState || verbState.status === "done";
    const objectiveResult = evaluateOperationObjectiveClear(objectiveRef.current, { arenaCleared: verbDone });
    objectiveRef.current = objectiveResult.objectiveState;
    setObjectiveState(objectiveResult.objectiveState);
    if (!objectiveResult.advance || !verbDone) {
      gs._operationPressureMultiplier = 1 + Math.min(0.9, objectiveResult.objectiveState.reinforcementCount * 0.15);
      const blockedDirector = chooseLiveDirective(encounter, currentState, objectiveResult.objectiveState, gs, Date.now() - startTimeRef.current);
      setDirective(blockedDirector);
      addText(gs, gs.player.x, gs.player.y - 64, "OBJECTIVE INCOMPLETE · REINFORCEMENTS", "#FFD57B", true);
      soundOperationReinforcement(objectiveResult.objectiveState.reinforcementCount);
      const requiredAction = getOperationEncounterAction(encounter);
      setLiveAnnounce(`${requiredAction?.label || "Objective action"} required. Reinforcements ${objectiveResult.objectiveState.reinforcementCount}.`);
      track("operation_objective_blocked", { operationId: currentState.operationId, encounterId: encounter.id, encounterVerb: encounter.verb, reasonCode: objectiveResult.reasonCode, reinforcementCount: objectiveResult.objectiveState.reinforcementCount });
      return { handled: true, completed: false, blocked: true, reasonCode: objectiveResult.reasonCode, nextState: currentState };
    }
    const elapsedTotalMs = Math.max(0, Date.now() - startTimeRef.current);
    const previousSplitMs = Math.max(0, Number(gs._operationSplits.at(-1)?.elapsedMs) || 0);
    const encounterElapsedMs = Math.max(0, elapsedTotalMs - previousSplitMs);
    const director = chooseLiveDirective(encounter, currentState, objectiveResult.objectiveState, gs, elapsedTotalMs);
    const nextState = resolveOperationEncounter(currentState, {
      completed: true,
      bonusScore: interactionBonus,
      elapsedMs: encounterElapsedMs,
      reinforcementCount: objectiveResult.objectiveState.reinforcementCount,
      arenaFingerprint: arenaReceipt.stateFingerprint,
      directorReason: director.reasonCode,
      objectiveEvidence: objectiveResult.objectiveState.actionEvidence,
      resolutionKey: `wave-${gs.currentWave}`,
    });
    stateRef.current = nextState; setState(nextState);
    Object.assign(gs, { operationRoute: nextState.route, operationEncounterIndex: nextState.currentEncounterIndex, operationEncounterVerb: getCurrentEncounter(nextState)?.verb || null });
    gs._operationSplits.push({ room: encounter.id, elapsedMs: elapsedTotalMs, score: nextState.score });
    track("operation_encounter_clear", { operationId: nextState.operationId, encounterId: encounter.id, encounterVerb: encounter.verb, encounterIndex: currentState.currentEncounterIndex, operationScore: nextState.score, route: nextState.route, arenaFingerprint: arenaReceipt.stateFingerprint, directorReason: director.reasonCode });
    if (nextState.status !== "complete") {
      const nextEncounter = getCurrentEncounter(nextState);
      const nextObjective = createOperationObjectiveState(nextEncounter);
      objectiveRef.current = nextObjective; setObjectiveState(nextObjective);
      { const rt = modeRuntimeRef.current; if (rt) { rt.clearVerbObjective(gs); if (nextEncounter?.verb) rt.startVerbObjective(gs, nextEncounter.verb, rt.verbSpecFor(nextEncounter.verb, nextEncounter), { W: sizeRef.current.w, H: sizeRef.current.h }); } }
      const nextTarget = arenaRef.current.interactables.find((item) => item.id === getOperationEncounterAction(nextEncounter)?.targetId) || null;
      setProximitySnapshot(buildOperationProximitySnapshot({ player: gs.player, target: nextTarget }));
      gs._operationPressureMultiplier = Number(nextState.routeConsequence?.pressureMultiplier) || 1;
      if (nextEncounter?.verb) applyOperationEncounterScore(nextEncounter.verb);
      setDirective(chooseLiveDirective(nextEncounter, nextState, nextObjective, gs, elapsedTotalMs));
      return { handled: true, completed: false, nextState };
    }
    const durationMs = Math.max(0, Date.now() - startTimeRef.current);
    const rivalReceipt = buildOperationReplayReceipt({
      operationId: nextState.operationId, seed: nextState.seed, routeOptions: [nextState.route],
      scoringContract: nextState.scoringContract, splits: gs._operationSplits, branchGhost: gs._operationBranches,
      objectives: nextState.encounterReceipts.map((entry) => ({ id: entry.encounterId, outcome: entry.completed ? "complete" : "failed", elapsedMs: durationMs })),
      finalScore: nextState.score, completed: true, durationMs,
    });
    const receipt = { ...buildOperationReceipt(nextState), arenaReceipt, rivalReceipt, rematchCartridge: buildOperationRematchCartridge(rivalReceipt), durationSeconds: Math.floor(durationMs / 1000), runScore: gs.score, routeSource: gs.operationRouteSource };
    saveOperationCampaignProgress(recordOperationCompletion(loadOperationCampaignProgress(), receipt));
    Object.assign(gs, { operationReceipt: receipt, runPhase: RUN_PHASE.ENDED, runEndCause: "operation_complete" });
    completeRef.current = receipt; setCompleteReceipt(receipt);
    setProximitySnapshot(null);
    setPaused(true); setPauseReason("operation_complete"); setLiveAnnounce(`${receipt.mission} complete. Score ${receipt.score}.`); soundWaveClear(); restoreOperationPlayerScore();
    const historyEntry = createRunHistoryEntry({
      score: gs.score, kills: gs.kills, wave: gs.currentWave,
      timeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000), difficulty: difficultyRef.current,
      flags: readRunModeFlags(...modeRefs), runSeed: nextState.seed, modifier: gs.runModifier || null,
      integrityReceipt: getRunIntegrityReceipt(gs), performanceReceipt: frameMonitorRef.current?.snapshot?.() || null,
      totalDamage: gs.totalDamage, totalShots: statsRef.current.totalShots || 0, totalHits: statsRef.current.totalHits || 0,
      totalCrits: statsRef.current.crits || 0, bossKills: statsRef.current.bossKills || 0,
    });
    historyEntry.mode = "operation";
    historyEntry.operation = { operationId: receipt.operationId, route: receipt.route, routeSource: gs.operationRouteSource, status: receipt.status, scoringContract: receipt.scoringContract, operationScore: receipt.score, checkpoint: receipt.checkpoint, fingerprint: receipt.fingerprint };
    saveRunToHistory(historyEntry);
    const event = { operationId: receipt.operationId, route: receipt.route, routeSource: gs.operationRouteSource, operationScore: receipt.score, fingerprint: receipt.fingerprint };
    track("operation_complete", { ...event, runScore: gs.score, durationSeconds: historyEntry.time, evidenceScope: "local-deterministic-not-causal-or-server-authoritative" });
    saveStudioGameEvent(buildStudioGameEvent("operation_complete", { surface: "operation_runtime", ...event }));
    return { handled: true, completed: true, nextState, receipt };
  }, [chooseLiveDirective, difficultyRef, frameMonitorRef, gsRef, modeRefs, modeRuntimeRef, setLiveAnnounce, setPauseReason, setPaused, sizeRef, startTimeRef, statsRef]);

  return { stateRef, arenaRef, objectiveRef, completeRef, state, arenaState, objectiveState, proximitySnapshot, directive, completeReceipt, start, reset, interact, resolveWave, setCompleteReceipt };
}
