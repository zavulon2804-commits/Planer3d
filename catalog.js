(function (root) {
  const items = [
    { type: 'chair', name: 'Стул', group: 'furniture', width: 0.5, depth: 0.5, height: 0.9, symbol: 'seat' },
    { type: 'armchair', name: 'Кресло', group: 'furniture', width: 0.9, depth: 0.9, height: 0.85, symbol: 'seat' },
    { type: 'wardrobe', name: 'Шкаф', group: 'furniture', width: 1.2, depth: 0.6, height: 2.2, symbol: 'cabinet' },
    { type: 'dresser', name: 'Комод', group: 'furniture', width: 1, depth: 0.45, height: 0.9, symbol: 'cabinet' },
    { type: 'desk', name: 'Рабочий стол', group: 'furniture', width: 1.2, depth: 0.6, height: 0.75, symbol: 'table' },
    { type: 'singleBed', name: 'Односпальная кровать', group: 'furniture', width: 0.9, depth: 2, height: 0.55, symbol: 'bed' },
    { type: 'television', name: 'Телевизор', group: 'furniture', width: 1.2, depth: 0.15, height: 0.7, symbol: 'screen' },
    { type: 'kitchenCabinet', name: 'Кухонный шкаф', group: 'furniture', width: 0.6, depth: 0.6, height: 0.9, symbol: 'cabinet' },
    { type: 'refrigerator', name: 'Холодильник', group: 'furniture', width: 0.6, depth: 0.65, height: 1.8, symbol: 'appliance' },
    { type: 'stove', name: 'Плита', group: 'furniture', width: 0.6, depth: 0.6, height: 0.9, symbol: 'stove' },
    { type: 'dishwasher', name: 'Посудомоечная машина', group: 'furniture', width: 0.6, depth: 0.6, height: 0.85, symbol: 'appliance' },
    { type: 'toilet', name: 'Унитаз', group: 'plumbing', width: 0.4, depth: 0.7, height: 0.8, symbol: 'toilet' },
    { type: 'basin', name: 'Раковина', group: 'plumbing', width: 0.6, depth: 0.5, height: 0.85, symbol: 'basin' },
    { type: 'shower', name: 'Душевой поддон', group: 'plumbing', width: 0.9, depth: 0.9, height: 0.15, symbol: 'shower' },
    { type: 'kitchenSink', name: 'Кухонная мойка', group: 'plumbing', width: 0.6, depth: 0.6, height: 0.9, symbol: 'basin' },
    { type: 'washingMachine', name: 'Стиральная машина', group: 'plumbing', width: 0.6, depth: 0.6, height: 0.85, symbol: 'washer' }
  ];
  const byType = new Map(items.map(item => [item.type, item]));
  function get(type) { return byType.get(type); }
  function draw(context, item, box) {
    const definition = get(item.type);
    if (!definition || box.w <= 0 || box.h <= 0) return;
    const left = box.x, top = box.y, width = box.w, height = box.h;
    context.save(); context.strokeStyle = '#53636d'; context.lineWidth = 1;
    if (definition.symbol === 'seat') {
      context.strokeRect(left + width * 0.12, top + height * 0.18, width * 0.76, height * 0.7);
      context.beginPath(); context.moveTo(left, top + height * 0.16); context.lineTo(left + width, top + height * 0.16); context.stroke();
    } else if (definition.symbol === 'cabinet') {
      context.beginPath(); context.moveTo(left + width / 2, top); context.lineTo(left + width / 2, top + height); context.stroke();
    } else if (definition.symbol === 'bed') {
      context.strokeRect(left + width * 0.12, top + height * 0.08, width * 0.76, height * 0.2);
    } else if (definition.symbol === 'basin' || definition.symbol === 'washer' || definition.symbol === 'toilet') {
      context.beginPath(); context.ellipse(left + width / 2, top + height * 0.55, width * 0.32, height * 0.32, 0, 0, Math.PI * 2); context.stroke();
      if (definition.symbol === 'toilet') context.strokeRect(left + width * 0.15, top + height * 0.05, width * 0.7, height * 0.18);
    } else if (definition.symbol === 'shower') {
      context.beginPath(); context.moveTo(left, top); context.lineTo(left + width, top + height); context.moveTo(left + width, top); context.lineTo(left, top + height); context.stroke();
    } else if (definition.symbol === 'stove') {
      for (const x of [0.3, 0.7]) for (const y of [0.3, 0.7]) { context.beginPath(); context.arc(left + width * x, top + height * y, Math.min(width, height) * 0.13, 0, Math.PI * 2); context.stroke(); }
    } else if (definition.symbol === 'appliance' || definition.symbol === 'screen' || definition.symbol === 'table') {
      context.strokeRect(left + width * 0.08, top + height * 0.08, width * 0.84, height * 0.84);
    }
    context.restore();
  }
  root.PlannerCatalog = { items, get, draw };
  if (typeof module !== 'undefined') module.exports = root.PlannerCatalog;
})(typeof window !== 'undefined' ? window : globalThis);

