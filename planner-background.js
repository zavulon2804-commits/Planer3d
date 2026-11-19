(function (root) {
  const cache = new Map();
  const scale = 40;
  let calibration = null;
  function draw(context, items) {
    const background = items.find(item => item.type === 'background' && item.visible);
    if (!background) return;
    let image = cache.get(background.src);
    if (!image) {
      image = new Image();
      image.onload = () => root.PlannerCore?.redraw();
      image.src = background.src;
      if (cache.size >= 3) cache.delete(cache.keys().next().value);
      cache.set(background.src, image);
    }
    if (!image.complete || !image.naturalWidth) return;
    context.save(); context.globalAlpha = background.opacity;
    context.drawImage(image, background.x, background.y, background.w * scale, background.h * scale);
    context.restore();
    if (calibration?.first) {
      context.save(); context.strokeStyle = '#d33d35'; context.lineWidth = 2;
      context.beginPath(); context.arc(calibration.first.x, calibration.first.y, 6, 0, Math.PI * 2); context.stroke(); context.restore();
    }
  }
  function init() {
    const section = document.createElement('section');
    section.innerHTML = '<div class="divider"></div><h2>Подложка</h2><label for="backgroundFile">Загрузить план</label><input id="backgroundFile" type="file" accept="image/png,image/jpeg,image/webp"><p class="small">Изображение хранится внутри проекта и сжимается для локального сохранения.</p><div id="backgroundControls" hidden><label for="backgroundX">X, м</label><input id="backgroundX" type="number" step="0.1"><label for="backgroundY">Y, м</label><input id="backgroundY" type="number" step="0.1"><label for="backgroundWidth">Ширина, м</label><input id="backgroundWidth" type="number" min="0.01" step="0.1"><label for="backgroundHeight">Высота, м</label><input id="backgroundHeight" type="number" min="0.01" step="0.1"><label for="backgroundOpacity">Непрозрачность, %</label><input id="backgroundOpacity" type="number" min="0" max="100" step="5"><label><input id="backgroundVisible" type="checkbox"> Показывать подложку</label><button class="wide" id="backgroundApply">Применить подложку</button><label for="backgroundCalibrationLength">Известное расстояние, м</label><input id="backgroundCalibrationLength" type="number" min="0.001" step="0.1" value="1"><button class="wide" id="backgroundCalibrate">Указать две точки</button><button class="wide" id="backgroundCancel" hidden>Отменить калибровку</button><button class="wide" id="backgroundRemove">Удалить подложку</button></div><p id="backgroundStatus" class="small" role="status"></p>';
    document.querySelector('#tools').after(section);
    const control = id => document.getElementById(id);
    const fields = ['backgroundX', 'backgroundY', 'backgroundWidth', 'backgroundHeight', 'backgroundOpacity'];
    const canvas = document.querySelector('#canvas');
    function cancel(message) {
      calibration = null;
      control('backgroundCancel').hidden = true;
      if (message) control('backgroundStatus').textContent = message;
      root.PlannerCore.redraw();
    }
    function render() {
      const project = root.PlannerCore.getProject();
      const background = project.items.find(item => item.type === 'background');
      if (calibration && (!background || !background.visible || project.activeFloor !== calibration.floor || project.floors[project.activeFloor].activeVariant !== calibration.variant || !document.querySelector('#view2').classList.contains('active'))) cancel('Калибровка отменена.');
      control('backgroundControls').hidden = !background;
      if (!background) return;
      const values = [background.x / scale, background.y / scale, background.w, background.h, background.opacity * 100];
      fields.forEach((id, index) => { control(id).value = Number(values[index].toFixed(3)); });
      control('backgroundVisible').checked = background.visible;
    }
    function changeBackground(callback) {
      root.PlannerCore.change(project => {
        const background = project.items.find(item => item.type === 'background');
        if (background) callback(background, project);
      }, -1);
    }
    control('backgroundApply').addEventListener('click', () => {
      const values = fields.map(id => Number(control(id).value));
      if (fields.some(id => control(id).value.trim() === '') || values.some(value => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0 || values[4] < 0 || values[4] > 100) { control('backgroundStatus').textContent = 'Проверьте размеры, координаты и прозрачность.'; return; }
      changeBackground(background => { [background.x, background.y, background.w, background.h, background.opacity] = [values[0] * scale, values[1] * scale, values[2], values[3], values[4] / 100]; background.visible = control('backgroundVisible').checked; });
      control('backgroundStatus').textContent = 'Подложка обновлена.';
    });
    control('backgroundRemove').addEventListener('click', () => {
      changeBackground((background, project) => { project.items = project.items.filter(item => item !== background); });
      control('backgroundStatus').textContent = 'Подложка удалена; действие можно отменить.';
    });
    control('backgroundCalibrate').addEventListener('click', () => {
      const project = root.PlannerCore.getProject(), background = project.items.find(item => item.type === 'background');
      const lengthInput = control('backgroundCalibrationLength'), length = Number(lengthInput.value);
      if (!background?.visible || !document.querySelector('#view2').classList.contains('active')) { control('backgroundStatus').textContent = 'Включите подложку и откройте план 2D.'; return; }
      if (!lengthInput.value || !Number.isFinite(length) || length <= 0) { control('backgroundStatus').textContent = 'Введите положительное расстояние в метрах.'; return; }
      calibration = { floor: project.activeFloor, variant: project.floors[project.activeFloor].activeVariant, metres: length, first: null };
      control('backgroundCancel').hidden = false;
      control('backgroundStatus').textContent = 'Нажмите первую точку известного расстояния на плане.';
    });
    control('backgroundCancel').addEventListener('click', () => cancel('Калибровка отменена.'));
    canvas.addEventListener('pointerdown', event => {
      if (!calibration || event.button !== 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const point = root.PlannerCore.toWorldExact(event);
      if (!calibration.first) {
        calibration.first = point;
        control('backgroundStatus').textContent = 'Нажмите вторую точку известного расстояния.';
        root.PlannerCore.redraw();
        return;
      }
      const project = root.PlannerCore.getProject(), background = project.items.find(item => item.type === 'background');
      const result = PlannerProject.calibrateBackground(background, calibration.first, point, calibration.metres, scale);
      if (!result) { control('backgroundStatus').textContent = 'Точки слишком близки или расстояние некорректно. Укажите вторую точку ещё раз.'; return; }
      calibration = null; control('backgroundCancel').hidden = true;
      changeBackground(item => Object.assign(item, result));
      control('backgroundStatus').textContent = 'Масштаб подложки настроен. Действие можно отменить.';
    }, true);
    canvas.addEventListener('pointerup', event => { if (calibration) event.stopImmediatePropagation(); }, true);
    root.addEventListener('keydown', event => { if (calibration && event.key === 'Escape') cancel('Калибровка отменена.'); });
    control('backgroundFile').addEventListener('change', event => {
      const file = event.target.files[0]; event.target.value = '';
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { control('backgroundStatus').textContent = 'Выберите PNG, JPEG или WebP размером до 15 МБ.'; return; }
      const before = root.PlannerCore.getProject();
      const floorIndex = before.activeFloor, variantIndex = before.floors[floorIndex].activeVariant;
      const image = new Image(), url = URL.createObjectURL(file);
      image.onerror = () => { URL.revokeObjectURL(url); control('backgroundStatus').textContent = 'Не удалось прочитать изображение.'; };
      image.onload = () => {
        URL.revokeObjectURL(url);
        const current = root.PlannerCore.getProject();
        if (current.activeFloor !== floorIndex || current.floors[floorIndex].activeVariant !== variantIndex) { control('backgroundStatus').textContent = 'Этаж или вариант изменился; выберите изображение ещё раз.'; return; }
        const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        let ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight)), src = '';
        for (let attempt = 0; attempt < 8; attempt++) {
          canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
          context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
          src = canvas.toDataURL('image/jpeg', 0.8);
          if (src.length <= 450000) break;
          ratio *= 0.75;
        }
        if (!src.startsWith('data:image/jpeg;base64,') || src.length > 450000) { control('backgroundStatus').textContent = 'Изображение не удалось сжать для сохранения.'; return; }
        const width = 5, height = width * image.naturalHeight / image.naturalWidth;
        root.PlannerCore.change(project => { project.items = project.items.filter(item => item.type !== 'background'); project.items.unshift({ type: 'background', x: 0, y: 0, w: width, h: height, opacity: 0.5, visible: true, src }); }, -1);
        control('backgroundStatus').textContent = 'Подложка загружена. Задайте её размеры и положение.';
      };
      image.src = url;
    });
    root.addEventListener('plannerchange', render);
    render();
  }
  root.PlannerBackground = { draw, init };
})(window);

