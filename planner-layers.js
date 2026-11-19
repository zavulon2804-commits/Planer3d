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
  const searchLabel = document.createElement('label');
  searchLabel.htmlFor = 'toolSearch'; searchLabel.textContent = 'Поиск инструментов';
  const search = document.createElement('input');
  search.id = 'toolSearch'; search.type = 'search'; search.placeholder = 'Название предмета';
  document.querySelector('#tools').before(searchLabel, search);
  function render() {
    const active = window.PlannerCore.getLayer();
    for (const button of bar.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.sheet === active);
      button.setAttribute('aria-pressed', String(button.dataset.sheet === active));
    }
    for (const button of document.querySelectorAll('[data-tool]')) button.hidden = !PlannerLayers.toolAvailable(active, button.dataset.tool) || (button.dataset.tool !== 'select' && !PlannerLayers.matches(search.value, button.textContent));
  }
  search.addEventListener('input', () => window.PlannerCore.setLayer(window.PlannerCore.getLayer()));
  window.addEventListener('plannerlayerchange', render);
  render();
  window.dispatchEvent(new Event('resize'));
})();

