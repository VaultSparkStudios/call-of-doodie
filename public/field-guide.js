(() => {
  const threatFilter = document.querySelector('[data-threat-filter]');
  if (threatFilter) {
    const cards = [...document.querySelectorAll('[data-threat-role]')];
    const count = document.querySelector('[data-threat-count]');
    const update = () => {
      const role = threatFilter.value;
      let shown = 0;
      for (const card of cards) {
        card.hidden = role !== 'all' && card.dataset.threatRole !== role;
        if (!card.hidden) shown++;
      }
      if (count) count.textContent = `Showing ${shown} ${role === 'all' ? 'threats' : `${role} threats`}.`;
    };
    threatFilter.addEventListener('change', update);
    update();
  }

  const controlPicker = document.querySelector('[data-control-picker]');
  if (controlPicker) {
    const panels = [...document.querySelectorAll('[data-control-panel]')];
    try {
      if ([...navigator.getGamepads?.() || []].some(Boolean)) controlPicker.value = 'controller';
      else if (matchMedia('(pointer: coarse)').matches) controlPicker.value = 'touch';
    } catch { /* Manual selection still works when device detection is unavailable. */ }
    const update = () => {
      for (const panel of panels) panel.hidden = panel.dataset.controlPanel !== controlPicker.value;
    };
    controlPicker.addEventListener('change', update);
    window.addEventListener('gamepadconnected', () => { controlPicker.value = 'controller'; update(); }, { once: true });
    update();
  }
})();
