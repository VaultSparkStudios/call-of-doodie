export function renderFieldLab() {
  return `<div class="field-lab" data-field-lab>
    <div class="lab-notice" role="note"><strong>Unranked systems sandbox.</strong> These are small authored practice models. They do not alter an Operation, award progress, submit a score, or recreate a historical death.</div>
    <nav class="lab-jump" aria-label="Field Lab stations"><a href="#plumbing">01 · Living Plumbing</a><a href="#complaint">02 · Complaint Cascade</a><a href="#forked-fate">03 · Forked Fate</a></nav>
    <section class="lab-station" id="plumbing" aria-labelledby="plumbing-heading">
      <div class="lab-station__intro"><span class="lab-number">01 / SYSTEMS ROOM</span><h2 id="plumbing-heading">Living Plumbing</h2><p>One pressure line. Three valves. Every advantage changes a visible part of the room. Inspect both sides, then reroute as often as you like.</p></div>
      <div class="lab-room" aria-label="Operation pressure room diagram">
        <div class="lab-room__lane" data-lab-lane><b>WEST LANE</b><span data-lab-lane-state>SEALED</span></div>
        <div class="lab-room__trap" data-lab-trap><b>CENTER TRAP</b><span data-lab-trap-state>OFFLINE</span></div>
        <div class="lab-room__boss" data-lab-boss><b>BOSS SHIELD</b><span data-lab-boss-state>ARMORED</span></div>
        <div class="lab-room__pressure">ADDITIONAL ENEMIES <strong data-lab-pressure>0</strong></div>
      </div>
      <div class="lab-valves" role="group" aria-label="Preview and activate a valve">
        <button type="button" data-lab-preview="lane"><span>VALVE A</span><strong>Drain escape lane</strong><small>Preview bargain</small></button>
        <button type="button" data-lab-preview="trap"><span>VALVE B</span><strong>Power trap</strong><small>Preview bargain</small></button>
        <button type="button" data-lab-preview="boss"><span>VALVE C</span><strong>Expose boss</strong><small>Preview bargain</small></button>
      </div>
      <div class="lab-decision" data-lab-preview-panel aria-live="polite"><span>CHOOSE A VALVE</span><p>Inspect a benefit and its cost before changing the room.</p></div>
      <button class="lab-action" type="button" data-lab-activate disabled>REROUTE PRESSURE</button>
      <p class="lab-receipt" data-lab-plumbing-receipt role="status">No valve events yet. Seed 73 · local only.</p>
    </section>
    <section class="lab-station" id="complaint" aria-labelledby="complaint-heading">
      <div class="lab-station__intro"><span class="lab-number">02 / NEMESIS DESK</span><h2 id="complaint-heading">Complaint Cascade</h2><p>The Bureaucrat files one ridiculous grievance. Read its warning, choose a counter-clause, and lock an optional encounter contract before it begins.</p></div>
      <div class="lab-complaint-grid">
        <label>Complaint tactic<select data-lab-tactic><option value="noise">Noise citation · silencing cones</option><option value="parking">Parking complaint · lane-blocking cart</option></select></label>
        <label>Your counter-clause<select data-lab-counter><option value="appeal">File an appeal · take west lane</option><option value="tow">Request a tow · take center lane</option></select></label>
      </div>
      <div class="lab-decision" data-lab-complaint-preview aria-live="polite"></div>
      <button class="lab-action" type="button" data-lab-complaint-start>OPT IN AND LOCK CONTRACT</button>
      <ol class="lab-events" data-lab-complaint-events aria-live="polite"></ol>
      <button type="button" class="lab-reset" data-lab-complaint-reset hidden>Reset optional contract</button>
      <p class="lab-micro">No skill-triggered punishment. The two tactics and both counters are disclosed; this local scene never enters a scored run.</p>
    </section>
    <section class="lab-station" id="forked-fate" aria-labelledby="fate-heading">
      <div class="lab-station__intro"><span class="lab-number">03 / PRACTICE CHAMBER</span><h2 id="fate-heading">Forked Fate</h2><p>Compare two authored 45-second approaches with the same seed and threat script. The single changed variable is whether you take cover before firing or rush the lane.</p></div>
      <div class="lab-fate-track" aria-label="Paired attempt track"><div><span>THREAT SCRIPT</span><strong>Same three beats</strong></div><div><span>FIRST ACTION</span><strong data-lab-first-action>Alternates by seed</strong></div><div><span>OUTCOME</span><strong>Damage · targets · lane</strong></div></div>
      <p data-lab-fate-order class="lab-order"></p>
      <button type="button" class="lab-reset" data-lab-fate-reverse>Reverse trial order with the next seed</button>
      <button type="button" class="lab-action" data-lab-fate-next>PLAY ATTEMPT 1</button>
      <div class="lab-fate-results" data-lab-fate-results aria-live="polite"></div>
      <p class="lab-micro">This is a bounded scripted fixture. Real movement timing, enemy pathing and builds are uncontrolled; no result claims that another choice would have prevented an earlier death. No leaderboard eligibility.</p>
    </section>
  </div>`;
}
