(() => {
  const root = document.querySelector('.support-center');
  if (!root) return;
  const search = root.querySelector('[data-support-search]');
  const topics = [...root.querySelectorAll('[data-support-topic]')];
  const empty = root.querySelector('[data-support-empty]');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const topic of topics) {
      topic.hidden = Boolean(query) && !topic.textContent.toLocaleLowerCase().includes(query);
      if (!topic.hidden) visible++;
    }
    empty.hidden = visible > 0;
  });

  const form = root.querySelector('[data-support-form]');
  const prepared = root.querySelector('[data-support-prepared]');
  const output = root.querySelector('[data-support-output]');
  const status = root.querySelector('[data-support-status]');
  const email = root.querySelector('[data-support-email]');
  const family = (ua, patterns) => patterns.find(([pattern]) => pattern.test(ua))?.[1] || 'Other / unknown';
  const diagnostic = () => {
    const ua = navigator.userAgent || '';
    const browser = family(ua, [[/Edg\//, 'Edge'], [/Firefox\//, 'Firefox'], [/Chrome\//, 'Chrome'], [/Safari\//, 'Safari']]);
    const platform = family(ua, [[/Android/, 'Android'], [/iPhone|iPad/, 'iOS / iPadOS'], [/Windows/, 'Windows'], [/Macintosh/, 'macOS'], [/Linux/, 'Linux']]);
    const width = window.innerWidth <= 430 ? 'small' : window.innerWidth < 1000 ? 'medium' : 'large';
    let storage = 'unavailable';
    try {
      const key = 'cod-support-storage-check';
      localStorage.setItem(key, '1');
      storage = localStorage.getItem(key) === '1' ? 'available' : 'unavailable';
      localStorage.removeItem(key);
    } catch { storage = 'unavailable'; }
    return { browser, platform, width, storage, connectivity: navigator.onLine === false ? 'browser reports offline' : 'browser reports online' };
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const lines = [
      'Call of Doodie support report',
      `Issue: ${fields.get('category')}`,
      `Mode: ${fields.get('mode')}`,
      `Input: ${fields.get('input')}`,
      `Expected: ${String(fields.get('expected') || '').trim()}`,
      `Observed: ${String(fields.get('observed') || '').trim()}`,
      `Steps: ${String(fields.get('steps') || '').trim() || 'Not known'}`,
    ];
    let details = null;
    if (fields.get('diagnostic')) {
      details = diagnostic();
      lines.push(`Coarse diagnostic: ${details.browser}; ${details.platform}; ${details.width} viewport; ${details.connectivity}; site storage ${details.storage}.`);
    }
    output.value = lines.join('\n');
    prepared.hidden = false;
    email.href = `mailto:hello@callofdoodie.wtf?subject=${encodeURIComponent('Call of Doodie support report')}&body=${encodeURIComponent(output.value)}`;
    status.textContent = details?.storage === 'unavailable'
      ? 'Site storage appears unavailable. Keep any existing backup; adjust browser storage settings before attempting restore. Review and copy this report.'
      : navigator.onLine === false
        ? 'The browser reports offline. Copy this report and send it after reconnecting. Do not clear site data to fix a network issue.'
        : 'Review the report, then copy it or open your email app. If email does not open, copy the text and use the Contact page.';
    prepared.scrollIntoView({ block: 'nearest' });
  });
  root.querySelector('[data-support-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Report copied. Paste it into an email to the project address on Contact.';
    } catch {
      output.focus(); output.select();
      status.textContent = 'Clipboard access is unavailable. The report is selected; copy it manually, then use the project address on Contact.';
    }
  });
})();
