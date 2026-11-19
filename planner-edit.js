(() => {
  const canvas = document.querySelector('#canvas');
  const panel = document.querySelector('#selected');
  const scale = 40;
  const step = 20;
  const labels = { room: 'Комната', wall: 'Стена', door: 'Дверь', window: 'Окно', sofa: 'Диван', table: 'Стол', bed: 'Кровать', bath: 'Ванна', socket: 'Розетка', light: 'Светильник' };
  let selection = -1;
  let dragStart = null;

  function project() {
    return window.PlannerCore.getProject();
  }

  function point(event) {
    return window.PlannerCore.toWorld(event);
  }

  function bounds(item) {
    const endX = item.x2 ?? item.x + (item.w || 1) * scale;
    const endY = item.y2 ?? item.y + (item.h || 1) * scale;
    return { left: Math.min(item.x, endX), top: Math.min(item.y, endY), right: Math.max(item.x, endX), bottom: Math.max(item.y, endY) };
  }

  function hit(item, position) {
    if (item.wallId && ['door', 'window'].includes(item.type)) {
      const centerX = item.x + item.w * scale / 2, centerY = item.y + item.h * scale / 2;
      const dx = position.x - centerX, dy = position.y - centerY, cos = Math.cos(item.angle || 0), sin = Math.sin(item.angle || 0);
      return Math.abs(dx * cos + dy * sin) <= item.w * scale / 2 + 8 && Math.abs(-dx * sin + dy * cos) <= item.h * scale / 2 + 8;
    }
    if (item.type === 'wall') {
      const dx = item.x2 - item.x, dy = item.y2 - item.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((position.x - item.x) * dx + (position.y - item.y) * dy) / lengthSquared)) : 0;
      return Math.hypot(position.x - item.x - t * dx, position.y - item.y - t * dy) <= 12;
    }
    const box = bounds(item);
    return position.x >= box.left - 8 && position.x <= box.right + 8 && position.y >= box.top - 8 && position.y <= box.bottom + 8;
  }

  function editing() {
    return !window.PlannerCore.isPanning() && document.querySelector('[data-tool="select"]').classList.contains('active') && document.querySelector('#view2').classList.contains('active');
  }

  function saveProject(data, index) {
    window.PlannerCore.change(current => {
      current.items = data.items;
    }, index);
    if (index >= 0) showProperties(index);
  }

  function showProperties(index) {
    const data = project();
    const item = data?.items[index];
    if (!item) return;
    const box = bounds(item);
    const width = (box.right - box.left) / scale;
    const height = (box.bottom - box.top) / scale;
    const dimensionLabel = item.type === 'wall' ? 'Проекция по X, м' : 'Ширина, м';
    const heightLabel = item.type === 'wall' ? 'Проекция по Y, м' : 'Глубина, м';
    panel.innerHTML = `<p><strong>${labels[item.type] || 'Объект'}</strong></p><label for="objectX">X, м</label><input id="objectX" type="number" step="0.1"><label for="objectY">Y, м</label><input id="objectY" type="number" step="0.1"><label for="objectWidth">${dimensionLabel}</label><input id="objectWidth" type="number" step="0.1" min="0"><label for="objectHeight">${heightLabel}</label><input id="objectHeight" type="number" step="0.1" min="0"><button class="wide primary" id="applyObject">Применить размеры</button><button class="wide" id="duplicateObject">Дублировать</button><p class="small">Для перемещения перетащите объект на плане.</p>`;
    const x = document.querySelector('#objectX'), y = document.querySelector('#objectY'), w = document.querySelector('#objectWidth'), h = document.querySelector('#objectHeight');
    x.value = (box.left / scale).toFixed(2); y.value = (box.top / scale).toFixed(2); w.value = width.toFixed(2); h.value = height.toFixed(2);
    if (item.wallId) {
      x.disabled = true; y.disabled = true;
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = 'Проём привязан к стене. Перетащите его вдоль стены.';
      panel.append(note);
    }
    document.querySelector('#applyObject').onclick = () => {
      const values = [x, y, w, h].map(input => Number(input.value));
      if (values.some(value => !Number.isFinite(value)) || values[2] < 0 || values[3] < 0 || (values[2] === 0 && values[3] === 0) || (item.type !== 'wall' && (!values[2] || !values[3]))) { alert('Введите корректные размеры.'); return; }
      const current = project();
      const object = current.items[index];
      if (object.wallId) {
        const wall = current.items.find(candidate => candidate.type === 'wall' && candidate.id === object.wallId);
        if (!wall || Math.hypot(wall.x2 - wall.x, wall.y2 - wall.y) < values[2] * scale) { alert('Ширина проёма превышает длину стены.'); return; }
      }
      if (object.type === 'wall' && object.id) {
        const newLength = Math.hypot(values[2], values[3]);
        if (current.items.some(candidate => candidate.wallId === object.id && candidate.w > newLength)) { alert('Стена короче размещённого на ней проёма.'); return; }
      }
      const reverseX = object.x2 != null && object.x2 < object.x;
      const reverseY = object.y2 != null && object.y2 < object.y;
      object.x = (values[0] + (reverseX ? values[2] : 0)) * scale;
      object.y = (values[1] + (reverseY ? values[3] : 0)) * scale;
      if (object.x2 != null) { object.x2 = (values[0] + (reverseX ? 0 : values[2])) * scale; object.y2 = (values[1] + (reverseY ? 0 : values[3])) * scale; }
      else { object.w = values[2]; object.h = values[3]; }
      saveProject(current, index);
    };
    document.querySelector('#duplicateObject').onclick = () => {
      const current = project(), copy = { ...current.items[index] };
      if (copy.wallId) {
        const wall = current.items.find(candidate => candidate.type === 'wall' && candidate.id === copy.wallId);
        const position = { x: copy.x + copy.w * scale / 2 + step * Math.cos(copy.angle), y: copy.y + copy.h * scale / 2 + step * Math.sin(copy.angle) };
        const placed = wall && PlannerGeometry.placeOnWall(wall, position, copy.w * scale, copy.h * scale);
        if (!placed) return;
        Object.assign(copy, placed);
      } else {
        delete copy.id;
        copy.x += step; copy.y += step;
        if (copy.x2 != null) { copy.x2 += step; copy.y2 += step; }
      }
      current.items.push(copy); selection = current.items.length - 1; saveProject(current, selection);
    };
  }

  canvas.addEventListener('pointerdown', event => {
    if (!editing() || event.button !== 0) return;
    const data = project();
    if (!data?.items) return;
    const position = point(event);
    selection = -1;
    for (let index = data.items.length - 1; index >= 0; index--) {
      if (hit(data.items[index], position)) { selection = index; break; }
    }
    dragStart = selection >= 0 ? position : null;
    if (selection >= 0) showProperties(selection);
  });

  canvas.addEventListener('pointerup', event => {
    if (!dragStart || selection < 0 || !editing()) return;
    const end = point(event), dx = end.x - dragStart.x, dy = end.y - dragStart.y;
    dragStart = null;
    if (!dx && !dy) return;
    const data = project(), item = data?.items[selection];
    if (!item) return;
    if (item.wallId) {
      const wall = data.items.find(candidate => candidate.type === 'wall' && candidate.id === item.wallId);
      const placed = wall && PlannerGeometry.placeOnWall(wall, { x: item.x + item.w * scale / 2 + dx, y: item.y + item.h * scale / 2 + dy }, item.w * scale, item.h * scale);
      if (!placed) return;
      Object.assign(item, placed);
    } else {
      item.x += dx; item.y += dy;
      if (item.x2 != null) { item.x2 += dx; item.y2 += dy; }
    }
    saveProject(data, selection);
  });
})();



