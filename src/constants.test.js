// Shape validation for game constants.
// These tests act as a contract: if a constant changes shape in a breaking way, a test fails.
// They also serve as living documentation for what each constant must contain.

import { describe, it, expect } from "vitest";
import { WEAPONS, ENEMY_TYPES, PERKS, DIFFICULTIES, STARTER_LOADOUTS, ACHIEVEMENTS, ACHIEVEMENT_PROGRESS, NEW_FEATURES } from "./constants.js";

// ── WEAPONS ──────────────────────────────────────────────────────────────────

describe("WEAPONS", () => {
  it("has exactly 12 entries", () => {
    expect(WEAPONS).toHaveLength(12);
  });

  it("every weapon has required string fields", () => {
    WEAPONS.forEach((w, i) => {
      expect(typeof w.name, `WEAPONS[${i}].name`).toBe("string");
      expect(typeof w.emoji, `WEAPONS[${i}].emoji`).toBe("string");
      expect(typeof w.color, `WEAPONS[${i}].color`).toBe("string");
      expect(typeof w.desc, `WEAPONS[${i}].desc`).toBe("string");
      expect(typeof w.upgradedName, `WEAPONS[${i}].upgradedName`).toBe("string");
    });
  });

  it("every weapon has positive numeric stats", () => {
    WEAPONS.forEach((w, i) => {
      expect(w.damage, `WEAPONS[${i}].damage`).toBeGreaterThan(0);
      expect(w.fireRate, `WEAPONS[${i}].fireRate`).toBeGreaterThan(0);
      expect(w.ammo, `WEAPONS[${i}].ammo`).toBeGreaterThan(0);
      expect(w.maxAmmo, `WEAPONS[${i}].maxAmmo`).toBeGreaterThan(0);
      expect(w.reloadTime, `WEAPONS[${i}].reloadTime`).toBeGreaterThan(0);
    });
  });

  it("ammo never exceeds maxAmmo", () => {
    WEAPONS.forEach((w, i) => {
      expect(w.ammo, `WEAPONS[${i}].ammo <= maxAmmo`).toBeLessThanOrEqual(w.maxAmmo);
    });
  });

  it("weapon names are unique", () => {
    const names = WEAPONS.map(w => w.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("weapon emojis are unique", () => {
    const emojis = WEAPONS.map(w => w.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});

// ── ENEMY_TYPES ───────────────────────────────────────────────────────────────

describe("ENEMY_TYPES", () => {
  it("has exactly 22 entries", () => {
    expect(ENEMY_TYPES).toHaveLength(22);
  });

  it("every enemy has required fields", () => {
    ENEMY_TYPES.forEach((e, i) => {
      expect(typeof e.name, `ENEMY_TYPES[${i}].name`).toBe("string");
      expect(typeof e.health, `ENEMY_TYPES[${i}].health`).toBe("number");
      expect(typeof e.speed, `ENEMY_TYPES[${i}].speed`).toBe("number");
      expect(typeof e.points, `ENEMY_TYPES[${i}].points`).toBe("number");
    });
  });

  it("all health values are positive", () => {
    ENEMY_TYPES.forEach((e, i) => {
      expect(e.health, `ENEMY_TYPES[${i}].health`).toBeGreaterThan(0);
    });
  });

  it("all points values are positive", () => {
    ENEMY_TYPES.forEach((e, i) => {
      expect(e.points, `ENEMY_TYPES[${i}].points`).toBeGreaterThan(0);
    });
  });

  it("enemy names are unique", () => {
    const names = ENEMY_TYPES.map(e => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ── DIFFICULTIES ──────────────────────────────────────────────────────────────

describe("DIFFICULTIES", () => {
  const EXPECTED_KEYS = ["easy", "normal", "hard", "insane"];

  it("has exactly 4 difficulty levels", () => {
    expect(Object.keys(DIFFICULTIES)).toHaveLength(4);
  });

  it("contains all required difficulty keys", () => {
    EXPECTED_KEYS.forEach(k => {
      expect(DIFFICULTIES, `key: ${k}`).toHaveProperty(k);
    });
  });

  it("each difficulty has all required multiplier fields", () => {
    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
      expect(typeof d.healthMult, `${key}.healthMult`).toBe("number");
      expect(typeof d.speedMult,  `${key}.speedMult`).toBe("number");
      expect(typeof d.spawnMult,  `${key}.spawnMult`).toBe("number");
      expect(typeof d.playerHP,   `${key}.playerHP`).toBe("number");
      expect(typeof d.label,      `${key}.label`).toBe("string");
      expect(typeof d.color,      `${key}.color`).toBe("string");
    });
  });

  it("normal difficulty has healthMult = 1.0 and speedMult = 1.0 (baseline)", () => {
    expect(DIFFICULTIES.normal.healthMult).toBe(1.0);
    expect(DIFFICULTIES.normal.speedMult).toBe(1.0);
  });

  it("all playerHP values are positive", () => {
    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
      expect(d.playerHP, `${key}.playerHP`).toBeGreaterThan(0);
    });
  });
});

// ── STARTER_LOADOUTS ──────────────────────────────────────────────────────────

describe("STARTER_LOADOUTS", () => {
  it("has at least 4 starter loadouts", () => {
    expect(STARTER_LOADOUTS.length).toBeGreaterThanOrEqual(4);
  });

  it("every loadout has id, name, and desc fields", () => {
    STARTER_LOADOUTS.forEach((sl, i) => {
      expect(typeof sl.id,   `STARTER_LOADOUTS[${i}].id`).toBe("string");
      expect(typeof sl.name, `STARTER_LOADOUTS[${i}].name`).toBe("string");
      expect(typeof sl.desc, `STARTER_LOADOUTS[${i}].desc`).toBe("string");
    });
  });

  it("loadout ids are unique", () => {
    const ids = STARTER_LOADOUTS.map(sl => sl.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("'standard' loadout exists", () => {
    expect(STARTER_LOADOUTS.some(sl => sl.id === "standard")).toBe(true);
  });
});

// ── PERKS ─────────────────────────────────────────────────────────────────────

describe("PERKS", () => {
  it("has at least 25 perks", () => {
    expect(PERKS.length).toBeGreaterThanOrEqual(25);
  });

  it("every perk has required fields", () => {
    PERKS.forEach((p, i) => {
      expect(typeof p.id,    `PERKS[${i}].id`).toBe("string");
      expect(typeof p.name,  `PERKS[${i}].name`).toBe("string");
      expect(typeof p.tier,  `PERKS[${i}].tier`).toBe("string");
      expect(typeof p.apply, `PERKS[${i}].apply`).toBe("function");
    });
  });

  it("perk ids are unique", () => {
    const ids = PERKS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all perk tiers are valid values", () => {
    const VALID_TIERS = ["common", "uncommon", "rare", "legendary", "cursed"];
    PERKS.forEach((p, i) => {
      expect(VALID_TIERS, `PERKS[${i}].tier "${p.tier}" is not a valid tier`).toContain(p.tier);
    });
  });
});

// ── ACHIEVEMENTS ──────────────────────────────────────────────────────────────

describe("ACHIEVEMENTS", () => {
  it("has exactly 61 achievements", () => {
    expect(ACHIEVEMENTS).toHaveLength(61);
  });

  it("every achievement has required fields", () => {
    ACHIEVEMENTS.forEach((a, i) => {
      expect(typeof a.id,    `ACHIEVEMENTS[${i}].id`).toBe("string");
      expect(typeof a.name,  `ACHIEVEMENTS[${i}].name`).toBe("string");
      expect(typeof a.tier,  `ACHIEVEMENTS[${i}].tier`).toBe("string");
      expect(typeof a.check, `ACHIEVEMENTS[${i}].check`).toBe("function");
    });
  });

  it("achievement ids are unique", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all achievement tiers are valid", () => {
    const VALID_TIERS = ["bronze", "silver", "gold", "legendary"];
    ACHIEVEMENTS.forEach((a, i) => {
      expect(VALID_TIERS, `ACHIEVEMENTS[${i}].tier "${a.tier}"`).toContain(a.tier);
    });
  });
});

// ── ACHIEVEMENT_PROGRESS ──────────────────────────────────────────────────────

describe("ACHIEVEMENT_PROGRESS", () => {
  const achievementIds = new Set(ACHIEVEMENTS.map(a => a.id));

  it("every key matches a real achievement id", () => {
    Object.keys(ACHIEVEMENT_PROGRESS).forEach(key => {
      expect(achievementIds, `ACHIEVEMENT_PROGRESS key "${key}" has no matching achievement`).toContain(key);
    });
  });

  it("every entry is a [statKey: string, target: number] tuple with positive target", () => {
    Object.entries(ACHIEVEMENT_PROGRESS).forEach(([key, val]) => {
      expect(Array.isArray(val), `ACHIEVEMENT_PROGRESS["${key}"] should be an array`).toBe(true);
      expect(typeof val[0], `ACHIEVEMENT_PROGRESS["${key}"][0] should be string`).toBe("string");
      expect(typeof val[1], `ACHIEVEMENT_PROGRESS["${key}"][1] should be number`).toBe("number");
      expect(val[1], `ACHIEVEMENT_PROGRESS["${key}"][1] should be > 0`).toBeGreaterThan(0);
    });
  });

  it("speedrun and gauntlet achievements have progress entries", () => {
    ["speedrun_w5", "speedrun_sub4", "gauntlet_w5", "gauntlet_w10"].forEach(id => {
      expect(ACHIEVEMENT_PROGRESS, `ACHIEVEMENT_PROGRESS missing entry for "${id}"`).toHaveProperty(id);
    });
  });
});

// ── Mode-gated achievement behaviour ─────────────────────────────────────────

describe("mode-gated achievements", () => {
  const find = id => ACHIEVEMENTS.find(a => a.id === id);

  it("speedrun_w5 requires speedrunMode=true and wave >= 5", () => {
    const a = find("speedrun_w5");
    expect(a.check({ speedrunMode: true,  wave: 5 })).toBe(true);
    expect(a.check({ speedrunMode: false, wave: 5 })).toBe(false);
    expect(a.check({ speedrunMode: true,  wave: 4 })).toBe(false);
  });

  it("speedrun_sub4 requires speedrunMode, wave >= 10, and timeSurvived <= 240", () => {
    const a = find("speedrun_sub4");
    expect(a.check({ speedrunMode: true,  wave: 10, timeSurvived: 200 })).toBe(true);
    expect(a.check({ speedrunMode: true,  wave: 10, timeSurvived: 241 })).toBe(false);
    expect(a.check({ speedrunMode: false, wave: 10, timeSurvived: 200 })).toBe(false);
    expect(a.check({ speedrunMode: true,  wave:  9, timeSurvived: 200 })).toBe(false);
  });

  it("gauntlet_w5 requires gauntletMode=true and wave >= 5", () => {
    const a = find("gauntlet_w5");
    expect(a.check({ gauntletMode: true,  wave: 5 })).toBe(true);
    expect(a.check({ gauntletMode: false, wave: 5 })).toBe(false);
    expect(a.check({ gauntletMode: true,  wave: 4 })).toBe(false);
  });

  it("gauntlet_w10 requires gauntletMode=true and wave >= 10", () => {
    const a = find("gauntlet_w10");
    expect(a.check({ gauntletMode: true,  wave: 10 })).toBe(true);
    expect(a.check({ gauntletMode: false, wave: 10 })).toBe(false);
    expect(a.check({ gauntletMode: true,  wave:  9 })).toBe(false);
  });

  it("boss_rush achievements require bossRushMode=true", () => {
    ["boss_rush_5", "boss_rush_10", "boss_rush_20"].forEach(id => {
      const a = find(id);
      const wave = parseInt(id.split("_").pop());
      expect(a.check({ bossRushMode: true,  wave })).toBe(true);
      expect(a.check({ bossRushMode: false, wave })).toBe(false);
    });
  });

  it("cursed run achievements require cursedRunMode=true", () => {
    const a5  = find("cursed_run_w5");
    const a10 = find("cursed_run_w10");
    expect(a5.check({ cursedRunMode: true,  wave: 5  })).toBe(true);
    expect(a5.check({ cursedRunMode: false, wave: 5  })).toBe(false);
    expect(a10.check({ cursedRunMode: true,  wave: 10 })).toBe(true);
    expect(a10.check({ cursedRunMode: false, wave: 10 })).toBe(false);
  });
});

// ── NEW_FEATURES ──────────────────────────────────────────────────────────────

describe("NEW_FEATURES", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(NEW_FEATURES)).toBe(true);
    expect(NEW_FEATURES.length).toBeGreaterThan(0);
    NEW_FEATURES.forEach((f, i) => {
      expect(typeof f, `NEW_FEATURES[${i}]`).toBe("string");
      expect(f.length, `NEW_FEATURES[${i}] should not be empty`).toBeGreaterThan(0);
    });
  });

  it("every entry contains a ' — ' separator for emoji+title / description split", () => {
    NEW_FEATURES.forEach((f, i) => {
      expect(f, `NEW_FEATURES[${i}] missing ' — ' separator`).toContain(" — ");
    });
  });

  it("no duplicate entries", () => {
    expect(new Set(NEW_FEATURES).size).toBe(NEW_FEATURES.length);
  });

  it("includes entries for Speedrun, Gauntlet, META Tree, and Run Draft", () => {
    const titles = NEW_FEATURES.map(f => f.split(" — ")[0]);
    expect(titles.some(t => t.includes("Speedrun"))).toBe(true);
    expect(titles.some(t => t.includes("Gauntlet"))).toBe(true);
    expect(titles.some(t => t.includes("META Tree"))).toBe(true);
    expect(titles.some(t => t.includes("Run Draft"))).toBe(true);
  });
});
