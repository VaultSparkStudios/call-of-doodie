export function buildWeaponAmmoArray(weapons, weaponUpgrades, ammoMult = 1) {
  return weapons.map((weapon, index) => {
    const upgradeLevel = weaponUpgrades?.[index] || 0;
    return Math.floor(weapon.maxAmmo * (1 + upgradeLevel * 0.25) * ammoMult);
  });
}

export function applyShopOptionEffect({
  optionId,
  gameState,
  weaponIndex,
  weapons,
  perkMods,
}) {
  const player = gameState?.player;
  if (!gameState || !player) return null;

  const result = {
    health: null,
    ammo: null,
    weaponUpgrades: null,
    shopHistoryEntry: null,
    floatingText: null,
    stats: {
      weaponUpgradeCollected: false,
      maxWeaponLevel: null,
    },
  };

  switch (optionId) {
    case "health":
      player.health = Math.min(player.maxHealth, player.health + 50);
      result.health = Math.floor(player.health);
      result.shopHistoryEntry = { emoji: "💊", name: "Field Medkit" };
      return result;
    case "ammo":
      gameState.weaponAmmos = buildWeaponAmmoArray(weapons, gameState.weaponUpgrades, perkMods.ammoMult || 1);
      gameState.ammoCount = gameState.weaponAmmos[weaponIndex];
      result.ammo = gameState.ammoCount;
      result.shopHistoryEntry = { emoji: "📦", name: "Resupply Crate" };
      return result;
    case "upgrade":
      if ((gameState.weaponUpgrades?.[weaponIndex] || 0) < 3) {
        gameState.weaponUpgrades[weaponIndex] += 1;
        result.stats.weaponUpgradeCollected = true;
        result.stats.maxWeaponLevel = gameState.weaponUpgrades[weaponIndex];
        result.weaponUpgrades = [...gameState.weaponUpgrades];
      }
      result.shopHistoryEntry = { emoji: "🔧", name: "Field Upgrade" };
      return result;
    case "speed":
      player.speed *= 1.10;
      result.shopHistoryEntry = { emoji: "👟", name: "Combat Stim" };
      return result;
    case "maxhp":
      player.maxHealth += 25;
      player.health = Math.min(player.maxHealth, player.health + 25);
      result.health = Math.floor(player.health);
      result.shopHistoryEntry = { emoji: "❤️", name: "HP Canister" };
      return result;
    case "damage":
      perkMods.damageMult = (perkMods.damageMult || 1) * 1.15;
      result.shopHistoryEntry = { emoji: "🔥", name: "Damage Boost" };
      return result;
    default:
      break;
  }

  if (optionId.startsWith("bless_")) {
    const blessIndex = parseInt(optionId.slice(6), 10);
    if (!Number.isNaN(blessIndex) && blessIndex >= 0 && blessIndex < weapons.length) {
      gameState.weaponMods = gameState.weaponMods || {};
      gameState.weaponMods[blessIndex] = {
        ...(gameState.weaponMods[blessIndex] || {}),
        damageMult: 1.30,
        fireRateMult: 0.80,
        blessed: true,
      };
      result.floatingText = {
        text: `✨ ${weapons[blessIndex].name} BLESSED!`,
        color: "#FFD700",
      };
      result.shopHistoryEntry = { emoji: "✨", name: `Bless ${weapons[blessIndex].name}` };
    }
    return result;
  }

  if (optionId.startsWith("curse_")) {
    const curseIndex = parseInt(optionId.slice(6), 10);
    if (!Number.isNaN(curseIndex) && curseIndex >= 0 && curseIndex < weapons.length) {
      gameState.weaponMods = gameState.weaponMods || {};
      gameState.weaponMods[curseIndex] = {
        ...(gameState.weaponMods[curseIndex] || {}),
        damageMult: 0.70,
        cursed: true,
      };
      player.maxHealth += 50;
      player.health = Math.min(player.maxHealth, player.health + 25);
      result.health = Math.floor(player.health);
      result.floatingText = {
        text: "☠️ PACT SEALED! +50 MAX HP",
        color: "#CC00FF",
      };
      result.shopHistoryEntry = { emoji: "☠️", name: "Devil's Pact" };
    }
    return result;
  }

  return result;
}

export function applyCoinShopEffect({
  optionId,
  cost,
  gameState,
  weaponIndex,
  weapons,
  perkMods,
  extraLives,
}) {
  const player = gameState?.player;
  if (!gameState || !player || (gameState.coins || 0) < cost) return null;

  gameState.coins = (gameState.coins || 0) - cost;
  const result = {
    coins: gameState.coins,
    health: null,
    ammo: null,
    score: null,
    extraLives,
    grenadeReady: null,
    defeatedEnemies: null,
    sound: "perkSelect",
  };

  switch (optionId) {
    case "cs_fullhp":
      player.health = player.maxHealth;
      result.health = Math.floor(player.health);
      break;
    case "cs_nuke":
      result.defeatedEnemies = [...gameState.enemies];
      gameState.enemies.forEach((enemy) => {
        enemy.health = -999;
        gameState.score += enemy.points;
      });
      gameState.enemies = [];
      gameState.screenShake = 20;
      result.score = gameState.score;
      break;
    case "cs_timedil":
      gameState.timeDilationTimer = 360;
      break;
    case "cs_grenade":
      result.grenadeReady = true;
      break;
    case "cs_extralife":
      result.extraLives = (extraLives || 0) + 1;
      break;
    case "cs_maxhp":
      player.maxHealth += 30;
      player.health = Math.min(player.maxHealth, player.health + 30);
      result.health = Math.floor(player.health);
      break;
    case "cs_ammo":
      gameState.weaponAmmos = buildWeaponAmmoArray(weapons, gameState.weaponUpgrades, perkMods.ammoMult || 1);
      gameState.ammoCount = gameState.weaponAmmos[weaponIndex];
      result.ammo = gameState.ammoCount;
      break;
    default:
      break;
  }

  return result;
}
