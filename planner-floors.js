(() => {
  const bar = document.createElement('div');
  bar.className = 'floor-bar';
  bar.innerHTML = '<label for="floorSelect">Этаж</label><select id="floorSelect"></select><button type="button" id="addFloor">Добавить этаж</button><label for="variantSelect">Планировка</label><select id="variantSelect"></select><button type="button" id="addVariant">Копировать вариант</button><label for="levelName">Новое название</label><input id="levelName" maxlength="80"><button type="button" id="renameFloor">Переименовать этаж</button><button type="button" id="renameVariant">Переименовать вариант</button>';
  document.querySelector('.bar').after(bar);
  const floorSelect = document.querySelector('#floorSelect');
  const variantSelect = document.querySelector('#variantSelect');
  function fill(select, entries, selected) {
    select.replaceChildren(...entries.map((entry, index) => {
      const option = document.createElement('option');
      option.value = String(index); option.textContent = entry.name;
      return option;
    }));
    select.value = String(selected);
  }
  function render() {
    const project = window.PlannerCore.getProject();
    const floor = project.floors[project.activeFloor];
    fill(floorSelect, project.floors, project.activeFloor);
    fill(variantSelect, floor.variants, floor.activeVariant);
  }
  function apply(action) {
    window.PlannerCore.change(action, -1);
  }
  function newName() { return document.querySelector('#levelName').value.trim().slice(0, 80); }
  floorSelect.addEventListener('change', () => apply(project => PlannerProject.selectFloor(project, Number(floorSelect.value))));
  variantSelect.addEventListener('change', () => apply(project => PlannerProject.selectVariant(project, Number(variantSelect.value))));
  document.querySelector('#addFloor').addEventListener('click', () => {
    const project = window.PlannerCore.getProject();
    const name = `Этаж ${project.floors.length + 1}`;
    apply(current => PlannerProject.addFloor(current, name));
  });
  document.querySelector('#addVariant').addEventListener('click', () => {
    const project = window.PlannerCore.getProject(), floor = project.floors[project.activeFloor];
    const name = `Вариант ${floor.variants.length + 1}`;
    apply(current => PlannerProject.addVariant(current, name, true));
  });
  document.querySelector('#renameFloor').addEventListener('click', () => {
    const name = newName();
    if (name) apply(current => { current.floors[current.activeFloor].name = name; });
  });
  document.querySelector('#renameVariant').addEventListener('click', () => {
    const name = newName();
    if (name) apply(current => { const activeFloor = current.floors[current.activeFloor]; activeFloor.variants[activeFloor.activeVariant].name = name; });
  });
  window.addEventListener('plannerchange', render);
  render();
})();

