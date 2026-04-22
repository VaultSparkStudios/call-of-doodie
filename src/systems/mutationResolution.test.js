import { describe, expect, test } from "vitest";
import { acceptMutation, skipMutation, isValidMutation } from "./mutationResolution.js";

describe("mutationResolution", () => {
  test("isValidMutation rejects null/missing/malformed objects", () => {
    expect(isValidMutation(null)).toBe(false);
    expect(isValidMutation(undefined)).toBe(false);
    expect(isValidMutation({})).toBe(false);
    expect(isValidMutation({ id: "x" })).toBe(false); // missing apply
    expect(isValidMutation({ apply: () => {} })).toBe(false); // missing id
    expect(isValidMutation({ id: "x", apply: () => {} })).toBe(true);
  });

  test("acceptMutation awards coins and returns floating text", () => {
    const gameState = { coins: 10 };
    const mutation = { id: "fast_enemies", reward: 15, apply: () => {} };

    const delta = acceptMutation(gameState, mutation);

    expect(delta).not.toBeNull();
    expect(delta.coins).toBe(25); // 10 + 15
    expect(delta.floatingText.text).toContain("+15");
    expect(delta.floatingText.color).toBe("#FFD700");
  });

  test("acceptMutation calls mutation.apply with the game state", () => {
    const gameState = { coins: 0 };
    let applyCalled = false;
    let appliedGs = null;
    const mutation = {
      id: "big_enemies",
      reward: 5,
      apply: (gs) => { applyCalled = true; appliedGs = gs; },
    };

    acceptMutation(gameState, mutation);

    expect(applyCalled).toBe(true);
    expect(appliedGs).toBe(gameState);
  });

  test("acceptMutation handles missing coins field (defaults to 0)", () => {
    const gameState = {};
    const mutation = { id: "x", reward: 10, apply: () => {} };

    const delta = acceptMutation(gameState, mutation);

    expect(delta.coins).toBe(10);
  });

  test("acceptMutation handles missing reward (defaults to 0)", () => {
    const gameState = { coins: 5 };
    const mutation = { id: "x", apply: () => {} };

    const delta = acceptMutation(gameState, mutation);

    expect(delta.coins).toBe(5);
  });

  test("acceptMutation returns null for null gameState", () => {
    const mutation = { id: "x", reward: 10, apply: () => {} };
    expect(acceptMutation(null, mutation)).toBeNull();
  });

  test("acceptMutation returns null for null mutation", () => {
    expect(acceptMutation({ coins: 5 }, null)).toBeNull();
  });

  test("skipMutation always returns null", () => {
    expect(skipMutation()).toBeNull();
    expect(skipMutation({ anything: true })).toBeNull();
  });
});
