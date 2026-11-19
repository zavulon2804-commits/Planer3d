(function (root) {
  const lineNames = { pipeCold: 'Труба ХВС', pipeHot: 'Труба ГВС', drain: 'Канализация', cable: 'Электрокабель' };
  const lineColors = { pipeCold: '#2185c5', pipeHot: '#d64b43', drain: '#886744', cable: '#d5a000' };
  const itemTypes = new Set(['room', 'wall', 'door', 'window', 'sofa', 'table', 'bed', 'bath', 'socket', 'light', ...Object.keys(lineNames)]);
  function isLine(type) { return type === 'wall' || Object.hasOwn(lineNames, type); }
  function engineeringLengths(items, scale) {
    const totals = Object.fromEntries(Object.keys(lineNames).map(type => [type, 0]));
    for (const item of items) {
      if (Object.hasOwn(totals, item.type) && [item.x, item.y, item.x2, item.y2].every(Number.isFinite)) totals[item.type] += Math.hypot(item.x2 - item.x, item.y2 - item.y) / scale;
    }
    return totals;
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  function validItems(items) {
    return Array.isArray(items) && items.every(item => {
      if (!item || !itemTypes.has(item.type) || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return false;
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
  root.PlannerProject = { valid, ensure, sync, selectFloor, selectVariant, addFloor, addVariant, lineNames, lineColors, isLine, engineeringLengths };
  if (typeof module !== 'undefined') module.exports = root.PlannerProject;
})(typeof window !== 'undefined' ? window : globalThis);

