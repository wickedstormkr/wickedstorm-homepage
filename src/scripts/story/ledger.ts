/** Keep a single row of whole examples; narrow containers show fewer items. */
export function initLedger(story: HTMLElement) {
  const ledger = story.querySelector<HTMLElement>('.ledger');
  const list = ledger?.querySelector<HTMLElement>('.ledger-items');
  if (!ledger || !list) return;
  const items = [...list.querySelectorAll<HTMLElement>('li')];
  const fit = () => {
    list.dataset.fit = '';
    items.forEach(item => { item.hidden = false; });
    const available = list.clientWidth;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    // Read widths together, then hide the trailing examples without shrinking text.
    const widths = items.map(item => item.getBoundingClientRect().width);
    let used = 0;
    items.forEach((item, i) => {
      used += widths[i] + (i ? gap : 0);
      item.hidden = used > available + 0.5;
    });
  };
  fit();
  let width = ledger.clientWidth;
  new ResizeObserver(() => {
    if (ledger.clientWidth !== width) { width = ledger.clientWidth; fit(); }
  }).observe(ledger);
  document.fonts?.ready.then(fit);
}
