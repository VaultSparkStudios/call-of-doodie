/**
 * Local blocker classifier for CANON-019 preflight output.
 */

const RULES = [
  {
    re: /posthog|sentry|analytics/i,
    category: 'dashboard-credential',
    capabilities: ['analytics'],
    attemptable: true,
    elevatedProbe: 'check analytics capability and provider secret paths',
    probeCommands: ['node scripts/check-secrets.mjs --for analytics'],
  },
  {
    re: /cloudflare|token|dns|domain/i,
    category: 'cloudflare-ops',
    capabilities: ['cloudflare'],
    attemptable: true,
    elevatedProbe: 'check Cloudflare capability and token scope before declaring manual',
    probeCommands: ['node scripts/check-secrets.mjs --for cloudflare'],
  },
  {
    re: /pwa|gamepad|real mobile|physical|browser combo|device/i,
    category: 'physical-device-qa',
    capabilities: [],
    attemptable: false,
    elevatedProbe: 'requires a real device/browser interaction',
    probeCommands: [],
  },
  {
    re: /itch|listing|publish|store/i,
    category: 'publication-dashboard',
    capabilities: [],
    attemptable: false,
    signupUiOnly: true,
    elevatedProbe: 'requires owner-controlled publication dashboard/session',
    probeCommands: [],
  },
];

export function classifyBlocker(text = '') {
  const match = RULES.find((rule) => rule.re.test(text));
  return {
    category: match?.category || 'uncategorized',
    capabilities: match?.capabilities || [],
    attemptable: match?.attemptable ?? true,
    signupUiOnly: Boolean(match?.signupUiOnly),
    elevatedProbe: match?.elevatedProbe || 'run secrets discovery and repo-local probe before escalation',
    probeCommands: match?.probeCommands || [],
  };
}

export function summarizeAttemptOrder(text = '') {
  const info = classifyBlocker(text);
  const steps = ['Run secrets discovery for mapped capabilities'];
  if (info.probeCommands.length) steps.push(...info.probeCommands);
  steps.push(info.elevatedProbe);
  steps.push(info.attemptable ? 'If READY, execute the scripted action as agent work' : 'If still unavailable, keep classified as true human-only');
  return steps;
}

export default { classifyBlocker, summarizeAttemptOrder };
