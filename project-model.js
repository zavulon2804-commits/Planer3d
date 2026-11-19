(function (root) {
  const catalog = root.PlannerCatalog || (typeof require === 'function' ? require('./catalog.js') : null);
  const lineNames = { pipeCold: 'Труба ХВС', pipeHot: 'Труба ГВС', drain: 'Канализация', cable: 'Электрокабель' };
  const lineColors = { pipeCold: '#2185c5', pipeHot: '#d64b43', drain: '#886744', cable: '#d5a000' };
  const itemTypes = new Set(['room', 'wall', 'dimension', 'background', 'door', 'window', 'sofa', 'table', 'bed', 'bath', 'socket', 'light', ...Object.keys(lineNames), ...catalog.items.map(item => item.type)]);
  function isLine(type) { return type === 'wall' || type === 'dimension' || Object.hasOwn(lineNames, type); }
  function isMovableObject(type) { return ['sofa', 'table', 'bed', 'bath', 'socket', 'light'].includes(type) || !!catalog.get(type); }
  function normalizeRotation(angle) { return ((angle % 360) + 360) % 360; }
  function containsObject(item, point, scale, tolerance = 0) {
    if (!item || !point || ![item.x, item.y, item.w, item.h, point.x, point.y, scale, tolerance].every(Number.isFinite) || item.w <= 0 || item.h <= 0 || scale <= 0) return false;
    const centerX = item.x + item.w * scale / 2, centerY = item.y + item.h * scale / 2;
    const dx = point.x - centerX, dy = point.y - centerY, angle = (item.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return Math.abs(dx * cos + dy * sin) <= item.w * scale / 2 + tolerance && Math.abs(-dx * sin + dy * cos) <= item.h * scale / 2 + tolerance;
  }
  function snap(value, centimetres, scale) {
    const step = centimetres * scale / 100;
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
    return Math.round(Math.round(value / step) * step * 1e6) / 1e6;
  }
  function calibrateBackground(background, first, second, metres, scale) {
    if (!background || !first || !second || ![background.x, background.y, background.w, background.h, first.x, first.y, second.x, second.y, metres, scale].every(Number.isFinite) || metres <= 0 || scale <= 0 || background.w <= 0 || background.h <= 0) return null;
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    if (distance < 0.1) return null;
    const factor = metres * scale / distance;
    const result = { x: first.x + (background.x - first.x) * factor, y: first.y + (background.y - first.y) * factor, w: background.w * factor, h: background.h * factor };
    if (Object.values(result).some(value => !Number.isFinite(value)) || result.w > 1000000 || result.h > 1000000) return null;
    return result;
  }
  function setWallEndpoints(items, index, first, second, scale) {
    const wall = items[index];
    if (!wall || wall.type !== 'wall' || !first || !second || ![first.x, first.y, second.x, second.y, scale].every(Number.isFinite) || scale <= 0) return false;
    const originalFirst = { x: wall.x, y: wall.y }, originalSecond = { x: wall.x2, y: wall.y2 };
    const close = (left, right) => Math.hypot(left.x - right.x, left.y - right.y) < 1e-7;
    const replace = point => close(point, originalFirst) ? first : close(point, originalSecond) ? second : point;
    const changes = [];
    for (const candidate of items) {
      if (candidate.type !== 'wall') continue;
      const start = replace({ x: candidate.x, y: candidate.y }), end = replace({ x: candidate.x2, y: candidate.y2 });
      if (start.x === candidate.x && start.y === candidate.y && end.x === candidate.x2 && end.y === candidate.y2) continue;
      const length = Math.hypot(end.x - start.x, end.y - start.y) / scale;
      if (length < 1e-7 || candidate.id && items.some(opening => opening.wallId === candidate.id && opening.w > length + 1e-7)) return false;
      changes.push({ candidate, start, end });
    }
    for (const change of changes) Object.assign(change.candidate, { x: change.start.x, y: change.start.y, x2: change.end.x, y2: change.end.y });
    return true;
  }
  function engineeringLengths(items, scale) {
    const totals = Object.fromEntries(Object.keys(lineNames).map(type => [type, 0]));
    for (const item of items) {
      if (Object.hasOwn(totals, item.type) && [item.x, item.y, item.x2, item.y2].every(Number.isFinite)) totals[item.type] += Math.hypot(item.x2 - item.x, item.y2 - item.y) / scale;
    }
    return totals;
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  function validItems(items) {
    return Array.isArray(items) && items.filter(item => item && item.type === 'background').length <= 1 && items.every(item => {
      if (!item || !itemTypes.has(item.type) || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return false;
      if (item.rotation !== undefined && !Number.isFinite(item.rotation)) return false;
      if (item.materialColor !== undefined && (typeof item.materialColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.materialColor))) return false;
      if (item.type === 'background') return typeof item.src === 'string' && item.src.length <= 450000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(item.src) && Number.isFinite(item.w) && item.w > 0 && Number.isFinite(item.h) && item.h > 0 && Number.isFinite(item.opacity) && item.opacity >= 0 && item.opacity <= 1 && typeof item.visible === 'boolean';
      if (item.type === 'room' || isLine(item.type)) {
        return Number.isFinite(item.x2) && Number.isFinite(item.y2) && (isLine(item.type) ? item.x !== item.x2 || item.y !== item.y2 : item.x !== item.x2 && item.y !== item.y2);
      }
      return Number.isFinite(item.w) && item.w > 0 && Number.isFinite(item.h) && item.h > 0;
    });
  }
  function valid(project) {
    if (!project || typeof project.title !== 'string' || !validItems(project.items)) return false;
    if (project.floors === undefined) return true;
    return Array.isArray(project.floors) && project.floors.length > 0 && Number.isInteger(project.activeFloor) && project.activeFloor >= 0 && project.activeFloor < project.floors.length && project.floors.every(floor => floor && typeof floor.name === 'string' && Array.isArray(floor.variants) && floor.variants.length > 0 && Number.isInteger(floor.activeVariant) && floor.activeVariant >= 0 && floor.activeVariant < floor.variants.length && floor.variants.every(variant => variant && typeof variant.name === 'string' && validItems(variant.items)));
  }
  function ensure(project) {
    if (!valid(project)) throw new Error('Invalid project');
    if (!project.floors) {
      project.floors = [{ name: 'Этаж 1', activeVariant: 0, variants: [{ name: 'Вариант 1', items: project.items }] }];
      project.activeFloor = 0;
    } else {
      project.items = project.floors[project.activeFloor].variants[project.floors[project.activeFloor].activeVariant].items;
    }
    return project;
  }
  function sync(project) {
    const floor = project.floors[project.activeFloor];
    floor.variants[floor.activeVariant].items = project.items;
  }
  function selectFloor(project, index) {
    if (!Number.isInteger(index) || index < 0 || index >= project.floors.length) throw new Error('Invalid floor');
    sync(project);
    project.activeFloor = index;
    const floor = project.floors[index];
    project.items = floor.variants[floor.activeVariant].items;
  }
  function selectVariant(project, index) {
    const floor = project.floors[project.activeFloor];
    if (!Number.isInteger(index) || index < 0 || index >= floor.variants.length) throw new Error('Invalid variant');
    sync(project);
    floor.activeVariant = index;
    project.items = floor.variants[index].items;
  }
  function addFloor(project, name) {
    sync(project);
    project.floors.push({ name, activeVariant: 0, variants: [{ name: 'Вариант 1', items: [] }] });
    selectFloor(project, project.floors.length - 1);
  }
  function addVariant(project, name, copyCurrent) {
    sync(project);
    const floor = project.floors[project.activeFloor];
    floor.variants.push({ name, items: copyCurrent ? clone(project.items) : [] });
    selectVariant(project, floor.variants.length - 1);
  }
  root.PlannerProject = { valid, ensure, sync, selectFloor, selectVariant, addFloor, addVariant, lineNames, lineColors, isLine, engineeringLengths, snap, calibrateBackground, setWallEndpoints, normalizeRotation, containsObject, isMovableObject };
  if (typeof module !== 'undefined') module.exports = root.PlannerProject;
})(typeof window !== 'undefined' ? window : globalThis);

