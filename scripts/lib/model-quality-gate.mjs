import {proofHash} from './release-proof.mjs';
const finite = n => Number.isFinite(n) && n >= 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const mean = values => values.reduce((a,b)=>a+b,0)/values.length;

// This judges a fixed task-class comparison. It cannot authorize paid usage,
// infer entitlement from a catalog, or override a caller's explicit model pin.
export function assessModelComparison(comparison, context = {}) {
  context ||= {};
  const errors = [], manifest = context.manifest;
  if (comparison?.schemaVersion !== 'model-quality-comparison/v1') errors.push('comparison-version');
  if (!manifest || manifest.schemaVersion !== 'model-quality-benchmark/v1' || !nonempty(manifest.taskClass) || !Array.isArray(manifest.cases) || !manifest.cases.length) return {eligible:false,errors:['benchmark-missing'],metrics:null};
  if (comparison?.taskClass !== manifest.taskClass || comparison?.benchmarkSha256 !== proofHash(manifest)) errors.push('benchmark-changed');
  const count = manifest.repetitions;
  if (!Number.isInteger(count) || count < 3 || count > 10 || !finite(manifest.maxQualityLoss) || manifest.maxQualityLoss > 0.02 || !Array.isArray(manifest.mandatoryChecks) || !manifest.mandatoryChecks.length || manifest.mandatoryChecks.some(c=>!nonempty(c)) || new Set(manifest.cases.map(c=>c?.id)).size !== manifest.cases.length || manifest.cases.some(c=>!nonempty(c?.id)||!hash(c?.inputSha256))) return {eligible:false,errors:[...errors,'benchmark-policy-invalid'],metrics:null};
  const bindings = comparison?.bindings;
  if (!context.bindings || !Object.keys(context.bindings).length || proofHash(bindings||{}) !== proofHash(context.bindings)) errors.push('binding-changed-or-missing');
  if (!nonempty(comparison?.rollback)) errors.push('rollback-missing');
  const now = context.now ?? Date.now(), age = new Date(now).getTime()-Date.parse(comparison?.measuredAt);
  if (!Number.isFinite(age) || age < 0 || age > 7*86400000) errors.push('comparison-stale');
  for (const variant of ['baseline','candidate']) {
    const route = comparison?.[variant];
    if (!nonempty(route?.model) || !nonempty(route?.surface) || !nonempty(route?.version) || route?.entitlement !== 'observed') errors.push(variant+'-runtime-unverified');
  }
  if (comparison?.baseline?.surface !== comparison?.candidate?.surface) errors.push('runtime-surface-mismatch');
  const rows = Array.isArray(comparison?.runs) ? comparison.runs : [];
  if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))return {eligible:false,errors:[...errors,'trial-malformed'],metrics:null};
  if (rows.length !== manifest.cases.length*count*2) errors.push('incomplete-or-extra-trials');
  const seen = new Set(), expected = new Map(manifest.cases.map(c=>[c.id,c.inputSha256]));
  for (const row of rows) {
    const key = row.variant+':'+row.caseId+':'+row.trial;
    if (!['baseline','candidate'].includes(row.variant) || !Number.isInteger(row.trial) || row.trial < 0 || row.trial >= count || seen.has(key) || !expected.has(row.caseId)) errors.push('trial-identity');
    seen.add(key);
    if (row.inputSha256 !== expected.get(row.caseId) || !hash(row.artifactSha256) || !hash(row.transcriptSha256)) errors.push('trial-proof-missing');
    if (row.observedModel !== comparison?.[row.variant]?.model || !Array.isArray(row.requestIds) || !row.requestIds.length || row.requestIds.some(id=>!nonempty(id)) || !nonempty(row.runId) || row.provenance !== 'native-runtime') errors.push('trial-provenance');
    if (row.finished !== true || !Array.isArray(row.forbiddenEffects) || row.forbiddenEffects.length || !manifest.mandatoryChecks.every(check=>row.mandatory?.[check] === true)) errors.push('mandatory-gate-failed');
    if (!finite(row.quality) || row.quality > 1 || !finite(row.elapsedMs) || row.elapsedMs === 0) errors.push('measurement-invalid');
    if (!['subscription-runtime','metered-api'].includes(row.billing?.basis)) errors.push('billing-basis-unknown');
  }
  if (new Set(rows.map(r=>r.runId)).size !== rows.length) errors.push('reused-run');
  if (new Set(rows.flatMap(r=>r.requestIds||[])).size !== rows.reduce((n,r)=>n+(r.requestIds?.length||0),0)) errors.push('reused-provider-request');
  const base=rows.filter(r=>r.variant==='baseline'), candidate=rows.filter(r=>r.variant==='candidate');
  const metrics={qualityLoss:null,latencyImprovement:null,billedCostImprovement:null,baselineLatency:null,candidateLatency:null};
  if (base.length && candidate.length && rows.every(r=>finite(r.quality)&&finite(r.elapsedMs))) {
    metrics.qualityLoss=mean(base.map(r=>r.quality))-mean(candidate.map(r=>r.quality));
    if (metrics.qualityLoss > manifest.maxQualityLoss) errors.push('quality-regressed');
    for (const c of manifest.cases) {
      const b=base.filter(r=>r.caseId===c.id), d=candidate.filter(r=>r.caseId===c.id);
      if (b.length!==count || d.length!==count) errors.push('case-trials-incomplete');
      else if (mean(b.map(r=>r.quality))-mean(d.map(r=>r.quality)) > manifest.maxQualityLoss) errors.push('case-quality-regressed');
    }
    metrics.baselineLatency=base.reduce((n,r)=>n+r.elapsedMs,0);
    metrics.candidateLatency=candidate.reduce((n,r)=>n+r.elapsedMs,0);
    metrics.latencyImprovement=metrics.baselineLatency>0?1-metrics.candidateLatency/metrics.baselineLatency:null;
    // Subscription counters and list-price estimates cannot become billed USD.
    if (rows.every(r=>r.billing?.basis==='metered-api'&&finite(r.billing.billedUSD)&&nonempty(r.billing.invoiceRef))) {
      const a=base.reduce((n,r)=>n+r.billing.billedUSD,0),b=candidate.reduce((n,r)=>n+r.billing.billedUSD,0);
      metrics.billedCostImprovement=a>0?1-b/a:null;
    }
    if (!(metrics.latencyImprovement>=0.05 || metrics.billedCostImprovement>=0.05)) errors.push('benefit-unproven');
    metrics.latencyRange={baseline:[Math.min(...base.map(r=>r.elapsedMs)),Math.max(...base.map(r=>r.elapsedMs))],candidate:[Math.min(...candidate.map(r=>r.elapsedMs)),Math.max(...candidate.map(r=>r.elapsedMs))]};
  }
  return {eligible:errors.length===0,errors:[...new Set(errors)],metrics};
}

export function chooseMeasuredRoute({requestedModel,baselineModel,comparison,context,familySelectors=[]}) {
  if (requestedModel && !familySelectors.includes(requestedModel)) return {model:baselineModel,changed:false,reason:'explicit-model-pin'};
  if (!comparison) return {model:baselineModel,changed:false,reason:'no-quality-comparison'};
  const result=assessModelComparison(comparison,context);
  if (!result.eligible || comparison.baseline.model !== baselineModel) return {model:baselineModel,changed:false,reason:result.errors.join(',')||'baseline-mismatch'};
  return {model:comparison.candidate.model,changed:comparison.candidate.model!==baselineModel,reason:'measured-task-class-comparison',comparisonSha256:proofHash(comparison)};
}
