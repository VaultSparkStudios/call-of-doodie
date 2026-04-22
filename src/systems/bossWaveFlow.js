export const BOSS_NAMES = {
  4: "👩 KAREN DEMANDS A MANAGER",
  9: "🏠 THE LANDLORD RAISES RENT",
  16: "💔 THE SPLITTER APPROACHES",
  17: "🦏 THE JUGGERNAUT APPROACHES",
  18: "🌀 THE SUMMONER RISES",
  20: "📊 THE ALGORITHM GOES VIRAL",
  21: "💻 THE DEVELOPER DEPLOYS",
};

export const BOSS_COLORS = {
  4: "#FF44AA",
  9: "#FFAA00",
  16: "#FF6688",
  17: "#CC4400",
  18: "#8844FF",
  20: "#1DA1F2",
  21: "#00FF88",
};

export const BOSS_CARDS = {
  4: { emoji: "👩", name: "KAREN", title: "DEMANDS A MANAGER", quote: "I want to speak to whoever designed this game.", color: "#FF44AA" },
  9: { emoji: "🏠", name: "THE LANDLORD", title: "RAISES YOUR RENT", quote: "Market rate. Non-negotiable. Also, you're evicted.", color: "#FFAA00" },
  16: { emoji: "💔", name: "THE SPLITTER", title: "MULTIPLIES ON DEATH", quote: "You can't kill what just keeps coming.", color: "#FF6688" },
  17: { emoji: "🦏", name: "THE JUGGERNAUT", title: "UNSTOPPABLE FORCE", quote: "Nothing can stop me. Absolutely nothing.", color: "#CC4400" },
  18: { emoji: "🌀", name: "THE SUMMONER", title: "RAISES AN ARMY", quote: "Why fight when you can delegate?", color: "#8844FF" },
  20: { emoji: "📊", name: "THE ALGORITHM", title: "GOES VIRAL", quote: "Your engagement metrics are... unsatisfactory.", color: "#1DA1F2" },
  21: { emoji: "💻", name: "THE DEVELOPER", title: "PUSHES TO PRODUCTION", quote: "I'll fix it in the next sprint. Probably.", color: "#00FF88" },
};

export function getBossWaveWarningLines({ currentWave, primaryBoss, secondaryBoss = null }) {
  if (primaryBoss === 16) {
    return [{ text: "💔 SPLITS INTO 3 SHARDS AT LOW HP · 🔥 BULLET RING", color: "#FF6688" }];
  }
  if (primaryBoss === 17 || secondaryBoss === 17) {
    const lines = [{ text: "🦏 ARMORED SHIELD ABSORBS DAMAGE · CHARGE ATTACKS!", color: "#CC4400" }];
    if (secondaryBoss === 18 || primaryBoss === 18) {
      lines.push({ text: "🌀 SUMMONS ELITES · INVULNERABLE WHILE ALIVE", color: "#8844FF" });
    }
    return lines;
  }
  if (primaryBoss === 18 || secondaryBoss === 18) {
    return [{ text: "🌀 SUMMONS ELITES · INVULNERABLE WHILE ALIVE!", color: "#8844FF" }];
  }
  if (currentWave >= 40) return [{ text: "💸 RENT NUKE · 🌀 TELEPORT · 🛡 SHIELD · ⚡ ENRAGE", color: "#FF6600" }];
  if (currentWave >= 35) return [{ text: "🌀 TELEPORT · 🛡 SHIELD PULSE · ⚡ ENRAGE", color: "#FF6600" }];
  if (currentWave >= 30) return [{ text: "⚡ ENRAGE at 33% HP · 🛡 SHIELD PULSE · 💥 SLAM", color: "#FF6600" }];
  if (currentWave >= 25) return [{ text: "👥 MINION SURGE · 🛡 SHIELD PULSE · 💥 SLAM", color: "#FF6600" }];
  if (currentWave >= 20) return [{ text: "🛡 SHIELD PULSE · 💥 GROUND SLAM · 🔥 BULLET RING", color: "#FF6600" }];
  if (currentWave >= 15) return [{ text: "💥 GROUND SLAM · 🔥 BULLET RING UNLOCKED!", color: "#FF6600" }];
  if (currentWave >= 10) return [{ text: "🔥 NEW: BULLET RING!", color: "#FF6600" }];
  if (currentWave >= 7) return [{ text: "⚠️ BOSS + ESCORTS!", color: "#FF6600" }];
  return [];
}

export function createBossWavePlan({ currentWave, bossRushMode, developerBossSpawned, bossRotation, enemyTypes }) {
  const slot = bossRushMode
    ? (currentWave - 1) % bossRotation.length
    : (Math.floor(currentWave / 5) - 1) % bossRotation.length;
  const primaryBoss = bossRotation[slot];
  const secondaryBoss = bossRotation[(slot + 1) % bossRotation.length];
  const isDeveloperWave = currentWave >= 50 && !developerBossSpawned && !bossRushMode;

  if (isDeveloperWave) {
    return {
      isDeveloperWave: true,
      markDeveloperBossSpawned: true,
      previewCard: { ...BOSS_CARDS[21], wave: currentWave, dual: null },
      announceLines: [
        { text: BOSS_NAMES[21], color: "#00FF88", emphasize: true },
        { text: "🐛 DEBUG MODE · 🩹 HOTFIX · ⚠️ MERGE CONFLICT!", color: "#00FF88", emphasize: false },
      ],
      spawnBosses: [21],
      escortCount: 0,
      setLiveAnnounce: false,
      warningLines: [],
      primaryBoss: 21,
      secondaryBoss: null,
    };
  }

  const isDual = currentWave >= (bossRushMode ? 3 : 15);
  return {
    isDeveloperWave: false,
    markDeveloperBossSpawned: false,
    previewCard: { ...BOSS_CARDS[primaryBoss], wave: currentWave, dual: isDual ? (BOSS_CARDS[secondaryBoss] || null) : null },
    announceLines: [
      { text: BOSS_NAMES[primaryBoss] || "☠ BOSS APPROACHES", color: BOSS_COLORS[primaryBoss] || "#FF4400", emphasize: true },
      ...(isDual ? [{
        text: `+ ${(BOSS_NAMES[secondaryBoss] || enemyTypes?.[secondaryBoss]?.name?.toUpperCase() || "SECOND BOSS")}`,
        color: BOSS_COLORS[secondaryBoss] || "#FF8844",
        emphasize: false,
      }] : []),
    ],
    spawnBosses: isDual ? [primaryBoss, secondaryBoss] : [primaryBoss],
    escortCount: !isDual && currentWave >= 7 ? 2 : 0,
    setLiveAnnounce: true,
    warningLines: getBossWaveWarningLines({
      currentWave,
      primaryBoss,
      secondaryBoss: currentWave >= 15 ? secondaryBoss : null,
    }),
    primaryBoss,
    secondaryBoss: isDual ? secondaryBoss : null,
  };
}
