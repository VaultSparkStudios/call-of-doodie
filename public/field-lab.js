import { COMPLAINT_TACTICS, FATE_APPROACHES, PLUMBING_ROUTES, compareFateAttempts, createComplaintContract, createPlumbingRoom, fateOrder, reroutePlumbing, resolveFateAttempt } from './field-lab-models.js';

const root = document.querySelector('[data-field-lab]');
if (root) {
  const select = (selector) => root.querySelector(selector);
  const write = (selector, value) => { select(selector).textContent = String(value); };
  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  };

  let room = createPlumbingRoom(73);
  let previewRoute = null;
  const valveButtons = [...root.querySelectorAll('[data-lab-preview]')];
  const renderRoom = () => {
    const state = PLUMBING_ROUTES[room.route];
    write('[data-lab-lane-state]', state?.lane.toUpperCase() || 'SEALED');
    write('[data-lab-trap-state]', state?.trap === 'on' ? 'POWERED' : 'OFFLINE');
    write('[data-lab-boss-state]', state?.boss.toUpperCase() || 'ARMORED');
    write('[data-lab-pressure]', state?.pressure ?? 0);
    for (const button of valveButtons) button.setAttribute('aria-pressed', String(button.dataset.labPreview === room.route));
    write('[data-lab-plumbing-receipt]', room.receipt
      ? `Seed ${room.seed} · ${room.receipt.eventCount} valve event${room.receipt.eventCount === 1 ? '' : 's'} · receipt ${room.receipt.fingerprint} · local only.`
      : `No valve events yet. Seed ${room.seed} · local only.`);
  };
  for (const button of valveButtons) button.addEventListener('click', () => {
    previewRoute = button.dataset.labPreview;
    const route = PLUMBING_ROUTES[previewRoute];
    select('[data-lab-preview-panel]').replaceChildren(node('span', route.label.toUpperCase()), node('p', `BENEFIT · ${route.benefit}`), node('p', `COST · ${route.cost}`));
    select('[data-lab-activate]').disabled = false;
    for (const other of valveButtons) other.classList.toggle('is-preview', other === button);
  });
  select('[data-lab-activate]').addEventListener('click', () => {
    if (!previewRoute) return;
    room = reroutePlumbing(room, previewRoute);
    renderRoom();
  });
  renderRoom();

  let complaintLocked = false;
  const renderComplaint = () => {
    const tactic = select('[data-lab-tactic]').value;
    const counter = select('[data-lab-counter]').value;
    const detail = COMPLAINT_TACTICS[tactic];
    select('[data-lab-complaint-preview]').replaceChildren(
      node('span', detail.label.toUpperCase()),
      node('p', `TELL · ${detail.tell}`),
      node('p', `TACTIC · ${detail.consequence}`),
      node('p', `DISCLOSED COUNTER · ${detail.counter}`),
      node('p', `YOUR CLAUSE · ${counter === 'appeal' ? 'File an appeal and take the west lane.' : 'Request a tow and take the center lane.'}`),
    );
  };
  select('[data-lab-tactic]').addEventListener('change', renderComplaint);
  select('[data-lab-counter]').addEventListener('change', renderComplaint);
  select('[data-lab-complaint-start]').addEventListener('click', () => {
    if (complaintLocked) return;
    const result = createComplaintContract({ seed: room.seed, tactic: select('[data-lab-tactic]').value, counter: select('[data-lab-counter]').value });
    complaintLocked = true;
    select('[data-lab-tactic]').disabled = true;
    select('[data-lab-counter]').disabled = true;
    select('[data-lab-complaint-start]').disabled = true;
    select('[data-lab-complaint-start]').textContent = `CONTRACT LOCKED · ${result.fingerprint}`;
    select('[data-lab-complaint-reset]').hidden = false;
    select('[data-lab-complaint-events]').replaceChildren(...result.events.map((event) => node('li', `BEAT ${event.beat} · ${event.cue}`)));
  });
  select('[data-lab-complaint-reset]').addEventListener('click', () => {
    complaintLocked = false;
    select('[data-lab-tactic]').disabled = false;
    select('[data-lab-counter]').disabled = false;
    select('[data-lab-complaint-start]').disabled = false;
    select('[data-lab-complaint-start]').textContent = 'OPT IN AND LOCK CONTRACT';
    select('[data-lab-complaint-reset]').hidden = true;
    select('[data-lab-complaint-events]').replaceChildren();
  });
  renderComplaint();

  let fateSeed = room.seed;
  let order = fateOrder(fateSeed);
  const attempts = [];
  let timer = null;
  const renderOrder = () => write('[data-lab-fate-order]', `Seed ${fateSeed} · order ${order.map((id) => FATE_APPROACHES[id].label).join(' → ')}. The next seed reverses the order.`);
  renderOrder();
  const nextButton = select('[data-lab-fate-next]');
  const results = select('[data-lab-fate-results]');
  select('[data-lab-fate-reverse]').addEventListener('click', () => {
    if (timer) return;
    fateSeed += 1;
    order = fateOrder(fateSeed);
    attempts.length = 0;
    results.replaceChildren();
    nextButton.disabled = false;
    nextButton.textContent = 'PLAY ATTEMPT 1';
    renderOrder();
  });
  nextButton.addEventListener('click', () => {
    if (timer || attempts.length >= 2) return;
    const approach = order[attempts.length];
    const card = node('article', '');
    card.append(node('span', `ATTEMPT ${attempts.length + 1} · ${FATE_APPROACHES[approach].label}`), node('p', FATE_APPROACHES[approach].changedVariable));
    const clock = node('strong', '45 seconds remaining · warning: three scripted threats');
    const progress = document.createElement('progress');
    progress.max = 45;
    progress.value = 0;
    progress.setAttribute('aria-label', 'Attempt progress');
    card.append(clock, progress);
    results.append(card);
    nextButton.disabled = true;
    let elapsed = 0;
    timer = setInterval(() => {
      if (document.hidden) return;
      elapsed += 1;
      progress.value = elapsed;
      const cue = elapsed < 15 ? 'warning: three scripted threats' : elapsed < 30 ? 'first threat crosses the lane' : 'final threat approaches the exit';
      clock.textContent = `${45 - elapsed} seconds remaining · ${cue}`;
      if (elapsed < 45) return;
      clearInterval(timer);
      timer = null;
      const receipt = resolveFateAttempt({ seed: fateSeed, approach, elapsedSeconds: elapsed });
      attempts.push(receipt);
      card.replaceChildren(node('span', `ATTEMPT ${attempts.length} · ${FATE_APPROACHES[approach].label}`),
        node('strong', `${receipt.observed.damageTaken} damage · ${receipt.observed.targetsTagged} targets · ${receipt.observed.laneReached} lane`),
        node('small', `45 seconds · local fixture ${receipt.fingerprint}`));
      if (attempts.length === 1) {
        nextButton.disabled = false;
        nextButton.textContent = 'PLAY ATTEMPT 2 · SAME SCRIPT';
      } else {
        const comparison = compareFateAttempts(attempts[0], attempts[1]);
        const summary = node('article', '', 'lab-fate-summary');
        summary.append(node('span', 'PAIRED COMPARISON'),
          node('strong', `Second attempt: ${comparison.observed.damageDifference >= 0 ? '+' : ''}${comparison.observed.damageDifference} damage · ${comparison.observed.targetDifference >= 0 ? '+' : ''}${comparison.observed.targetDifference} targets`),
          node('p', comparison.claim));
        results.append(summary);
        nextButton.textContent = 'TWO ATTEMPTS COMPLETE';
      }
    }, 1000);
  });
}
