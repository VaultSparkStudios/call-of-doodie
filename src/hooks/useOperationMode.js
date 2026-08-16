import { useCallback, useRef, useState } from "react";
import { track } from "../utils/analytics.js";
import { saveRunToHistory, saveStudioGameEvent } from "../storage.js";
import { buildStudioGameEvent } from "../utils/runIntelligence.js";
import { getMusicVibe, setMusicVibe, soundWaveClear } from "../sounds.js";
import { addText } from "../systems/transientPresentation.js";
import { getRunIntegrityReceipt, recordRunIntegrityFault } from "../systems/runIntegrity.js";
import { RUN_PHASE } from "../systems/runTermination.js";
import { createRunHistoryEntry, readRunModeFlags } from "../systems/runSession.js";
import { chooseMissionDirective } from "../systems/missionDirector.js";
import { buildOperationReceipt, chooseOperationRoute, createOperationState, getCurrentEncounter, resolveOperationEncounter } from "../systems/operationDirector.js";
import { applyOperationArenaTransition, buildOperationArenaReceipt, createOperationArenaState } from "../systems/operationArenaState.js";
import { buildOperationRematchCartridge, buildOperationReplayReceipt } from "../utils/operationRivals.js";

// Maps each encounter verb to a music vibe that suits its narrative role.
// BOSS is null — the existing boss-wave transition in App.jsx handles it via
// setMusicIntensity(true), so we leave that beat-quantized swap untouched.
// Retro players keep their vibe (it's tied to a visual aesthetic choice).
export const OPERATION_ENCOUNTER_MUSIC = Object.freeze({
  BREACH:   "intense",  // assault entrance — 150 BPM aggression
  HOLD:     "action",   // defend position — 108 BPM steady pulse
  ESCORT:   "chill",    // protect convoy — 72 BPM suspense contrast
  HUNT:     "spooky",   // eliminate target — 82 BPM stalker dread
  SABOTAGE: "intense",  // destroy objective — 150 BPM time pressure
  ESCAPE:   "intense",  // extraction sprint — 150 BPM survival adrenaline
  BOSS:     null,       // handled by App.jsx boss-wave setMusicIntensity(true)
});

function _applyEncounterMusicVibe(verb) {
  const targetVibe = OPERATION_ENCOUNTER_MUSIC[verb];
  if (!targetVibe) return; // BOSS or unknown — let App.jsx handle it
  if (getMusicVibe() === "retro") return; // respect the visual-mode choice
  setMusicVibe(targetVibe);
}

export function useOperationMode({
  gsRef, sizeRef, frameMonitorRef, startTimeRef, difficultyRef, statsRef, modeRefs,
  setScore, setHealth, setPaused, setPauseReason, setLiveAnnounce,
}) {
  const stateRef = useRef(null);
  const arenaRef = useRef(null);
  const completeRef = useRef(null);
  const [state, setState] = useState(null);
  const [arenaState, setArenaState] = useState(null);
  const [directive, setDirective] = useState(null);
  const [completeReceipt, setCompleteReceipt] = useState(null);

  const reset = useCallback(() => {
    stateRef.current = null;
    arenaRef.current = null;
    completeRef.current = null;
    setState(null); setArenaState(null); setDirective(null); setCompleteReceipt(null);
  }, []);

  const start = useCallback(({ operation, challenge = {}, seed }) => {
    let nextState = createOperationState({ operationId: operation.id, seed });
    const requestedIndex = operation.routeOptions.indexOf(String(challenge.operationRoute || ""));
    const routeIndex = requestedIndex >= 0 ? requestedIndex : seed % operation.routeOptions.length;
    const route = operation.routeOptions[routeIndex];
    const routeSource = requestedIndex >= 0 ? "player_selected" : "seed_fallback";
    nextState = chooseOperationRoute(nextState, route);
    let nextArena = createOperationArenaState({ width: sizeRef.current.w, height: sizeRef.current.h, seed });
    nextArena = applyOperationArenaTransition(nextArena, routeIndex === 0
      ? { targetId: "turret-northeast", command: "power", inputSource: "keyboard", actorId: "route-map" }
      : { targetId: "extraction-toilet-bravo", command: "contaminate", inputSource: "keyboard", actorId: "route-map" });
    const encounter = getCurrentEncounter(nextState);
    const nextDirective = chooseMissionDirective({ encounter, healthRatio: 1, routeChosen: true, routeChoice: route, routeConsequence: nextState.routeConsequence?.id, interactionComplete: false, scorePace: 1 });
    stateRef.current = nextState; arenaRef.current = nextArena; completeRef.current = null;
    setState(nextState); setArenaState(nextArena); setDirective(nextDirective); setCompleteReceipt(null);
    if (encounter?.verb) _applyEncounterMusicVibe(encounter.verb);
    return {
      operationMode: true, operationId: operation.id, operationRoute: route, operationRouteSource: routeSource,
      operationEncounterIndex: 0, operationEncounterVerb: encounter?.verb || null,
      _operationInteractionKeys: new Set(), _operationInteractionBonuses: {}, _operationInteractionTotal: 0,
      _operationSplits: [], _operationBranches: [{ fork: "deployment-route", choice: route, elapsedMs: 0 }],
    };
  }, [sizeRef]);

  const interact = useCallback((action) => {
    const gs = gsRef.current;
    const currentState = stateRef.current;
    const currentArena = arenaRef.current;
    const encounter = getCurrentEncounter(currentState);
    if (!gs?.operationMode || !currentArena || !encounter || completeRef.current || gs._waveTransitDone || gs._respiteLock) return;
    const key = `${encounter.id}:${action?.targetId}:${action?.command}`;
    const used = gs._operationInteractionKeys || (gs._operationInteractionKeys = new Set());
    if (used.has(key)) return;
    try {
      const nextArena = applyOperationArenaTransition(currentArena, action);
      used.add(key); arenaRef.current = nextArena; setArenaState(nextArena);
      const bonus = 25;
      gs._operationInteractionBonuses[encounter.id] = bonus;
      gs._operationInteractionTotal = Math.min(175, (gs._operationInteractionTotal || 0) + bonus);
      gs.score += bonus;
      gs.player.health = Math.min(gs.player.maxHealth, gs.player.health + 5);
      setScore(gs.score); setHealth(Math.floor(gs.player.health));
      addText(gs, gs.player.x, gs.player.y - 48, "OBJECTIVE LINKED · +25", "#72E8FF", true);
      setDirective(chooseMissionDirective({ encounter, healthRatio: gs.player.health / Math.max(1, gs.player.maxHealth), routeChosen: Boolean(currentState.route), routeChoice: currentState.route, routeConsequence: currentState.routeConsequence?.id, interactionComplete: true, scorePace: 1 }));
      track("operation_arena_interaction", { operationId: currentState.operationId, encounterId: encounter.id, encounterVerb: encounter.verb, targetId: action.targetId, command: action.command, sequence: nextArena.sequence });
    } catch (error) {
      recordRunIntegrityFault(gs, { stage: "operation_arena_interaction", error, wave: gs.currentWave });
    }
  }, [gsRef, setHealth, setScore]);

  const resolveWave = useCallback(({ player }) => {
    const gs = gsRef.current;
    const currentState = stateRef.current;
    const encounter = getCurrentEncounter(currentState);
    if (!gs?.operationMode || !encounter) return { handled: false, completed: false };
    const arenaReceipt = buildOperationArenaReceipt(arenaRef.current);
    const interactionBonus = Math.min(25, Math.max(0, Number(gs._operationInteractionBonuses?.[encounter.id]) || 0));
    const director = chooseMissionDirective({ encounter, healthRatio: player.health / Math.max(1, player.maxHealth), routeChosen: Boolean(currentState.route), routeChoice: currentState.route, routeConsequence: currentState.routeConsequence?.id, interactionComplete: interactionBonus > 0, scorePace: 1 });
    const nextState = resolveOperationEncounter(currentState, { completed: true, bonusScore: interactionBonus, arenaFingerprint: arenaReceipt.stateFingerprint, directorReason: director.reasonCode, resolutionKey: `wave-${gs.currentWave}` });
    stateRef.current = nextState; setState(nextState);
    Object.assign(gs, { operationRoute: nextState.route, operationEncounterIndex: nextState.currentEncounterIndex, operationEncounterVerb: getCurrentEncounter(nextState)?.verb || null });
    gs._operationSplits.push({ room: encounter.id, elapsedMs: Math.max(0, Date.now() - startTimeRef.current), score: nextState.score });
    track("operation_encounter_clear", { operationId: nextState.operationId, encounterId: encounter.id, encounterVerb: encounter.verb, encounterIndex: currentState.currentEncounterIndex, operationScore: nextState.score, route: nextState.route, arenaFingerprint: arenaReceipt.stateFingerprint, directorReason: director.reasonCode });
    if (nextState.status !== "complete") {
      const nextEncounter = getCurrentEncounter(nextState);
      if (nextEncounter?.verb) _applyEncounterMusicVibe(nextEncounter.verb);
      setDirective(chooseMissionDirective({ encounter: nextEncounter, healthRatio: player.health / Math.max(1, player.maxHealth), routeChosen: true, routeChoice: nextState.route, routeConsequence: nextState.routeConsequence?.id, interactionComplete: false, scorePace: 1 }));
      return { handled: true, completed: false, nextState };
    }
    const durationMs = Math.max(0, Date.now() - startTimeRef.current);
    const rivalReceipt = buildOperationReplayReceipt({
      operationId: nextState.operationId, seed: nextState.seed, routeOptions: [nextState.route],
      scoringContract: "operation-score-v1", splits: gs._operationSplits, branchGhost: gs._operationBranches,
      objectives: nextState.encounterReceipts.map((entry) => ({ id: entry.encounterId, outcome: entry.completed ? "complete" : "failed", elapsedMs: durationMs })),
      finalScore: nextState.score, completed: true, durationMs,
    });
    const receipt = { ...buildOperationReceipt(nextState), arenaReceipt, rivalReceipt, rematchCartridge: buildOperationRematchCartridge(rivalReceipt), durationSeconds: Math.floor(durationMs / 1000), runScore: gs.score, routeSource: gs.operationRouteSource };
    Object.assign(gs, { operationReceipt: receipt, runPhase: RUN_PHASE.ENDED, runEndCause: "operation_complete" });
    completeRef.current = receipt; setCompleteReceipt(receipt);
    setPaused(true); setPauseReason("operation_complete"); setLiveAnnounce(`${receipt.mission} complete. Score ${receipt.score}.`); soundWaveClear();
    const historyEntry = createRunHistoryEntry({
      score: gs.score, kills: gs.kills, wave: gs.currentWave,
      timeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000), difficulty: difficultyRef.current,
      flags: readRunModeFlags(...modeRefs), runSeed: nextState.seed, modifier: gs.runModifier || null,
      integrityReceipt: getRunIntegrityReceipt(gs), performanceReceipt: frameMonitorRef.current?.snapshot?.() || null,
      totalDamage: gs.totalDamage, totalShots: statsRef.current.totalShots || 0, totalHits: statsRef.current.totalHits || 0,
      totalCrits: statsRef.current.crits || 0, bossKills: statsRef.current.bossKills || 0,
    });
    historyEntry.mode = "operation";
    historyEntry.operation = { operationId: receipt.operationId, route: receipt.route, routeSource: gs.operationRouteSource, status: receipt.status, operationScore: receipt.score, checkpoint: receipt.checkpoint, fingerprint: receipt.fingerprint };
    saveRunToHistory(historyEntry);
    const event = { operationId: receipt.operationId, route: receipt.route, routeSource: gs.operationRouteSource, operationScore: receipt.score, fingerprint: receipt.fingerprint };
    track("operation_complete", { ...event, runScore: gs.score, durationSeconds: historyEntry.time, evidenceScope: "local-deterministic-not-causal-or-server-authoritative" });
    saveStudioGameEvent(buildStudioGameEvent("operation_complete", { surface: "operation_runtime", ...event }));
    return { handled: true, completed: true, nextState, receipt };
  }, [difficultyRef, frameMonitorRef, gsRef, modeRefs, setLiveAnnounce, setPauseReason, setPaused, startTimeRef, statsRef]);

  return { stateRef, arenaRef, completeRef, state, arenaState, directive, completeReceipt, start, reset, interact, resolveWave, setCompleteReceipt };
}
