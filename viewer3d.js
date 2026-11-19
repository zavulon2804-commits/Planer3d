(function (root) {
  const scale = 40;
  const heights = { sofa: 0.8, table: 0.75, bed: 0.55, bath: 0.6, socket: 0.25, light: 0.2, door: 2.1, window: 1.5 };
  function buildScene(items, wallHeight, geometry) {
    const faces = [];
    const add = (points, color, kind) => faces.push({ points, color, kind });
    const rooms = items.filter(item => item.type === 'room').map(item => ({ points: [{ x: item.x, y: item.y }, { x: item.x2, y: item.y }, { x: item.x2, y: item.y2 }, { x: item.x, y: item.y2 }] }));
    if (!rooms.length) rooms.push(...geometry.findRooms(items));
    for (const room of rooms) add(room.points.map(point => ({ x: point.x, y: point.y, z: 0 })), '#e1e7e1', 'floor');
    for (const wall of items.filter(item => item.type === 'wall')) {
      const dx = wall.x2 - wall.x, dy = wall.y2 - wall.y, length = Math.hypot(dx, dy);
      if (!length) continue;
      const at = (distance, height) => ({ x: wall.x + dx * distance * scale / length, y: wall.y + dy * distance * scale / length, z: height * scale });
      for (const panel of geometry.wallPanels(wall, items, wallHeight, scale)) add([at(panel.left, panel.bottom), at(panel.right, panel.bottom), at(panel.right, panel.top), at(panel.left, panel.top)], '#f9f7f1', 'wall');
    }
    for (const item of items.filter(item => !['room', 'wall'].includes(item.type) && !item.wallId)) {
      const width = item.w * scale, depth = item.h * scale;
      if (!(width > 0 && depth > 0)) continue;
      const height = (heights[item.type] || 0.75) * scale;
      const bottom = item.type === 'light' ? Math.max(0, wallHeight * scale - height) : 0;
      const x = item.x, y = item.y, z = bottom, top = bottom + height;
      const a = { x, y, z }, b = { x: x + width, y, z }, c = { x: x + width, y: y + depth, z }, d = { x, y: y + depth, z };
      const aTop = { ...a, z: top }, bTop = { ...b, z: top }, cTop = { ...c, z: top }, dTop = { ...d, z: top };
      add([a, b, bTop, aTop], '#a8c5bd', 'object');
      add([b, c, cTop, bTop], '#8fafa7', 'object');
      add([c, d, dTop, cTop], '#a8c5bd', 'object');
      add([d, a, aTop, dTop], '#8fafa7', 'object');
      add([aTop, bTop, cTop, dTop], '#c4dcd4', 'object');
    }
    return faces;
  }
  function render(context, items, width, height, camera, wallHeight, geometry) {
    context.fillStyle = '#edf2f3'; context.fillRect(0, 0, width, height);
    const faces = buildScene(items, wallHeight, geometry);
    if (!faces.length) {
      context.fillStyle = '#667780'; context.font = '16px Arial'; context.fillText('Добавьте стены или предметы на плане 2D', 30, 50); return;
    }
    const points = faces.flatMap(face => face.points);
    const minX = Math.min(...points.map(point => point.x)), maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y)), maxY = Math.max(...points.map(point => point.y));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY, wallHeight * scale, 80);
    const factor = Math.min(width * 0.62 / span, height * 0.7 / span, 2) * camera.zoom;
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
    for (const face of projected) {
      context.beginPath(); face.polygon.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.closePath(); context.fillStyle = face.color; context.strokeStyle = '#8d9b98'; context.lineWidth = 1; context.fill(); context.stroke();
    }
  }
  root.Planner3D = { buildScene, render };
  if (typeof module !== 'undefined') module.exports = root.Planner3D;
})(typeof window !== 'undefined' ? window : globalThis);

