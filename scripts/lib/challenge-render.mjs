export function renderChallengePreview() {
  return `<section class="challenge-preview card" data-challenge-preview aria-labelledby="challenge-preview-title">
    <div class="challenge-preview__art"><img src="../visual-assets/play-console-gameplay.webp" alt="Call of Doodie arena action" width="1024" height="576"></div>
    <div class="challenge-preview__body"><p class="eyebrow">Invite inspection · no game starts here</p><h2 id="challenge-preview-title">The challenge card</h2>
      <p data-challenge-status role="status">Open a shared challenge link to inspect the rules. No invitation is loaded.</p>
      <dl data-challenge-facts hidden></dl>
      <div class="challenge-preview__actions"><a class="primary-cta" data-challenge-accept hidden href="../#deploy">Accept into guest play <span aria-hidden="true">→</span></a><button type="button" data-challenge-share hidden>Download share card</button></div>
      <p class="live-caveat">Challenge results are friendly and self-reported. A saved run is not a bot or a live person. The public board has separate score checks.</p>
    </div>
  </section>`;
}
