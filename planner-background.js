(function (root) {
  const cache = new Map();
  const scale = 40;
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
  }
  function init() {
    const section = document.createElement('section');
    section.innerHTML = '<div class="divider"></div><h2>Подложка</h2><label for="backgroundFile">Загрузить план</label><input id="backgroundFile" type="file" accept="image/png,image/jpeg,image/webp"><p class="small">Изображение хранится внутри проекта и сжимается для локального сохранения.</p><div id="backgroundControls" hidden><label for="backgroundX">X, м</label><input id="backgroundX" type="number" step="0.1"><label for="backgroundY">Y, м</label><input id="backgroundY" type="number" step="0.1"><label for="backgroundWidth">Ширина, м</label><input id="backgroundWidth" type="number" min="0.01" step="0.1"><label for="backgroundHeight">Высота, м</label><input id="backgroundHeight" type="number" min="0.01" step="0.1"><label for="backgroundOpacity">Непрозрачность, %</label><input id="backgroundOpacity" type="number" min="0" max="100" step="5"><label><input id="backgroundVisible" type="checkbox"> Показывать подложку</label><button class="wide" id="backgroundApply">Применить подложку</button><button class="wide" id="backgroundRemove">Удалить подложку</button></div><p id="backgroundStatus" class="small" role="status"></p>';
    document.querySelector('#tools').after(section);
    const control = id => document.getElementById(id);
    const fields = ['backgroundX', 'backgroundY', 'backgroundWidth', 'backgroundHeight', 'backgroundOpacity'];
    function render() {
      const background = root.PlannerCore.getProject().items.find(item => item.type === 'background');
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

