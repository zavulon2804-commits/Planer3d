(function (root) {
  const catalog = root.PlannerCatalog || (typeof require === 'function' ? require('./catalog.js') : null);
  const scale = 40;
  const heights = { sofa: 0.8, table: 0.75, bed: 0.55, bath: 0.6, socket: 0.25, light: 0.2, door: 2.1, window: 1.5 };
  function color(value, fallback) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
  function shade(value, factor) {
    const channels = [1, 3, 5].map(offset => Math.max(0, Math.min(255, Math.round(parseInt(value.slice(offset, offset + 2), 16) * factor))));
    return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  }
  function buildScene(items, wallHeight, geometry) {
    const faces = [];
    const add = (points, color, kind, itemIndex = -1) => faces.push({ points, color, kind, itemIndex });
    const rooms = items.flatMap((item, index) => item.type === 'room' ? [{ itemIndex: index, materialColor: item.materialColor, points: [{ x: item.x, y: item.y }, { x: item.x2, y: item.y }, { x: item.x2, y: item.y2 }, { x: item.x, y: item.y2 }] }] : []);
    if (!rooms.length) rooms.push(...geometry.findRooms(items));
    for (const room of rooms) add(room.points.map(point => ({ x: point.x, y: point.y, z: 0 })), color(room.materialColor, '#e1e7e1'), 'floor', room.itemIndex ?? -1);
    for (const [index, wall] of items.entries()) {
      if (wall.type !== 'wall') continue;
      const dx = wall.x2 - wall.x, dy = wall.y2 - wall.y, length = Math.hypot(dx, dy);
      if (!length) continue;
      const at = (distance, height) => ({ x: wall.x + dx * distance * scale / length, y: wall.y + dy * distance * scale / length, z: height * scale });
      for (const panel of geometry.wallPanels(wall, items, wallHeight, scale)) add([at(panel.left, panel.bottom), at(panel.right, panel.bottom), at(panel.right, panel.top), at(panel.left, panel.top)], color(wall.materialColor, '#f9f7f1'), 'wall', index);
    }
    const lineColors = { pipeCold: '#2185c5', pipeHot: '#d64b43', drain: '#886744', cable: '#d5a000' };
    for (const [index, item] of items.entries()) {
      if (!Object.hasOwn(lineColors, item.type)) continue;
      const dx = item.x2 - item.x, dy = item.y2 - item.y, length = Math.hypot(dx, dy);
      if (!length) continue;
      const offsetX = -dy / length * 2, offsetY = dx / length * 2, z = 2;
      add([{ x: item.x + offsetX, y: item.y + offsetY, z }, { x: item.x2 + offsetX, y: item.y2 + offsetY, z }, { x: item.x2 - offsetX, y: item.y2 - offsetY, z }, { x: item.x - offsetX, y: item.y - offsetY, z }], lineColors[item.type], 'line', index);
    }
    for (const [index, item] of items.entries()) {
      if (['room', 'wall', 'background'].includes(item.type) || item.wallId) continue;
      const width = item.w * scale, depth = item.h * scale;
      if (!(width > 0 && depth > 0)) continue;
      const height = (catalog.get(item.type)?.height || heights[item.type] || 0.75) * scale;
      const bottom = item.type === 'light' ? Math.max(0, wallHeight * scale - height) : 0;
      const x = item.x, y = item.y, z = bottom, top = bottom + height;
      const centerX = x + width / 2, centerY = y + depth / 2, angle = (item.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const rotate = (px, py) => ({ x: centerX + (px - centerX) * cos - (py - centerY) * sin, y: centerY + (px - centerX) * sin + (py - centerY) * cos, z });
      const a = rotate(x, y), b = rotate(x + width, y), c = rotate(x + width, y + depth), d = rotate(x, y + depth);
      const aTop = { ...a, z: top }, bTop = { ...b, z: top }, cTop = { ...c, z: top }, dTop = { ...d, z: top };
      const base = color(item.materialColor, '#a8c5bd');
      add([a, b, bTop, aTop], shade(base, 0.9), 'object', index);
      add([b, c, cTop, bTop], shade(base, 0.75), 'object', index);
      add([c, d, dTop, cTop], shade(base, 0.9), 'object', index);
      add([d, a, aTop, dTop], shade(base, 0.75), 'object', index);
      add([aTop, bTop, cTop, dTop], base, 'object', index);
    }
    return faces;
  }
  function render(context, items, width, height, camera, wallHeight, geometry, selectedIndex = -1) {
    context.fillStyle = '#edf2f3'; context.fillRect(0, 0, width, height);
    const faces = buildScene(items, wallHeight, geometry);
    if (!faces.length) {
      context.fillStyle = '#667780'; context.font = '16px Arial'; context.fillText('Добавьте стены или предметы на плане 2D', 30, 50); return [];
    }
    const points = faces.flatMap(face => face.points);
    const minX = Math.min(...points.map(point => point.x)), maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y)), maxY = Math.max(...points.map(point => point.y));
    const centerX = camera.lockedFrame?.centerX ?? (minX + maxX) / 2, centerY = camera.lockedFrame?.centerY ?? (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY, wallHeight * scale, 80);
    const factor = camera.lockedFrame?.factor ?? Math.min(width * 0.62 / span, height * 0.7 / span, 2) * camera.zoom;
    const cos = Math.cos(camera.angle), sin = Math.sin(camera.angle), elevation = camera.elevation;
    function project(point) {
      const dx = point.x - centerX, dy = point.y - centerY;
      const horizontal = dx * cos - dy * sin, depth = dx * sin + dy * cos;
      return { x: width / 2 + horizontal * factor, y: height / 2 + depth * Math.sin(elevation) * factor - point.z * Math.cos(elevation) * factor, depth: depth * Math.cos(elevation) + point.z * Math.sin(elevation) };
    }
    const projected = faces.map(face => {
      const polygon = face.points.map(project);
      return { ...face, polygon, depth: polygon.reduce((sum, point) => sum + point.depth, 0) / polygon.length };
    }).sort((left, right) => left.depth - right.depth);
    projected.frame = { centerX, centerY, factor, angle: camera.angle, elevation: camera.elevation };
    for (const face of projected) {
      context.beginPath(); face.polygon.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.closePath(); context.fillStyle = face.color; context.strokeStyle = face.itemIndex === selectedIndex && selectedIndex >= 0 ? '#008f80' : '#8d9b98'; context.lineWidth = face.itemIndex === selectedIndex && selectedIndex >= 0 ? 2 : 1; context.fill(); context.stroke();
    }
    return projected;
  }
  function pick(faces, x, y) {
    for (let index = faces.length - 1; index >= 0; index--) {
      const face = faces[index];
      if (!Number.isInteger(face.itemIndex) || face.itemIndex < 0) continue;
      let inside = false;
      for (let current = 0, previous = face.polygon.length - 1; current < face.polygon.length; previous = current++) {
        const a = face.polygon[current], b = face.polygon[previous];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (inside) return face.itemIndex;
    }
    return -1;
  }
  function screenDelta(dx, dy, frame) {
    if (!frame || ![dx, dy, frame.factor, frame.angle, frame.elevation].every(Number.isFinite) || frame.factor <= 0 || Math.abs(Math.sin(frame.elevation)) < 1e-6) return null;
    const horizontal = dx / frame.factor, depth = dy / (frame.factor * Math.sin(frame.elevation));
    const cos = Math.cos(frame.angle), sin = Math.sin(frame.angle);
    return { x: horizontal * cos + depth * sin, y: -horizontal * sin + depth * cos };
  }
  root.Planner3D = { buildScene, render, pick, screenDelta };
  if (typeof module !== 'undefined') module.exports = root.Planner3D;
})(typeof window !== 'undefined' ? window : globalThis);

