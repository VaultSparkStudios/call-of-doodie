// Shape validation for game constants.
// These tests act as a contract: if a constant changes shape in a breaking way, a test fails.
// They also serve as living documentation for what each constant must contain.

import { describe, it, expect } from "vitest";
import { WEAPONS, ENEMY_TYPES, PERKS, DIFFICULTIES, STARTER_LOADOUTS, ACHIEVEMENTS } from "./constants.js";

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
  it("has exactly 57 achievements", () => {
    expect(ACHIEVEMENTS).toHaveLength(57);
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
