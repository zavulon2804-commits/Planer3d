(() => {
  const storageKey = 'personal-planner-v1';
  const settingsKey = 'personal-planner-estimate-v1';
  const scale = 40;
  const sidebar = document.querySelector('.layout > aside:last-child');
  const container = document.createElement('section');
  container.innerHTML = `<div class="divider"></div><h2>Предварительная смета</h2><label for="ceilingHeight">Высота стен, м</label><input id="ceilingHeight" type="number" min="0.1" max="20" step="0.1"><label for="floorRate">Пол, ₽/м²</label><input id="floorRate" type="number" min="0" step="100"><label for="wallRate">Стены, ₽/м²</label><input id="wallRate" type="number" min="0" step="100"><p class="small">Площадь одной стороны стен учитывает привязанные проёмы. При наличии комнат, созданных вручную, площадь пола считается только по ним.</p><div class="small">Площадь стен</div><div class="metric" id="wallArea">0 м²</div><div class="small">Ориентировочная стоимость</div><div class="metric" id="estimateTotal">0 ₽</div><button class="wide" id="estimateDownload">Скачать расчёт CSV</button><button class="wide" id="printPlan">Печать страницы</button>`;
  sidebar.append(container);
  let settings = { ceilingHeight: 2.7, floorRate: 0, wallRate: 0 };
  try { settings = { ...settings, ...JSON.parse(localStorage.getItem(settingsKey) || '{}') }; } catch {}
  const fields = ['ceilingHeight', 'floorRate', 'wallRate'];
  for (const field of fields) document.getElementById(field).value = settings[field];

  function calculate() {
    let project;
    try { project = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { project = {}; }
    let floorArea = 0, wallLength = 0;
    for (const item of project.items || []) {
      if (item.type === 'room' && Number.isFinite(item.x2) && Number.isFinite(item.y2)) floorArea += Math.abs((item.x2 - item.x) * (item.y2 - item.y)) / scale ** 2;
      if (item.type === 'wall' && Number.isFinite(item.x2) && Number.isFinite(item.y2)) wallLength += Math.hypot(item.x2 - item.x, item.y2 - item.y) / scale;
    }
    if (!(project.items || []).some(item => item.type === 'room')) {
      floorArea = PlannerGeometry.findRooms(project.items || []).reduce((sum, room) => sum + room.area / scale ** 2, 0);
    }
    const wallArea = PlannerGeometry.wallSurface(project.items || [], settings.ceilingHeight, scale);
    return { floorArea, wallLength, wallArea, floorCost: floorArea * settings.floorRate, wallCost: wallArea * settings.wallRate };
  }

  function updateEstimate() {
    const result = calculate();
    document.querySelector('#wallArea').textContent = `${result.wallArea.toFixed(2)} м²`;
    document.querySelector('#estimateTotal').textContent = `${(result.floorCost + result.wallCost).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
  }

  for (const field of fields) document.getElementById(field).addEventListener('input', event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value < 0 || (field === 'ceilingHeight' && value === 0)) return;
    settings[field] = value;
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch {}
    updateEstimate();
    window.PlannerCore.redraw();
  });
  document.querySelector('#canvas').addEventListener('pointerup', () => setTimeout(updateEstimate, 0));
  document.querySelector('#undo').addEventListener('click', () => setTimeout(updateEstimate, 0));
  document.querySelector('#remove').addEventListener('click', () => setTimeout(updateEstimate, 0));
  document.querySelector('#clear').addEventListener('click', () => setTimeout(updateEstimate, 0));
  document.querySelector('#file').addEventListener('change', () => setTimeout(updateEstimate, 100));
  window.addEventListener('keydown', event => { if (event.key === 'Delete') setTimeout(updateEstimate, 0); });
  window.addEventListener('plannerchange', updateEstimate);
  document.querySelector('#estimateDownload').addEventListener('click', () => {
    const result = calculate();
    const rows = [['Позиция', 'Объём', 'Единица', 'Цена за единицу, ₽', 'Стоимость, ₽'], ['Пол', result.floorArea.toFixed(2), 'м²', settings.floorRate, result.floorCost.toFixed(2)], ['Стены с вычетом привязанных проёмов', result.wallArea.toFixed(2), 'м²', settings.wallRate, result.wallCost.toFixed(2)], ['Итого', '', '', '', (result.floorCost + result.wallCost).toFixed(2)]];
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'estimate.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('#printPlan').addEventListener('click', () => window.print());
  updateEstimate();
})();

