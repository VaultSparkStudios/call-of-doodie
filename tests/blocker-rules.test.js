import { describe, expect, it } from 'vitest';
import { classifyBlocker } from '../scripts/lib/blocker-rules.mjs';

describe('blocker capability precedence', () => {
  it('requires the provider capability before a GitHub Actions secret can be called ready', () => {
    const result = classifyBlocker('Add VITE_POSTHOG_KEY to GitHub repo Settings → Secrets → Actions');
    expect(result).toMatchObject({ id: 'posthog-project-key', capabilities: ['posthog.api'], signupUiOnly: true });
    expect(result.probeCommands).toEqual([
      'node scripts/ops.mjs check-secrets --for posthog.api',
      'node scripts/ops.mjs check-secrets --for github.org',
    ]);
  });
});
