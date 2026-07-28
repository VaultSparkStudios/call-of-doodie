const FACTORS = {
  early_survival: ["opening_stability", "The opening ended before the build had time to stabilize."],
  chain_control: ["chain_control", "Broken kill chains likely reduced the room available to recover."],
  cooldown_hoarding: ["unused_tempo_tool", "An unused grenade likely left a recovery tool on the table."],
  elite_damage: ["elite_pressure", "Slow elite removal likely extended the highest-pressure windows."],
  rivalry_gap: ["rivalry_gap", "The recorded score gap identifies the next fixed-seed target."],
  pressure_conversion: ["pressure_conversion", "Late-wave pressure likely outpaced the run's conversion into safe exits."],
};

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeText(value, fallback = "") {
  return String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
}

function observedFinish(receipt) {
  if (receipt?.schemaVersion !== "damage-sequence-v1" || finite(receipt.hitCount) < 1) return null;
  const style = ["burst", "attrition", "mixed"].includes(receipt.finishStyle) ? receipt.finishStyle : "mixed";
  const source = safeText(receipt.topSource?.sourceName);
  const hits = Math.max(1, Math.floor(finite(receipt.hitCount, 1)));
  const totalDamage = Math.max(0, finite(receipt.totalDamage));
  const finalTwoSecondDamage = Math.max(0, finite(receipt.finalTwoSecondDamage));
  return {
    evidenceLevel: "observed",
    label: "OBSERVED FINISH",
    reasonCode: `observed_${style}_finish`,
    statement: `${totalDamage} recorded damage across ${hits} hit${hits === 1 ? "" : "s"} ended as a ${style} finish; ${finalTwoSecondDamage} landed in the final two seconds${source ? `, led by ${source}` : ""}.`,
    evidence: {
      receiptSchema: receipt.schemaVersion,
      claim: "observed-final-damage-window-not-causality",
      finishStyle: style,
      hitCount: hits,
      topSource: source || null,
    },
  };
}

function contributingFactor(postRunIntel, debrief) {
  const factor = FACTORS[postRunIntel?.cause];
  if (factor) {
    return {
      evidenceLevel: "likely_factor",
      label: "LIKELY FACTOR",
      reasonCode: factor[0],
      statement: factor[1],
    };
  }
  return {
    evidenceLevel: "hypothesis",
    label: "COACHING HYPOTHESIS",
    reasonCode: "insufficient_direct_evidence",
    statement: safeText(debrief?.collapseReason, "The available run summary supports a practice hypothesis, not a verified cause."),
  };
}

export function buildCollapseCoaching({ damageReceipt = null, debrief = {}, postRunIntel = {} } = {}) {
  const observed = observedFinish(damageReceipt);
  const factor = contributingFactor(postRunIntel, debrief);
  const primary = observed || factor;
  return {
    schemaVersion: "collapse-coaching-v1",
    claim: "evidence-ranked-coaching-not-causality",
    primary,
    observed,
    contributingFactor: factor,
    telemetry: {
      schemaVersion: "collapse-coaching-v1",
      claim: "evidence-ranked-coaching-not-causality",
      primaryEvidenceLevel: primary.evidenceLevel,
      primaryReasonCode: primary.reasonCode,
      factorReasonCode: factor.reasonCode,
      observedFinishStyle: observed?.evidence?.finishStyle || null,
    },
  };
}
