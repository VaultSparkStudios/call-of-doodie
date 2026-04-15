export function consumeBankedPerkChoice({
  bankedPerkChoices,
  isCursedRun,
  getRandomPerks,
  getFullyCursedPerks,
}) {
  if (bankedPerkChoices <= 0) return null;
  const perkOptions = isCursedRun ? getFullyCursedPerks(3) : getRandomPerks(3);
  return {
    bankedPerkChoices: Math.max(0, bankedPerkChoices - 1),
    perkOptions,
  };
}

export function createWaveRewardPlan({
  hasBankedPerkChoices,
  showMutation,
  showShop,
  mutationOptions,
}) {
  if (hasBankedPerkChoices) {
    return {
      action: "perk",
      deferredMutationPending: showMutation,
      deferredMutationOptions: showMutation ? mutationOptions : [],
      deferredShopPending: !showMutation && showShop,
    };
  }

  if (showMutation) {
    return {
      action: "mutation",
      deferredMutationPending: false,
      deferredMutationOptions: [],
      deferredShopPending: false,
      mutationOptions,
    };
  }

  if (showShop) {
    return {
      action: "shop",
      deferredMutationPending: false,
      deferredMutationOptions: [],
      deferredShopPending: false,
    };
  }

  return {
    action: "none",
    deferredMutationPending: false,
    deferredMutationOptions: [],
    deferredShopPending: false,
  };
}

export function resolveQueuedReward({
  hasBankedPerkChoices,
  deferredMutationPending,
  deferredMutationOptions,
  deferredShopPending,
}) {
  if (hasBankedPerkChoices) {
    return { action: "perk" };
  }
  if (deferredMutationPending) {
    return { action: "mutation", mutationOptions: deferredMutationOptions };
  }
  if (deferredShopPending) {
    return { action: "shop" };
  }
  return { action: "none" };
}
