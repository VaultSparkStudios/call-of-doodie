import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, STARTER_LOADOUTS, NEW_FEATURES, getWeeklyMutation, getWeeklyGauntlet } from "../constants.js";
import {
  loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress,
  getAccountLevel, getDailyChallengeSeed, hasDailyChallengeSubmitted, saveStudioGameEvent,
  loadRunHistory, loadRivalryHistory, loadStudioGameEvents,
} from "../storage.js";
import { buildCommandBrief, buildFrontDoorActionStack } from "../utils/menuGuidance.js";
import { buildMenuIntelligence, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { track } from "../utils/analytics.js";
import { isSupporter } from "../utils/supporter.js";

const DemoCanvas = lazy(() => import("./DemoCanvas.jsx"));
const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const MetaTreePanel = lazy(() => import("./MetaTreePanel.jsx"));
const SupporterModal = lazy(() => import("./SupporterModal.jsx"));
const MP_Rules          = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.RulesPanel })));
const MP_Controls       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.ControlsPanel })));
const MP_MostWanted     = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.MostWantedPanel })));
const MP_RunHistory     = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.RunHistoryPanel })));
const MP_LoadoutBuilder = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.LoadoutBuilderPanel })));
const MP_CareerStats    = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.CareerStatsPanel })));
const MP_Missions       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.MissionsPanel })));
const MP_Upgrades       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.UpgradesPanel })));
const MP_NewFeatures    = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.NewFeaturesPanel })));

const PANEL = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" };

const MODE_DEFS = [
  { id: "standard",        label: "NORMAL",        emoji: "🎯", color: "#FFD700", blurb: "Survive as long as you can" },
  { id: "score_attack",    label: "SCORE ATTACK",  emoji: "⏱",  color: "#FF6600", blurb: "5 min · faster spawns · max score" },
  { id: "daily_challenge", label: "DAILY",         emoji: "📅", color: "#00E5FF", blurb: "Same seed · global ranking" },
  { id: "cursed",          label: "CURSED",        emoji: "☠",  color: "#CC00FF", blurb: "All cursed perks · 3× score" },
  { id: "boss_rush",       label: "BOSS RUSH",     emoji: "☠",  color: "#FF3333", blurb: "Every wave is a boss" },
  { id: "speedrun",        label: "SPEEDRUN",      emoji: "⏱",  color: "#00FF80", blurb: "Race the clock · live timer" },
  { id: "gauntlet",        label: "GAUNTLET",      emoji: "🏆", color: "#FFC800", blurb: "Weekly fixed challenge · no shop" },
];

function currentModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode }) {
  if (bossRushMode) return "boss_rush";
  if (cursedRunMode) return "cursed";
  if (scoreAttackMode) return "score_attack";
  if (dailyChallengeMode) return "daily_challenge";
  if (speedrunMode) return "speedrun";
  if (gauntletMode) return "gauntlet";
  return "standard";
}

export default function HomeV2(props) {
  const {
    username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore,
    onStart, onRefreshLeaderboard, onChangeUsername,
    starterLoadout,
    gameSettings, onSaveSettings,
    gamepadConnected, controllerType,
    scoreAttackMode, onSetScoreAttackMode,
    dailyChallengeMode, onSetDailyChallengeMode,
    cursedRunMode, onSetCursedRunMode,
    bossRushMode, onSetBossRushMode,
    speedrunMode, onSetSpeedrunMode,
    gauntletMode, onSetGauntletMode,
    assistAvailable, onApplyAssist,
  } = props;

  const modeId = currentModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode });
  const selectedMode = MODE_DEFS.find(m => m.id === modeId) || MODE_DEFS[0];
  const selectedLoadout = STARTER_LOADOUTS.find(l => l.id === starterLoadout) || STARTER_LOADOUTS[0];
  const selectedDiff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;

  const [career, setCareer] = useState(null);
  const [meta, setMeta] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionProgress, setMissionProgress] = useState({});
  const [runHistory, setRunHistory] = useState([]);
  const [rivalryHistory, setRivalryHistory] = useState([]);
  const [studioEvents, setStudioEvents] = useState([]);
  const [customSeed, setCustomSeed] = useState("");
  const [challengeMode, setChallengeMode] = useState(null);
  const [tab, setTab] = useState("career");
  const [deployOpen, setDeployOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMetaTree, setShowMetaTree] = useState(false);
  const [showSupporter, setShowSupporter] = useState(false);
  const [tickerDismissed, setTickerDismissed] = useState(() => sessionStorage.getItem("cod-ticker-dismissed") === "1");
  const [showCareerStats, setShowCareerStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showMostWanted, setShowMostWanted] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showLoadoutBuilder, setShowLoadoutBuilder] = useState(false);
  const [showNewFeatures, setShowNewFeatures] = useState(false);
  const [cmdCenterExpanded, setCmdCenterExpanded] = useState(false);

  useEffect(() => {
    const loaded = loadCareerStats();
    setCareer(loaded);
    setMissions(getDailyMissions());
    setMissionProgress(loadMissionProgress());
    setMeta(loadMetaProgress());
    setRunHistory(loadRunHistory());
    setRivalryHistory(loadRivalryHistory());
    setStudioEvents(loadStudioGameEvents());
    // Auto-expand Command Center for returning players; first-timers see DEPLOY only
    if ((loaded?.totalRuns || 0) > 0) setCmdCenterExpanded(true);
    track("home_v2_view");
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get("seed");
    if (urlSeed && !isNaN(parseInt(urlSeed))) {
      setCustomSeed(urlSeed);
      const urlDiff = params.get("diff");
      if (urlDiff && Object.keys(DIFFICULTIES).includes(urlDiff)) setDifficulty(urlDiff);
      setChallengeMode({
        seed: urlSeed, diff: urlDiff || null,
        vs: params.get("vs") ? parseInt(params.get("vs")) : null,
        vsName: params.get("vsName") || null,
      });
    }
  }, [setDifficulty]);

  const accountLevel = career ? getAccountLevel(career.totalKills) : 1;
  const prestige = meta?.prestige || 0;
  const todaySeedStr = String(getDailyChallengeSeed());
  const dailyAlreadyPlayed = hasDailyChallengeSubmitted();
  const weeklyMutation = getWeeklyMutation();

  const commandBrief = useMemo(
    () => buildCommandBrief({ mode: modeId, selectedLoadout, weeklyMutation }),
    [modeId, selectedLoadout, weeklyMutation],
  );
  const runIntel = useMemo(
    () => buildMenuIntelligence({
      mode: modeId, selectedLoadout, missions, missionProgress, meta, career,
      challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
      dailyAlreadyPlayed, todaySeed: todaySeedStr, runHistory, rivalryHistory,
    }),
    [modeId, selectedLoadout, missions, missionProgress, meta, career, challengeMode, dailyAlreadyPlayed, todaySeedStr, runHistory, rivalryHistory],
  );
  const actionStack = useMemo(
    () => buildFrontDoorActionStack({
      challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
      dailyAlreadyPlayed,
      canSpendMeta: (meta?.careerPoints || 0) >= 10,
      incompleteMissionCount: missions.filter(m => !missionProgress[m.id]).length,
      selectedLoadout,
      currentModeLabel: selectedMode.label,
      todaySeed: todaySeedStr,
      totalRuns: career?.totalRuns || 0,
      unlocked: meta?.unlocked || [],
      meta,
      career: career || {},
    }),
    [challengeMode, dailyAlreadyPlayed, meta, missions, missionProgress, selectedLoadout, selectedMode.label, todaySeedStr, career],
  );
  const recommendedAction = actionStack[0];

  const recordFrontDoorAction = useCallback((actionId, extra = {}) => {
    const studioEvent = buildStudioGameEvent("front_door_action", {
      surface: "home_v2",
      actionId,
      mode: modeId,
      difficulty,
      loadout: selectedLoadout.id,
      focus: runIntel.focus,
      challengeActive: Boolean(challengeMode?.vs),
      dailyAlreadyPlayed,
      ...runIntel.telemetry,
      ...extra,
    });
    saveStudioGameEvent(studioEvent);
    return studioEvent;
  }, [challengeMode?.vs, dailyAlreadyPlayed, difficulty, modeId, runIntel.focus, runIntel.telemetry, selectedLoadout.id]);

  const selectMode = useCallback((id) => {
    const setters = {
      standard:        () => { onSetScoreAttackMode?.(false); onSetDailyChallengeMode?.(false); onSetCursedRunMode?.(false); onSetBossRushMode?.(false); onSetSpeedrunMode?.(false); onSetGauntletMode?.(false); },
      score_attack:    () => onSetScoreAttackMode?.(true),
      daily_challenge: () => onSetDailyChallengeMode?.(true),
      cursed:          () => onSetCursedRunMode?.(true),
      boss_rush:       () => onSetBossRushMode?.(true),
      speedrun:        () => onSetSpeedrunMode?.(true),
      gauntlet:        () => onSetGauntletMode?.(true),
    };
    (setters[id] || setters.standard)();
  }, [onSetScoreAttackMode, onSetDailyChallengeMode, onSetCursedRunMode, onSetBossRushMode, onSetSpeedrunMode, onSetGauntletMode]);

  const deploy = useCallback(() => {
    const seed = dailyChallengeMode ? todaySeedStr : (customSeed || undefined);
    const challenge = challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {};
    const studioEvent = recordFrontDoorAction("deploy", { source: "deploy_button", seed: seed || null });
    track("front_door_action", { actionId: "deploy", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    track("home_v2_deploy", { mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    onStart(seed, challenge);
  }, [challengeMode, customSeed, dailyChallengeMode, difficulty, modeId, onStart, recordFrontDoorAction, runIntel.focus, selectedLoadout.id, todaySeedStr]);

  const prefetchGame = useCallback(() => {
    // Best-effort: warm critical chunks on hover/focus
    import("./HUD.jsx").catch(() => {});
  }, []);

  const switchTab = useCallback((t) => { setTab(t); track("home_v2_tab", { tab: t }); }, []);

  const CMD_ACTIONS = useMemo(() => [
    () => { recordFrontDoorAction("open_career_stats", { source: "command_center" }); setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareerStats(true); },
    () => { recordFrontDoorAction("open_missions", { source: "command_center" }); setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); },
    () => { recordFrontDoorAction("open_upgrades", { source: "command_center" }); setMeta(loadMetaProgress()); setShowUpgrades(true); },
    () => { recordFrontDoorAction("open_meta_tree", { source: "command_center" }); setShowMetaTree(true); },
    () => { recordFrontDoorAction("open_run_history", { source: "command_center" }); setRunHistory(loadRunHistory()); setRivalryHistory(loadRivalryHistory()); setStudioEvents(loadStudioGameEvents()); setShowRunHistory(true); },
    () => { recordFrontDoorAction("open_loadouts", { source: "command_center" }); setShowLoadoutBuilder(true); },
    () => { recordFrontDoorAction("open_rules", { source: "command_center" }); setShowRules(true); },
    () => { recordFrontDoorAction("open_controls", { source: "command_center" }); setShowControls(true); },
    () => { recordFrontDoorAction("open_most_wanted", { source: "command_center" }); setShowMostWanted(true); },
    () => { recordFrontDoorAction("open_whats_new", { source: "command_center" }); setShowNewFeatures(true); },
  ], [recordFrontDoorAction]);

  const cmdBtnRefs = useRef([]);
  const cmdFocusIdx = useGamepadNav({
    count: CMD_ACTIONS.length,
    cols: 5,
    enabled: !!gamepadConnected,
    onConfirm: (i) => CMD_ACTIONS[i]?.(),
  });

  useEffect(() => {
    if (gamepadConnected) cmdBtnRefs.current[cmdFocusIdx]?.focus();
  }, [cmdFocusIdx, gamepadConnected]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const page = {
    width: "100%", height: "100dvh", margin: 0, overflow: "auto",
    background: "radial-gradient(ellipse at top, #1a0a05 0%, #0a0a0a 55%, #050505 100%)",
    fontFamily: "'Courier New', monospace", color: "#EEE", position: "relative",
    WebkitUserSelect: "none", userSelect: "none",
  };
  const gridBg = { position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.025) 49px,rgba(255,255,255,0.025) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.025) 49px,rgba(255,255,255,0.025) 50px)", pointerEvents: "none" };
  const wrap = { position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "14px 16px 28px" };
  const topBar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 };
  const brandRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: 3, color: "#888", fontWeight: 700 };
  const chip = { padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#CCC", cursor: "pointer", fontFamily: "inherit" };
  const iconBtn = { ...chip, padding: "4px 8px", fontSize: 14 };
  const hero = { textAlign: "center", marginBottom: 14 };
  const title = { fontSize: "clamp(40px,10vw,72px)", fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 24px rgba(255,107,0,0.45))" };
  const tag = { marginTop: 4, fontSize: "clamp(11px,2.4vw,15px)", color: "#FF6B35", letterSpacing: 4, fontWeight: 700 };
  const deployRow = { display: "flex", justifyContent: "center", alignItems: "stretch", gap: 0, margin: "18px auto 8px", maxWidth: 540 };
  const deployBtn = {
    flex: 1, padding: "18px 22px", fontSize: 22, fontWeight: 900, fontFamily: "'Courier New',monospace",
    background: "linear-gradient(180deg,#FF8A3D,#CC4400)", color: "#FFF",
    border: "none", borderRadius: "10px 0 0 10px", cursor: "pointer", letterSpacing: 3,
    boxShadow: "0 0 28px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  };
  const deployDropdownBtn = {
    padding: "18px 18px", fontSize: 14, fontWeight: 900, fontFamily: "'Courier New',monospace",
    background: "linear-gradient(180deg,#3a2012,#1a0f08)", color: selectedMode.color,
    border: "none", borderLeft: "1px solid rgba(255,255,255,0.14)", borderRadius: "0 10px 10px 0",
    cursor: "pointer", letterSpacing: 1, minWidth: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
  };
  const dropdownPanel = {
    position: "relative", margin: "6px auto 0", maxWidth: 540,
    background: "rgba(15,10,5,0.98)", border: "1px solid rgba(255,107,53,0.35)",
    borderRadius: 10, padding: 12, boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
  };
  const modeGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 6 };
  const modeCell = (active, color) => ({
    padding: "8px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    color: "#FFF",
  });
  const diffGrid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 };
  const diffCell = (active, color) => ({
    padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center", fontFamily: "inherit",
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    color: "#FFF", fontWeight: 900, fontSize: 12,
  });
  const quickRow = { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 };
  const quickBtn = { ...chip, padding: "8px 14px", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#EEE" };
  const tickerCard = {
    margin: "14px auto 0", maxWidth: 640, padding: "10px 14px",
    background: "linear-gradient(180deg,rgba(0,229,255,0.08),rgba(255,255,255,0.03))",
    border: "1px solid rgba(0,229,255,0.25)", borderRadius: 10,
    display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#DDEFFF", lineHeight: 1.4,
  };
  const tabsRow = { display: "flex", gap: 4, justifyContent: "center", marginTop: 22, flexWrap: "wrap" };
  const tabBtn = (active) => ({
    padding: "8px 16px", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, fontFamily: "inherit", cursor: "pointer",
    background: active ? "rgba(255,107,53,0.12)" : "transparent",
    border: active ? "1px solid rgba(255,107,53,0.5)" : "1px solid rgba(255,255,255,0.1)",
    color: active ? "#FF9960" : "#AAA", borderRadius: 8,
  });
  const tabBody = { marginTop: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 };
  const footer = { marginTop: 22, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "#777", letterSpacing: 1, flexWrap: "wrap" };
  const linkBtn = { background: "none", border: "none", color: isSupporter() ? "#FFD700" : "#888", fontSize: 10, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline dotted", letterSpacing: 1 };

  const intelLine = !tickerDismissed && runIntel?.directive ? runIntel.directive : null;

  return (
    <div style={page}>
      <div style={gridBg} />
      <Suspense fallback={null}>
        <DemoCanvas opacity={0.28} />
      </Suspense>
      <div style={wrap}>

        {/* Top bar */}
        <div style={topBar}>
          <div style={brandRow}>
            <span aria-hidden>💩</span>
            <span>VAULTSPARK · CALL OF DOODIE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={chip} onClick={onChangeUsername} title="Change callsign">
              @{username} <span style={{ color: "#888" }}>▾</span>
            </span>
            <span style={{ ...chip, cursor: "default", background: prestige > 0 ? "rgba(255,215,0,0.15)" : chip.background, borderColor: prestige > 0 ? "rgba(255,215,0,0.45)" : chip.border, color: prestige > 0 ? "#FFD700" : "#CCC" }}>
              {prestige > 0 ? `P${prestige} · ` : ""}LVL {accountLevel}
            </span>
            {gamepadConnected && (
              <span style={{ ...chip, color: controllerType === "xbox" ? "#4DBD61" : controllerType === "ps" ? "#6699FF" : "#CCC" }} title="Controller connected">🎮</span>
            )}
            <button style={iconBtn} onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
            <button style={iconBtn} onClick={() => switchTab("codex")} aria-label="Help / Codex">❓</button>
          </div>
        </div>

        {/* Hero */}
        <div style={hero}>
          <h1 style={title}>CALL OF DOODIE</h1>
          <div style={tag}>MODERN WARFARE ON MOM'S WIFI</div>
        </div>

        {/* DEPLOY split-button */}
        <div style={deployRow}>
          <button
            onClick={deploy}
            onMouseEnter={prefetchGame}
            onFocus={prefetchGame}
            aria-label={`Deploy — ${selectedMode.label}, ${selectedDiff.label}`}
            style={deployBtn}
          >
            ▶ DEPLOY
          </button>
          <button
            onClick={() => setDeployOpen(o => !o)}
            aria-label="Change mode or difficulty"
            aria-expanded={deployOpen}
            style={deployDropdownBtn}
          >
            <span style={{ fontSize: 11, color: selectedMode.color, letterSpacing: 1 }}>
              {selectedMode.emoji} {selectedMode.label}
            </span>
            <span style={{ fontSize: 10, color: selectedDiff.color }}>
              {selectedDiff.emoji} {selectedDiff.label} {deployOpen ? "▴" : "▾"}
            </span>
          </button>
        </div>

        {/* Deploy dropdown */}
        {deployOpen && (
          <div style={dropdownPanel}>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 6 }}>MODE</div>
            <div style={modeGrid}>
              {MODE_DEFS.map(m => (
                <button key={m.id} onClick={() => selectMode(m.id)} style={modeCell(modeId === m.id, m.color)}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: m.color }}>{m.emoji} {m.label}</div>
                  <div style={{ fontSize: 9, color: "#AAA", marginTop: 2 }}>{m.blurb}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, margin: "12px 0 6px" }}>DIFFICULTY</div>
            <div style={diffGrid}>
              {Object.entries(DIFFICULTIES).map(([k, d]) => (
                <button key={k} onClick={() => setDifficulty(k)} style={diffCell(difficulty === k, d.color)}>
                  <div style={{ color: d.color }}>{d.emoji}</div>
                  <div>{d.label}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>SEED</label>
              <input
                value={customSeed}
                onChange={e => setCustomSeed(e.target.value.replace(/\D/g, ""))}
                placeholder="optional"
                maxLength={6}
                style={{ width: 120, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, color: "#EEE", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>Loadout: <strong style={{ color: selectedLoadout.color }}>{selectedLoadout.emoji} {selectedLoadout.name}</strong></span>
            </div>
          </div>
        )}

        {/* Quick chips */}
        <div style={quickRow}>
          <button style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.4)", color: "#00E5FF" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("daily_challenge", { source: "quick_chip", seed: todaySeedStr });
            track("front_door_action", { actionId: "daily_challenge", surface: "home_v2", mode: "daily_challenge", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetDailyChallengeMode?.(true);
            onStart(todaySeedStr, {});
          }}>
            📅 {dailyAlreadyPlayed ? "DAILY (REPLAY)" : `DAILY #${todaySeedStr}`}
          </button>
          <button style={{ ...quickBtn, borderColor: "rgba(255,200,0,0.4)", color: "#FFC800" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("gauntlet_focus", { source: "quick_chip" });
            track("front_door_action", { actionId: "gauntlet_focus", surface: "home_v2", mode: "gauntlet", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetGauntletMode?.(true);
            getWeeklyGauntlet();
          }}>
            🏆 GAUNTLET
          </button>
          <button style={quickBtn} onClick={() => {
            const studioEvent = recordFrontDoorAction("open_leaderboard", { source: "quick_chip" });
            track("front_door_action", { actionId: "open_leaderboard", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onRefreshLeaderboard();
            setShowLeaderboard(true);
          }}>
            ⚔️ LEADERBOARD
          </button>
          <button style={quickBtn} onClick={() => {
            const studioEvent = recordFrontDoorAction("open_achievements", { source: "quick_chip" });
            track("front_door_action", { actionId: "open_achievements", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            setShowAchievements(true);
          }}>
            🏅 ACHIEVEMENTS
          </button>
          {assistAvailable && (
            <button style={{ ...quickBtn, borderColor: "rgba(68,255,136,0.5)", color: "#44FF88" }} onClick={onApplyAssist}>
              🛡️ ASSIST +50HP
            </button>
          )}
        </div>

        {/* Command Center — full panel access */}
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setCmdCenterExpanded(v => !v)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "#888", letterSpacing: 2, fontWeight: 900, textAlign: "center", marginBottom: cmdCenterExpanded ? 8 : 0, fontFamily: "inherit", padding: 0 }}
            aria-expanded={cmdCenterExpanded}
          >
            ⚙ COMMAND CENTER {cmdCenterExpanded ? "▴" : "▾"}
          </button>
          {cmdCenterExpanded && <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              ["📊 STATS",       CMD_ACTIONS[0]],
              ["📋 MISSIONS",    CMD_ACTIONS[1]],
              ["🎖️ UPGRADES",   CMD_ACTIONS[2]],
              ["🌳 META TREE",   CMD_ACTIONS[3]],
              ["📜 HISTORY",     CMD_ACTIONS[4]],
              ["⚙️ LOADOUTS",   CMD_ACTIONS[5]],
              ["📜 RULES",       CMD_ACTIONS[6]],
              ["⌨ CONTROLS",    CMD_ACTIONS[7]],
              ["👾 MOST WANTED", CMD_ACTIONS[8]],
              ["✦ WHAT'S NEW",   CMD_ACTIONS[9]],
            ].map(([label, action], i) => (
              <button
                key={label}
                ref={el => { cmdBtnRefs.current[i] = el; }}
                style={{
                  ...quickBtn,
                  ...(gamepadConnected && cmdFocusIdx === i ? { borderColor: "rgba(0,229,255,0.7)", outline: "2px solid rgba(0,229,255,0.5)", outlineOffset: 1 } : {}),
                }}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>}
        </div>

        {/* Intel Ticker — merges Command Brief + Run Intel + Recommended Action */}
        {intelLine && (
          <div style={tickerCard} role="status" aria-live="polite">
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#7FE6FF" }}>{runIntel.focus.replace(/_/g, " ").toUpperCase()}:</strong>{" "}
              {runIntel.directive}
              {recommendedAction?.title && (
                <span style={{ color: "#AAA" }}> · <em>{recommendedAction.title}</em></span>
              )}
            </span>
            <details style={{ fontSize: 10, color: "#7FE6FF", cursor: "pointer" }}>
              <summary style={{ outline: "none" }}>(?)</summary>
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,0,0,0.4)", borderRadius: 6, color: "#CCC", fontSize: 11, maxWidth: 340 }}>
                <div style={{ fontWeight: 900, color: "#FFB36B", marginBottom: 4 }}>COMMAND BRIEF</div>
                {commandBrief.map((l, i) => <div key={i}>{i + 1}. {l}</div>)}
                {runIntel.recommendation && <div style={{ marginTop: 6, color: "#8FEFFF" }}>{runIntel.recommendation}</div>}
              </div>
            </details>
            <button onClick={() => { sessionStorage.setItem("cod-ticker-dismissed", "1"); setTickerDismissed(true); }} aria-label="Dismiss intel" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Challenge link banner */}
        {challengeMode && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.45)", color: "#FFD7B8" }}>
            <span style={{ fontSize: 14 }}>⚔️</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#FF6B35" }}>CHALLENGE:</strong> Seed #{challengeMode.seed}
              {challengeMode.vs && (<> · Beat {challengeMode.vsName ? `@${challengeMode.vsName}` : "rival"}: <strong>{challengeMode.vs.toLocaleString()}</strong></>)}
            </span>
            <button onClick={() => { setCustomSeed(""); setChallengeMode(null); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Weekly mutation banner */}
        {weeklyMutation && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,180,0,0.06)", borderColor: "rgba(255,180,0,0.3)", color: "#FFE8B3" }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#FFB300" }}>THIS WEEK'S MUTATION:</strong> {weeklyMutation.emoji} {weeklyMutation.name} — <span style={{ color: "#CCC" }}>{weeklyMutation.desc}</span>
            </span>
          </div>
        )}

        {/* Tabbed nav */}
        <div style={tabsRow}>
          {["career", "codex", "settings", "support"].map(t => (
            <button key={t} style={tabBtn(tab === t)} onClick={() => switchTab(t)}>
              {t === "career" && "📊 CAREER"}
              {t === "codex" && "📖 CODEX"}
              {t === "settings" && "⚙ SETTINGS"}
              {t === "support" && "❤️ SUPPORT"}
            </button>
          ))}
        </div>
        <div style={tabBody}>
          {tab === "career" && <CareerTab career={career} meta={meta} missions={missions} missionProgress={missionProgress} onOpenMetaTree={() => setShowMetaTree(true)} />}
          {tab === "codex" && <CodexTab />}
          {tab === "settings" && (
            <div style={{ textAlign: "center" }}>
              <button style={{ ...quickBtn, padding: "10px 20px" }} onClick={() => setShowSettings(true)}>⚙ OPEN SETTINGS PANEL</button>
              <div style={{ fontSize: 10, color: "#888", marginTop: 10 }}>Audio, visuals, accessibility, controls, colorblind + reduced-motion modes</div>
            </div>
          )}
          {tab === "support" && (
            <SupportTab onOpen={() => setShowSupporter(true)} />
          )}
        </div>

        {/* Footer */}
        <div style={footer}>
          <span>A <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ color: "#999", textDecoration: "none" }}>VaultSpark Studios</a> Game</span>
          <button style={linkBtn} onClick={() => setShowSupporter(true)}>{isSupporter() ? "⭐ SUPPORTER" : "❤️ SUPPORT THE DEV"}</button>
          <span style={{ color: "#555" }}>© 2026 VaultSpark Studios</span>
        </div>
      </div>

      {/* Modals (lazy) */}
      {showLeaderboard && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
          </Suspense>
        </div>
      )}
      {showAchievements && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => setShowAchievements(false)} />
          </Suspense>
        </div>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel settings={gameSettings} onSave={onSaveSettings} onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
      {showMetaTree && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <MetaTreePanel onClose={() => setShowMetaTree(false)} />
          </Suspense>
        </div>
      )}
      {showSupporter && (
        <Suspense fallback={null}>
          <SupporterModal onClose={() => setShowSupporter(false)} />
        </Suspense>
      )}
      {showCareerStats && (
        <Suspense fallback={null}>
          <MP_CareerStats career={career} meta={meta} onClose={() => setShowCareerStats(false)} />
        </Suspense>
      )}
      {showRules && (
        <Suspense fallback={null}>
          <MP_Rules onClose={() => setShowRules(false)} />
        </Suspense>
      )}
      {showControls && (
        <Suspense fallback={null}>
          <MP_Controls isMobile={isMobile} controllerType={controllerType} onClose={() => setShowControls(false)} />
        </Suspense>
      )}
      {showMostWanted && (
        <Suspense fallback={null}>
          <MP_MostWanted onClose={() => setShowMostWanted(false)} />
        </Suspense>
      )}
      {showMissions && (
        <Suspense fallback={null}>
          <MP_Missions missions={missions} missionProgress={missionProgress} onClose={() => setShowMissions(false)} />
        </Suspense>
      )}
      {showUpgrades && (
        <Suspense fallback={null}>
          <MP_Upgrades meta={meta} accountLevel={accountLevel} onClose={() => { setMeta(loadMetaProgress()); setShowUpgrades(false); }} />
        </Suspense>
      )}
      {showRunHistory && (
        <Suspense fallback={null}>
          <MP_RunHistory runHistory={runHistory} rivalryHistory={rivalryHistory} studioEvents={studioEvents} onClose={() => setShowRunHistory(false)} />
        </Suspense>
      )}
      {showLoadoutBuilder && (
        <Suspense fallback={null}>
          <MP_LoadoutBuilder onClose={() => setShowLoadoutBuilder(false)} />
        </Suspense>
      )}
      {showNewFeatures && (
        <Suspense fallback={null}>
          <MP_NewFeatures onClose={() => setShowNewFeatures(false)} />
        </Suspense>
      )}
    </div>
  );
}

function CareerTab({ career, meta, missions, missionProgress, onOpenMetaTree }) {
  if (!career) return <div style={{ color: "#888", textAlign: "center" }}>Loading…</div>;
  const incomplete = (missions || []).filter(m => !missionProgress[m.id]).length;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
        <StatChip label="TOTAL KILLS" value={(career.totalKills || 0).toLocaleString()} />
        <StatChip label="BEST WAVE" value={career.bestWave || 0} />
        <StatChip label="BEST SCORE" value={(career.bestScore || 0).toLocaleString()} />
        <StatChip label="CAREER PTS" value={(meta?.careerPoints || 0).toLocaleString()} />
        <StatChip label="PRESTIGE" value={`P${meta?.prestige || 0}`} />
        <StatChip label="MISSIONS" value={`${(missions?.length || 0) - incomplete}/${missions?.length || 0}`} />
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onOpenMetaTree} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.35)", color: "#FFD700", borderRadius: 8 }}>🌳 META TREE</button>
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: "#888", textAlign: "center" }}>
        Daily missions: <strong style={{ color: incomplete > 0 ? "#FFD700" : "#00FF88" }}>{incomplete}</strong> incomplete
      </div>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 9, color: "#888", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#EEE", marginTop: 3 }}>{value}</div>
    </div>
  );
}

function CodexTab() {
  const [section, setSection] = useState("arsenal");
  const btn = (active) => ({ padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: active ? "rgba(255,107,53,0.14)" : "transparent", border: "1px solid " + (active ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.12)"), color: active ? "#FF9960" : "#AAA", borderRadius: 6 });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <button style={btn(section === "arsenal")}  onClick={() => setSection("arsenal")}>🔫 ARSENAL</button>
        <button style={btn(section === "mostwanted")} onClick={() => setSection("mostwanted")}>👾 MOST WANTED</button>
        <button style={btn(section === "rules")}    onClick={() => setSection("rules")}>📜 RULES</button>
        <button style={btn(section === "news")}     onClick={() => setSection("news")}>✦ WHAT'S NEW</button>
      </div>
      {section === "arsenal" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
          {WEAPONS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
              <span style={{ width: 20, textAlign: "center" }}>{w.emoji}</span>
              <span style={{ fontWeight: 800, color: w.color, minWidth: 80 }}>{w.name}</span>
              <span style={{ color: "#888", fontSize: 9 }}>[{i + 1}]</span>
              <span style={{ color: "#AAA", fontSize: 10, fontStyle: "italic", marginLeft: "auto", textAlign: "right" }}>{w.desc}</span>
            </div>
          ))}
        </div>
      )}
      {section === "mostwanted" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
          {ENEMY_TYPES.map((e, i) => (
            <div key={i} style={{ padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{e.emoji}</div>
              <div style={{ fontWeight: 800, color: e.color, fontSize: 11 }}>{e.name}</div>
              <div style={{ color: "#888", fontSize: 9 }}>HP {e.hp} · SPD {e.speed}</div>
            </div>
          ))}
        </div>
      )}
      {section === "rules" && (
        <div style={{ fontSize: 12, color: "#CCC", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          <p>🎯 <strong>Move</strong> with WASD / left stick · <strong>Aim</strong> with mouse / right stick.</p>
          <p>💨 <strong>Dash</strong> (Shift / A button) — Invincible dodge. <strong>Grenade</strong> (Space / B) — AOE.</p>
          <p>🔢 <strong>Weapon keys 1–9</strong> swap · <strong>R</strong> reloads · <strong>Esc</strong> pauses.</p>
          <p>⚠️ Boss every 5 waves. Perks unlock on level-up. Wave shop between waves.</p>
          <p>💩 Earn Doodie Coins for streaks — spend in the wave shop.</p>
        </div>
      )}
      {section === "news" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {NEW_FEATURES.slice().reverse().slice(0, 20).map((f, i) => {
            const parts = f.split(" — ");
            const head = parts[0];
            const rest = parts.slice(1);
            return (
              <div key={i} style={{ padding: "8px 10px", fontSize: 11, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 6 }}>
                <strong style={{ color: "#FF9960" }}>{head}</strong>
                {rest.length > 0 && <span style={{ color: "#BBB" }}> — {rest.join(" — ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupportTab({ onOpen }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: "#CCC", lineHeight: 1.7 }}>
      <div style={{ fontSize: 32 }}>❤️</div>
      <p>Call of Doodie is free. Always will be.</p>
      <p style={{ fontSize: 11, color: "#AAA" }}>If you want to see more — a cosmetic ⭐ badge on the leaderboard helps keep the servers running.</p>
      <button onClick={onOpen} style={{ marginTop: 8, padding: "10px 22px", fontSize: 12, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 8, letterSpacing: 1 }}>
        ☕ KO-FI · SUPPORT
      </button>
    </div>
  );
}
