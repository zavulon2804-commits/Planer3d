(() => {
  const bar = document.createElement('nav');
  bar.className = 'sheet-bar';
  bar.setAttribute('aria-label', 'Листы проекта');
  for (const sheet of PlannerLayers.sheets) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = sheet.name; button.dataset.sheet = sheet.id;
    button.addEventListener('click', () => window.PlannerCore.setLayer(sheet.id));
    bar.append(button);
  }
  document.querySelector('.workspace').prepend(bar);
  function render() {
    const active = window.PlannerCore.getLayer();
    for (const button of bar.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.sheet === active);
      button.setAttribute('aria-pressed', String(button.dataset.sheet === active));
    }
    for (const button of document.querySelectorAll('[data-tool]')) button.hidden = !PlannerLayers.toolAvailable(active, button.dataset.tool);
  }
  window.addEventListener('plannerlayerchange', render);
  render();
  window.dispatchEvent(new Event('resize'));
})();

