import { parseChallengeInvite } from './challenge-payload.js';

const root = document.querySelector('[data-challenge-preview]');
if (root) {
  const status = root.querySelector('[data-challenge-status]');
  const facts = root.querySelector('[data-challenge-facts]');
  const accept = root.querySelector('[data-challenge-accept]');
  const share = root.querySelector('[data-challenge-share]');
  const parsed = parseChallengeInvite(location.search);
  const text = (label, value) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    facts.append(row);
  };
  const show = (invite) => {
    status.textContent = 'Invite intact. Review the rules, then choose whether to enter guest play.';
    facts.replaceChildren();
    text('Opponent', invite.vsScore == null ? 'Shared seed, no recorded target' : `Saved player run${invite.vsName ? ` by @${invite.vsName}` : ''}; no bot or live opponent`);
    text('Target', invite.vsScore == null ? 'No score target' : `${invite.vsScore.toLocaleString()} points · friendly, self-reported`);
    text('Mode', invite.mode.replaceAll('_', ' '));
    text('Starting build', invite.loadout.replaceAll('_', ' '));
    text('Rules', `${invite.difficulty} difficulty · seed #${invite.seed}`);
    text('Expires', new Date(invite.expiresAt).toLocaleString());
    text('Verification', 'Link checksum only. Public-board eligibility is checked separately after play.');
    facts.hidden = false;
    accept.href = `../?${location.search.slice(1)}#deploy`;
    accept.hidden = false;
    share.hidden = false;
    share.addEventListener('click', async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 840; canvas.height = 440;
        const ctx = canvas.getContext('2d');
        const art = root.querySelector('.challenge-preview__art img');
        if (art.complete && art.naturalWidth) ctx.drawImage(art, 0, 0, 840, 440);
        ctx.fillStyle = 'rgba(3,9,14,.82)'; ctx.fillRect(0, 0, 840, 440);
        ctx.fillStyle = '#ff8b36'; ctx.font = '900 22px monospace'; ctx.fillText('CALL OF DOODIE · FRIENDLY CHALLENGE', 42, 62);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 45px sans-serif'; ctx.fillText('BEAT THIS RUN', 42, 125);
        ctx.font = '700 24px monospace';
        ctx.fillText(`${invite.mode.replaceAll('_', ' ').toUpperCase()} · ${invite.difficulty.toUpperCase()}`, 42, 180);
        ctx.fillText(`SEED #${invite.seed} · ${invite.loadout.toUpperCase()}`, 42, 222);
        ctx.fillStyle = '#8cefff'; ctx.fillText(invite.vsScore == null ? 'SHARED SEED' : `TARGET ${invite.vsScore.toLocaleString()} · FRIENDLY`, 42, 276);
        ctx.fillStyle = '#ffffff'; ctx.font = '16px monospace'; ctx.fillText('Saved run · not a live opponent · scores are self-reported', 42, 360);
        ctx.fillText('callofdoodie.wtf/challenge/', 42, 392);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `call-of-doodie-challenge-${invite.seed}.png`;
        link.click();
      } catch { status.textContent = 'Share card could not be created on this browser. The challenge link still works.'; }
    });
  };
  if (location.search && !parsed.ok) status.textContent = `${parsed.reason} No challenge has been loaded or accepted.`;
  if (parsed.ok) {
    const invite = parsed.invite;
    if (!invite.duelId) show(invite);
    else {
      status.textContent = 'Checking the saved friendly duel before showing its challenge.';
      fetch(`/api/duel-preview?id=${encodeURIComponent(invite.duelId)}`, { headers: { accept: 'application/json' } })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
        .then(({ duel }) => {
          const matches = duel && duel.id === invite.duelId && duel.seed === invite.seed && duel.mode === invite.mode && duel.difficulty === invite.difficulty && duel.score === invite.vsScore && duel.name === invite.vsName && Math.abs(Date.parse(duel.expiresAt) - Date.parse(invite.expiresAt)) < 1000;
          if (!matches || duel.status !== 'open') throw new Error(duel?.status === 'expired' ? 'This friendly duel has expired.' : 'The saved duel does not match this invite or has already been answered.');
          show(invite);
        })
        .catch((error) => { status.textContent = `${error.message === 'unavailable' ? 'The saved duel cannot be confirmed right now.' : error.message} No challenge has been accepted.`; });
    }
  }
}
