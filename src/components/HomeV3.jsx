import { lazy, useEffect, useMemo, useState } from "react";
import AsyncPanelBoundary from "./AsyncPanelBoundary.jsx";
import {
  DIFFICULTIES,
  STARTER_LOADOUTS,
  getWeeklyGauntlet,
} from "../constants.js";
import {
  getAccountLevel,
  getDailyChallengeSeed,
  getDailyMissions,
  loadCareerStats,
  loadMetaProgress,
  loadMissionProgress,
  loadRivalryHistory,
  loadRunHistory,
  loadStudioGameEvents,
} from "../storage.js";
import { isSupporter } from "../utils/supporter.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "../utils/theme.js";
import { track } from "../utils/analytics.js";
import "./home-v3.css";

const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const MetaTreePanel = lazy(() => import("./MetaTreePanel.jsx"));
const SupporterModal = lazy(() => import("./SupporterModal.jsx"));
const RulesPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.RulesPanel })));
const ControlsPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.ControlsPanel })));
const EnemiesPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.MostWantedPanel })));
const RunHistoryPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.RunHistoryPanel })));
const LoadoutPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.LoadoutBuilderPanel })));
const StatsPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.CareerStatsPanel })));
const MissionsPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.MissionsPanel })));
const UpgradesPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.UpgradesPanel })));
const NewsPanel = lazy(() => import("./MenuPanels.jsx").then((module) => ({ default: module.NewFeaturesPanel })));

const MODES = [
  { id: "standard", label: "Standard Run", short: "Standard", description: "Survive escalating waves and build a powerful loadout.", icon: "▶" },
  { id: "daily_challenge", label: "Daily Challenge", short: "Daily", description: "The same seeded run for every player today.", icon: "◈" },
  { id: "gauntlet", label: "Weekly Gauntlet", short: "Gauntlet", description: "A fixed weekly opening kit with no shop.", icon: "◆" },
  { id: "boss_rush", label: "Boss Rush", short: "Boss Rush", description: "Face boss pressure on every wave.", icon: "⚠" },
  { id: "score_attack", label: "Score Attack", short: "Score", description: "Five minutes, faster spawns, maximum score.", icon: "⌁" },
  { id: "speedrun", label: "Speed Run", short: "Speed", description: "Race the clock with a live timer.", icon: "»" },
  { id: "cursed", label: "Cursed Run", short: "Cursed", description: "Hard modifiers with a three-times score multiplier.", icon: "✦" },
];

function currentMode(props) {
  if (props.bossRushMode) return "boss_rush";
  if (props.cursedRunMode) return "cursed";
  if (props.scoreAttackMode) return "score_attack";
  if (props.dailyChallengeMode) return "daily_challenge";
  if (props.speedrunMode) return "speedrun";
  if (props.gauntletMode) return "gauntlet";
  return "standard";
}

export default function HomeV3(props) {
  const {
    username,
    difficulty,
    setDifficulty,
    isMobile,
    leaderboard,
    lbLoading,
    lbHasMore,
    onLoadMore,
    onStart,
    onRefreshLeaderboard,
    onChangeUsername,
    starterLoadout,
    setStarterLoadout,
    gameSettings,
    onSaveSettings,
    onSetVisualPack,
    controllerType,
    onReplayTraining,
    onInstallApp,
  } = props;

  const [theme, setTheme] = useState(() => readTheme());
  const [activeSection, setActiveSection] = useState("play");
  const [modeOpen, setModeOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [career, setCareer] = useState(() => loadCareerStats());
  const [meta, setMeta] = useState(() => loadMetaProgress());
  const [missions, setMissions] = useState(() => getDailyMissions());
  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());
  const [customSeed, setCustomSeed] = useState("");

  const modeId = currentMode(props);
  const selectedMode = MODES.find((mode) => mode.id === modeId) || MODES[0];
  const selectedDifficulty = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const selectedLoadout = STARTER_LOADOUTS.find((loadout) => loadout.id === starterLoadout) || STARTER_LOADOUTS[0];
  const accountLevel = getAccountLevel(career?.totalKills || 0);
  const todaySeed = String(getDailyChallengeSeed());
  const gauntlet = useMemo(() => getWeeklyGauntlet(), []);
  const firstRun = (career?.totalRuns || 0) === 0;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const refreshProgress = () => {
    setCareer(loadCareerStats());
    setMeta(loadMetaProgress());
    setMissions(getDailyMissions());
    setMissionProgress(loadMissionProgress());
  };

  const setMode = (nextMode) => {
    props.onSetScoreAttackMode?.(nextMode === "score_attack");
    props.onSetDailyChallengeMode?.(nextMode === "daily_challenge");
    props.onSetCursedRunMode?.(nextMode === "cursed");
    props.onSetBossRushMode?.(nextMode === "boss_rush");
    props.onSetSpeedrunMode?.(nextMode === "speedrun");
    props.onSetGauntletMode?.(nextMode === "gauntlet");
  };

  const start = (override = {}) => {
    const seed = override.seed ?? customSeed;
    if (override.mode) setMode(override.mode);
    track("front_door_action", {
      actionId: override.actionId || "start_run",
      surface: "home_v3",
      mode: override.mode || modeId,
      difficulty,
      loadout: selectedLoadout.id,
    });
    onStart(seed || undefined);
  };

  const openProgressPanel = (name) => {
    refreshProgress();
    setPanel(name);
  };

  const primaryCards = [
    { id: "daily", icon: "◈", title: "Daily Challenge", detail: `Seed ${todaySeed}`, action: () => start({ mode: "daily_challenge", seed: todaySeed, actionId: "daily_challenge" }) },
    { id: "gauntlet", icon: "◆", title: "Weekly Gauntlet", detail: gauntlet?.name || "Fixed weekly opening kit", action: () => start({ mode: "gauntlet", actionId: "weekly_gauntlet" }) },
    { id: "training", icon: "◎", title: "Training Run", detail: "Practice movement and aim", action: () => onReplayTraining?.() },
  ];

  return (
    <div className="home3" data-theme={theme} data-testid="home-v3-shell">
      <div className="home3__atmosphere" aria-hidden="true" />
      <header className="home3__header">
        <a className="home3__studio" href="https://vaultsparkstudios.com/" target="_blank" rel="author">
          <span aria-hidden="true">💩</span>
          <span>VaultSpark Studios</span>
        </a>
        <div className="home3__profile">
          <button className="home3__profile-button" onClick={onChangeUsername} aria-label="Edit display name">
            <span className="home3__avatar" aria-hidden="true">{username === "Guest" ? "G" : username.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{username === "Guest" ? "Guest" : username}</strong>
              <small>Level {accountLevel}</small>
            </span>
          </button>
          <button className="home3__icon-button" onClick={() => setTheme((current) => nextTheme(current))} aria-label={`Switch to ${THEMES[nextTheme(theme)].label} theme`} data-theme-toggle>
            {THEMES[theme].icon}
          </button>
          <button className="home3__icon-button" onClick={() => setPanel("settings")} aria-label="Open settings">⚙</button>
        </div>
      </header>

      <main className="home3__layout">
        <section className={`home3__play ${activeSection === "play" ? "is-active" : ""}`} aria-labelledby="home3-title">
          <div className="home3__eyebrow">Comedy roguelite shooter</div>
          <h1 id="home3-title">CALL OF DOODIE</h1>
          <p className="home3__lede">Survive absurd enemies, build ridiculous weapons, and chase a better run.</p>

          {firstRun && (
            <div className="home3__new-player">
              <div>
                <strong>New player guide</strong>
                <span>Start with a training run, or jump straight into Standard.</span>
              </div>
              <button onClick={() => onReplayTraining?.()}>Start Training</button>
            </div>
          )}

          <div className="home3__start-group">
            <button className="home3__start" data-testid="front-door-deploy" onClick={() => start()} aria-label={`Start run — ${selectedMode.label}, ${selectedDifficulty.label} difficulty`}>
              <span aria-hidden="true">▶</span>
              <span>
                <strong>START RUN</strong>
                <small>{selectedMode.label}</small>
              </span>
            </button>
            <button className="home3__mode-button" onClick={() => setModeOpen((open) => !open)} aria-expanded={modeOpen} aria-label="Choose mode and difficulty">
              <span>{selectedMode.short}</span>
              <small>{selectedDifficulty.label} Difficulty</small>
              <b aria-hidden="true">{modeOpen ? "▲" : "▼"}</b>
            </button>
          </div>

          <div data-testid="visual-pack-selector" aria-label="Character visual pack" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, opacity: 0.72 }}>CHARACTER VISUALS</span>
            {[{ id: "modern", label: "Modern Atlas" }, { id: "retro", label: "Retro Original" }].map(pack => {
              const selected = (gameSettings?.visualPack || "modern") === pack.id;
              return <button key={pack.id} type="button" aria-pressed={selected} onClick={() => onSetVisualPack?.(pack.id)} style={{ border: selected ? "1px solid #FFB36B" : "1px solid rgba(255,255,255,0.16)", background: selected ? "rgba(255,107,53,0.14)" : "rgba(255,255,255,0.04)", color: "inherit", borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontWeight: 750 }}>{pack.label}</button>;
            })}
          </div>

          {modeOpen && (
            <div className="home3__mode-drawer">
              <div className="home3__drawer-heading">
                <div><strong>Choose a mode</strong><span>Every mode uses the same core controls.</span></div>
                <button onClick={() => setModeOpen(false)} aria-label="Close mode selector">×</button>
              </div>
              <div className="home3__mode-grid">
                {MODES.map((mode) => (
                  <button key={mode.id} className={mode.id === modeId ? "is-selected" : ""} onClick={() => setMode(mode.id)}>
                    <span aria-hidden="true">{mode.icon}</span>
                    <strong>{mode.label}</strong>
                    <small>{mode.description}</small>
                  </button>
                ))}
              </div>
              <div className="home3__run-options">
                <label>
                  <span>Difficulty</span>
                  <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                    {Object.entries(DIFFICULTIES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Starter loadout</span>
                  <select value={starterLoadout} onChange={(event) => setStarterLoadout?.(event.target.value)}>
                    {STARTER_LOADOUTS.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Seed (optional)</span>
                  <input inputMode="numeric" maxLength={6} value={customSeed} onChange={(event) => setCustomSeed(event.target.value.replace(/\D/g, ""))} placeholder="Random" />
                </label>
              </div>
            </div>
          )}

          <div className="home3__quick-grid" aria-label="Quick play">
            {primaryCards.map((card) => (
              <button key={card.id} onClick={card.action}>
                <span aria-hidden="true">{card.icon}</span>
                <strong>{card.title}</strong>
                <small>{card.detail}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className={`home3__progress ${activeSection === "progress" ? "is-active" : ""}`} aria-labelledby="progress-title">
          <div className="home3__section-heading">
            <span>Profile & Progress</span>
            <button onClick={() => openProgressPanel("stats")}>View all</button>
          </div>
          <h2 id="progress-title">{firstRun ? "Your first run starts here." : `Welcome back, ${username}.`}</h2>
          <p>{firstRun ? "Learn the controls in play, not in a registration form." : `Best wave ${career?.bestWave || 0} · Best score ${(career?.bestScore || 0).toLocaleString()}`}</p>
          <div className="home3__stats">
            <div><strong>{(career?.totalKills || 0).toLocaleString()}</strong><span>Total kills</span></div>
            <div><strong>{meta?.careerPoints || 0}</strong><span>Upgrade points</span></div>
            <div><strong>{career?.achievementsEver?.length || 0}</strong><span>Achievements</span></div>
          </div>
          <div className="home3__next-action">
            <span>Next up</span>
            <strong>{firstRun ? "Complete one Standard run" : `${missions.filter((_, index) => !missionProgress[index]).length} daily missions remaining`}</strong>
            <button onClick={() => firstRun ? start() : openProgressPanel("missions")}>{firstRun ? "Start Run" : "View Missions"}</button>
          </div>
        </aside>

        <section className={`home3__section home3__challenges ${activeSection === "challenges" ? "is-active" : ""}`}>
          <div className="home3__section-heading"><span>Challenges</span></div>
          <div className="home3__action-list">
            {primaryCards.slice(0, 2).map((card) => <button key={card.id} onClick={card.action}><span>{card.icon}</span><span><strong>{card.title}</strong><small>{card.detail}</small></span><b>›</b></button>)}
            <button onClick={() => setPanel("leaderboard")}><span>⚔</span><span><strong>Leaderboard</strong><small>Compare public runs</small></span><b>›</b></button>
            <button onClick={() => setPanel("achievements")}><span>★</span><span><strong>Achievements</strong><small>Track skill milestones</small></span><b>›</b></button>
          </div>
        </section>

        <section className={`home3__section home3__library ${activeSection === "more" ? "is-active" : ""}`}>
          <div className="home3__section-heading"><span>Explore</span></div>
          <div className="home3__library-grid">
            <button onClick={() => setPanel("rules")}><span>?</span><strong>How to Play</strong></button>
            <button onClick={() => setPanel("controls")}><span>⌨</span><strong>Controls</strong></button>
            <button onClick={() => setPanel("enemies")}><span>☠</span><strong>Enemies</strong></button>
            <button onClick={() => openProgressPanel("loadouts")}><span>⚙</span><strong>Loadouts</strong></button>
            <button onClick={() => openProgressPanel("upgrades")}><span>↑</span><strong>Permanent Upgrades</strong></button>
            <button onClick={() => openProgressPanel("history")}><span>↺</span><strong>Run History</strong></button>
            {onInstallApp && <button onClick={onInstallApp}><span>＋</span><strong>Install Game</strong></button>}
            <button onClick={() => setPanel("support")}><span>♥</span><strong>{isSupporter(username) ? "Supporter" : "Support"}</strong></button>
          </div>
        </section>
      </main>

      <nav className="home3__mobile-nav" aria-label="Main menu sections">
        {[
          ["play", "▶", "Play"],
          ["challenges", "◆", "Challenges"],
          ["progress", "↑", "Progress"],
          ["more", "•••", "More"],
        ].map(([id, icon, label]) => (
          <button key={id} className={activeSection === id ? "is-active" : ""} onClick={() => setActiveSection(id)}><span>{icon}</span><strong>{label}</strong></button>
        ))}
      </nav>

      <footer className="home3__footer">
        <div>
          <a href="/play/">Play</a><a href="/about/">About</a><a href="/how-to-play/">How to Play</a><a href="/enemies/">Enemies</a><a href="/accessibility/">Accessibility</a><a href="/support/">Support</a>
        </div>
        <div>
          <a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a><a href="/ip/">Rights &amp; IP</a>
        </div>
        <p>© 2026 VaultSpark Studios LLC. All rights reserved.</p>
      </footer>

      {panel && (
        <AsyncPanelBoundary>
          <HomePanel
            panel={panel}
            close={() => setPanel(null)}
            career={career}
            meta={meta}
            missions={missions}
            missionProgress={missionProgress}
            accountLevel={accountLevel}
            isMobile={isMobile}
            controllerType={controllerType}
            leaderboard={leaderboard}
            lbLoading={lbLoading}
            lbHasMore={lbHasMore}
            onLoadMore={onLoadMore}
            onRefreshLeaderboard={onRefreshLeaderboard}
            username={username}
            gameSettings={gameSettings}
            onSaveSettings={onSaveSettings}
            refreshProgress={refreshProgress}
            onStart={onStart}
          />
        </AsyncPanelBoundary>
      )}
    </div>
  );
}

function HomePanel(props) {
  const { panel, close } = props;
  if (panel === "leaderboard") return <div className="home3__modal"><LeaderboardPanel leaderboard={props.leaderboard} lbLoading={props.lbLoading} lbHasMore={props.lbHasMore} onLoadMore={props.onLoadMore} onRefresh={props.onRefreshLeaderboard} username={props.username} onClose={close} /></div>;
  if (panel === "achievements") return <div className="home3__modal"><AchievementsPanel achievementsUnlocked={props.career?.achievementsEver || []} onClose={close} /></div>;
  if (panel === "settings") return <SettingsPanel settings={props.gameSettings} onSave={props.onSaveSettings} onClose={close} />;
  if (panel === "support") return <SupporterModal callsign={props.username} onClose={close} />;
  if (panel === "stats") return <StatsPanel career={props.career} meta={props.meta} onClose={close} />;
  if (panel === "missions") return <MissionsPanel missions={props.missions} missionProgress={props.missionProgress} onClose={close} />;
  if (panel === "upgrades") return <UpgradesPanel meta={props.meta} accountLevel={props.accountLevel} onClose={() => { props.refreshProgress(); close(); }} />;
  if (panel === "meta") return <div className="home3__modal"><MetaTreePanel onClose={close} /></div>;
  if (panel === "history") return <RunHistoryPanel runHistory={loadRunHistory()} rivalryHistory={loadRivalryHistory()} studioEvents={loadStudioGameEvents()} username={props.username} onLaunchSeed={(seed, challenge) => props.onStart(String(seed), challenge)} onClose={close} />;
  if (panel === "loadouts") return <LoadoutPanel onClose={close} />;
  if (panel === "rules") return <RulesPanel onClose={close} />;
  if (panel === "controls") return <ControlsPanel isMobile={props.isMobile} controllerType={props.controllerType} onClose={close} />;
  if (panel === "enemies") return <EnemiesPanel onClose={close} />;
  if (panel === "news") return <NewsPanel onClose={close} />;
  return null;
}
