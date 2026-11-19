(function (root) {
  const sheets = [
    { id: 'all', name: 'Все объекты', types: ['room', 'wall', 'door', 'window', 'sofa', 'table', 'bed', 'bath', 'socket', 'light', 'pipeCold', 'pipeHot', 'drain', 'cable'] },
    { id: 'plan', name: 'Планировка', types: ['room', 'wall', 'door', 'window'] },
    { id: 'furniture', name: 'Мебель', types: ['sofa', 'table', 'bed'] },
    { id: 'plumbing', name: 'Сантехника', types: ['bath'] },
    { id: 'water', name: 'Водоснабжение', types: ['pipeCold', 'pipeHot', 'drain'] },
    { id: 'electrical', name: 'Розетки', types: ['socket'] },
    { id: 'lighting', name: 'Освещение', types: ['light'] },
    { id: 'wiring', name: 'Электропроводка', types: ['cable'] }
  ];
  const baseTypes = new Set(['room', 'wall', 'door', 'window', 'dimension']);
  function valid(id) { return sheets.some(sheet => sheet.id === id); }
  function visible(id, type) {
    const sheet = sheets.find(entry => entry.id === id);
    return !!sheet && (baseTypes.has(type) || sheet.types.includes(type));
  }
  function toolAvailable(id, type) {
    const sheet = sheets.find(entry => entry.id === id);
    return !!sheet && (type === 'select' || type === 'dimension' || sheet.types.includes(type));
  }
  root.PlannerLayers = { sheets, valid, visible, toolAvailable };
  if (typeof module !== 'undefined') module.exports = root.PlannerLayers;
})(typeof window !== 'undefined' ? window : globalThis);

