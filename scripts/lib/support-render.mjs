import { escapeHtml } from "./public-route-registry.mjs";

const topics = [
  ["Game will not start", "Reload once. If the page stays blank, try a current browser and temporarily disable an extension for this site. If you are offline, reconnect before testing score services; local play may still work."],
  ["Controls or aim feel wrong", "Open Settings for input, handedness, audio and visual controls. Disconnect duplicate gamepads, reconnect the one you want, then reload. Touch players should keep both thumbs in their arena zones."],
  ["Progress seems missing", "Check that you are using the same browser profile and domain. Progress is browser-local. Download a backup from Player Record before changing storage settings or clearing site data; a Passport receipt does not restore game progress."],
  ["A backup will not restore", "Use Player Record → Save & Identity to preview a Call of Doodie backup before applying it. The preview lists replaced and ignored records. Keep the original file until your restored game has been checked."],
  ["Scores will not send", "Keep playing locally, then retry when online. Score eligibility and service status appear in the debrief and public Status page. A local or friendly result is not an official board placement."],
  ["Visual, audio or motion barrier", "Open Settings to reduce effects or change presentation. The Accessibility page describes the current control and motion options. Report the exact barrier and desired outcome below."],
];

export function renderSupportCenter(gameplay) {
  const modeOptions = gameplay.modes.map((mode) => `<option value="${escapeHtml(mode.id)}">${escapeHtml(mode.label)}</option>`).join("");
  return `<div class="support-center">
    <nav class="support-recovery card" aria-label="Recovery path">
      <div><p class="eyebrow">Before any reset</p><h2>Protect your run history first.</h2><p>Download a browser backup, check settings, then follow one focused step. Clearing site data can erase local progress.</p></div>
      <div class="support-actions"><a href="../#profile/save">Open backup and restore</a><a href="../#settings">Open game settings</a><a href="../status/">Check service status</a></div>
    </nav>
    <section class="card support-topics" aria-labelledby="support-topics-heading">
      <div class="support-section-head"><div><p class="eyebrow">Find your fix</p><h2 id="support-topics-heading">Troubleshooting</h2></div><label>Search topics<input type="search" data-support-search placeholder="Controls, backup, scores…" autocomplete="off"></label></div>
      <div class="support-topic-grid">${topics.map(([title, detail]) => `<article data-support-topic><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></article>`).join("")}</div>
      <p data-support-empty hidden>No matching topic. Prepare a report below with what you expected and what happened.</p>
    </section>
    <section class="card support-report" id="report" aria-labelledby="support-report-heading">
      <p class="eyebrow">One report path</p><h2 id="support-report-heading">Prepare a useful report</h2>
      <p>This form prepares text on your device for your own email app. It does not upload or save the report. Do not include passwords, tokens, payment details, full save files or personal information. The optional diagnostic uses coarse environment facts only.</p>
      <form data-support-form>
        <div class="support-form-grid"><label>Issue type<select name="category"><option value="start">Game start</option><option value="controls">Controls</option><option value="save">Save or restore</option><option value="score">Score service</option><option value="accessibility">Accessibility</option><option value="other">Other</option></select></label>
        <label>Mode<select name="mode"><option value="not-in-a-run">Not in a run</option>${modeOptions}</select></label>
        <label>Input type<select name="input"><option value="keyboard-pointer">Keyboard and pointer</option><option value="touch">Touch</option><option value="gamepad">Gamepad</option><option value="other">Other</option></select></label></div>
        <label>What did you expect?<textarea name="expected" maxlength="240" rows="2" required></textarea></label>
        <label>What happened instead?<textarea name="observed" maxlength="240" rows="2" required></textarea></label>
        <label>Steps to reproduce, if known<textarea name="steps" maxlength="240" rows="2"></textarea></label>
        <label class="support-consent"><input type="checkbox" name="diagnostic"> Include a coarse diagnostic summary (browser family, platform family, screen size band, connectivity and storage availability). No Passport, credentials, raw player IDs or save contents.</label>
        <button type="submit" class="primary-cta">Prepare report <span aria-hidden="true">→</span></button>
      </form>
      <div class="support-prepared" data-support-prepared hidden><label for="support-report-text">Review this text before sending</label><textarea id="support-report-text" data-support-output readonly rows="11"></textarea><div class="support-actions"><button type="button" data-support-copy>Copy report</button><a data-support-email href="mailto:hello@callofdoodie.wtf">Open email app</a></div></div>
      <p data-support-status role="status">Offline? You can prepare and copy the report, then send it later. If storage is unavailable, protect any existing backup before changing browser settings.</p>
    </section>
  </div>`;
}
