import { describe, expect, test, vi } from "vitest";
import {
  consumeBankedPerkChoice,
  createWaveRewardPlan,
  resolveQueuedReward,
} from "./progressionFlow.js";

describe("progressionFlow", () => {
  test("consumes a banked perk choice and rolls fresh options", () => {
    const getRandomPerks = vi.fn(() => [{ id: "a" }, { id: "b" }, { id: "c" }]);
    const getFullyCursedPerks = vi.fn();

    expect(consumeBankedPerkChoice({
      bankedPerkChoices: 2,
      isCursedRun: false,
      getRandomPerks,
      getFullyCursedPerks,
    })).toEqual({
      bankedPerkChoices: 1,
      perkOptions: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });
    expect(getRandomPerks).toHaveBeenCalledWith(3);
    expect(getFullyCursedPerks).not.toHaveBeenCalled();
  });

  test("prioritizes perk selection at wave clear and defers the rest", () => {
    expect(createWaveRewardPlan({
      hasBankedPerkChoices: true,
      showMutation: true,
      showShop: true,
      mutationOptions: [{ id: "mut_1" }, { id: "mut_2" }],
    })).toEqual({
      action: "perk",
      deferredMutationPending: true,
      deferredMutationOptions: [{ id: "mut_1" }, { id: "mut_2" }],
      deferredShopPending: false,
    });
  });

  test("falls back to mutation or shop when no perk is queued", () => {
    expect(createWaveRewardPlan({
      hasBankedPerkChoices: false,
      showMutation: true,
      showShop: true,
      mutationOptions: [{ id: "mut_1" }],
    })).toEqual({
      action: "mutation",
      deferredMutationPending: false,
      deferredMutationOptions: [],
      deferredShopPending: false,
      mutationOptions: [{ id: "mut_1" }],
    });

    expect(createWaveRewardPlan({
      hasBankedPerkChoices: false,
      showMutation: false,
      showShop: true,
      mutationOptions: [],
    })).toEqual({
      action: "shop",
      deferredMutationPending: false,
      deferredMutationOptions: [],
      deferredShopPending: false,
    });
  });

  test("resolves deferred rewards after perk selection in the right order", () => {
    expect(resolveQueuedReward({
      hasBankedPerkChoices: true,
      deferredMutationPending: true,
      deferredMutationOptions: [{ id: "mut_1" }],
      deferredShopPending: true,
    })).toEqual({ action: "perk" });

    expect(resolveQueuedReward({
      hasBankedPerkChoices: false,
      deferredMutationPending: true,
      deferredMutationOptions: [{ id: "mut_1" }],
      deferredShopPending: true,
    })).toEqual({
      action: "mutation",
      mutationOptions: [{ id: "mut_1" }],
    });

    expect(resolveQueuedReward({
      hasBankedPerkChoices: false,
      deferredMutationPending: false,
      deferredMutationOptions: [],
      deferredShopPending: true,
    })).toEqual({ action: "shop" });
  });
});
