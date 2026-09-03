// soundFacade — lazy audio boundary (S163 bundle diet).
//
// `sounds.js` is ~41 KB of source and nothing needs it before the first
// frame. This module exports the same names; calls made before the real
// module arrives are dropped (one-shot effects) or replayed (setters, start/
// stop, unlock), so state-changing calls are never lost.
// Regenerate with the S163 facade generator when sounds.js gains exports.
import { MUSIC_VIBES } from "./musicVibes.js";
export { MUSIC_VIBES };

let impl = null;
let loading = null;
const queued = [];
const REPLAY = /^(set|start|stop|toggle|apply|init|unlock|prewarm|resume)/;

export function loadSounds() {
  if (impl) return Promise.resolve(impl);
  if (!loading) loading = import("../sounds.js").then((m) => { impl = m; for (const [name, args] of queued.splice(0)) { try { m[name]?.(...args); } catch { /* ignore */ } } return m; });
  return loading;
}
export function soundsReady() { return Boolean(impl); }

// Mirror the two preference setters locally so their getters answer correctly
// before the real module arrives (settings panels read back what they set).
const local = { muted: false, vibe: "action" };
function call(name, args, fallback) {
  if (name === "setMuted") local.muted = Boolean(args[0]);
  if (name === "setMusicVibe") local.vibe = args[0];
  if (impl) return impl[name]?.(...args);
  if (name === "getMuted") return local.muted;
  if (name === "getMusicVibe") return local.vibe;
  if (REPLAY.test(name)) { queued.push([name, args]); if (queued.length > 200) queued.shift(); }
  return fallback;
}

export function duckMusic(...args) { return call("duckMusic", args, undefined); }
export function getMusicBPM(...args) { return call("getMusicBPM", args, 108); }
export function getMusicBeat(...args) { return call("getMusicBeat", args, 0); }
export function getMusicVibe(...args) { return call("getMusicVibe", args, "action"); }
export function getMuted(...args) { return call("getMuted", args, false); }
export function setBusVolume(...args) { return call("setBusVolume", args, undefined); }
export function setDangerIntensity(...args) { return call("setDangerIntensity", args, undefined); }
export function setMusicIntensity(...args) { return call("setMusicIntensity", args, undefined); }
export function setMusicLowpass(...args) { return call("setMusicLowpass", args, undefined); }
export function setMusicTier(...args) { return call("setMusicTier", args, undefined); }
export function setMusicVibe(...args) { return call("setMusicVibe", args, undefined); }
export function setMuted(...args) { return call("setMuted", args, undefined); }
export function soundAchievement(...args) { return call("soundAchievement", args, undefined); }
export function soundBossFinale(...args) { return call("soundBossFinale", args, undefined); }
export function soundBossGrudge(...args) { return call("soundBossGrudge", args, undefined); }
export function soundBossKill(...args) { return call("soundBossKill", args, undefined); }
export function soundBossPhase2(...args) { return call("soundBossPhase2", args, undefined); }
export function soundBossWave(...args) { return call("soundBossWave", args, undefined); }
export function soundChainEscalate(...args) { return call("soundChainEscalate", args, undefined); }
export function soundCoinAt(...args) { return call("soundCoinAt", args, undefined); }
export function soundComboBreak(...args) { return call("soundComboBreak", args, undefined); }
export function soundComboTick(...args) { return call("soundComboTick", args, undefined); }
export function soundDash(...args) { return call("soundDash", args, undefined); }
export function soundDeath(...args) { return call("soundDeath", args, undefined); }
export function soundEmptyMag(...args) { return call("soundEmptyMag", args, undefined); }
export function soundEnemyDeathAt(...args) { return call("soundEnemyDeathAt", args, undefined); }
export function soundEnemyShootAt(...args) { return call("soundEnemyShootAt", args, undefined); }
export function soundEnemyTelegraph(...args) { return call("soundEnemyTelegraph", args, undefined); }
export function soundGamepadConnect(...args) { return call("soundGamepadConnect", args, undefined); }
export function soundGamepadDisconnect(...args) { return call("soundGamepadDisconnect", args, undefined); }
export function soundGrenadeAt(...args) { return call("soundGrenadeAt", args, undefined); }
export function soundHeartbeatPulse(...args) { return call("soundHeartbeatPulse", args, undefined); }
export function soundHitAt(...args) { return call("soundHitAt", args, undefined); }
export function soundLastStand(...args) { return call("soundLastStand", args, undefined); }
export function soundLevelUp(...args) { return call("soundLevelUp", args, undefined); }
export function soundLowAmmo(...args) { return call("soundLowAmmo", args, undefined); }
export function soundOperationObjective(...args) { return call("soundOperationObjective", args, undefined); }
export function soundOperationReinforcement(...args) { return call("soundOperationReinforcement", args, undefined); }
export function soundPerkSelect(...args) { return call("soundPerkSelect", args, undefined); }
export function soundPickupAt(...args) { return call("soundPickupAt", args, undefined); }
export function soundPlayerHurt(...args) { return call("soundPlayerHurt", args, undefined); }
export function soundPrecisionClick(...args) { return call("soundPrecisionClick", args, undefined); }
export function soundPrecisionLock(...args) { return call("soundPrecisionLock", args, undefined); }
export function soundReload(...args) { return call("soundReload", args, undefined); }
export function soundShoot(...args) { return call("soundShoot", args, undefined); }
export function soundShopDeny(...args) { return call("soundShopDeny", args, undefined); }
export function soundShopPurchase(...args) { return call("soundShopPurchase", args, undefined); }
export function soundSummonDismissed(...args) { return call("soundSummonDismissed", args, undefined); }
export function soundUIClose(...args) { return call("soundUIClose", args, undefined); }
export function soundUIConfirm(...args) { return call("soundUIConfirm", args, undefined); }
export function soundUIDeny(...args) { return call("soundUIDeny", args, undefined); }
export function soundUIHover(...args) { return call("soundUIHover", args, undefined); }
export function soundUIOpen(...args) { return call("soundUIOpen", args, undefined); }
export function soundUISelect(...args) { return call("soundUISelect", args, undefined); }
export function soundWaveAnnounce(...args) { return call("soundWaveAnnounce", args, undefined); }
export function soundWaveClear(...args) { return call("soundWaveClear", args, undefined); }
export function soundWeaponSwap(...args) { return call("soundWeaponSwap", args, undefined); }
export function startAmbient(...args) { return call("startAmbient", args, undefined); }
export function startMusic(...args) { return call("startMusic", args, undefined); }
export function stopAmbient(...args) { return call("stopAmbient", args, undefined); }
export function stopDangerDrone(...args) { return call("stopDangerDrone", args, undefined); }
export function stopMusic(...args) { return call("stopMusic", args, undefined); }
