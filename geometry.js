(function (root) {
  function findRooms(items) {
    const vertices = new Map();
    const edges = new Set();
    const key = (x, y) => `${Math.round(x * 1e7) / 1e7},${Math.round(y * 1e7) / 1e7}`;
    const walls = items.filter(wall => wall.type === 'wall' && [wall.x, wall.y, wall.x2, wall.y2].every(Number.isFinite) && (wall.x !== wall.x2 || wall.y !== wall.y2));
    const cross = (ax, ay, bx, by) => ax * by - ay * bx;
    const addEdge = (x1, y1, x2, y2) => {
      const first = key(x1, y1), second = key(x2, y2);
      if (first === second) return;
      const edgeKey = [first, second].sort().join('|');
      if (edges.has(edgeKey)) return;
      edges.add(edgeKey);
      if (!vertices.has(first)) vertices.set(first, { x: x1, y: y1, neighbours: [] });
      if (!vertices.has(second)) vertices.set(second, { x: x2, y: y2, neighbours: [] });
      vertices.get(first).neighbours.push(second);
      vertices.get(second).neighbours.push(first);
    };
    for (const wall of walls) {
      const dx = wall.x2 - wall.x, dy = wall.y2 - wall.y;
      const points = [0, 1];
      for (const other of walls) {
        if (other === wall) continue;
        const ox = other.x2 - other.x, oy = other.y2 - other.y;
        const denominator = cross(dx, dy, ox, oy);
        const offsetX = other.x - wall.x, offsetY = other.y - wall.y;
        if (Math.abs(denominator) > 1e-9) {
          const t = cross(offsetX, offsetY, ox, oy) / denominator;
          const u = cross(offsetX, offsetY, dx, dy) / denominator;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) points.push(t);
        } else if (Math.abs(cross(offsetX, offsetY, dx, dy)) < 1e-9) {
          const lengthSquared = dx * dx + dy * dy;
          for (const [x, y] of [[other.x, other.y], [other.x2, other.y2]]) {
            const t = ((x - wall.x) * dx + (y - wall.y) * dy) / lengthSquared;
            if (t > 0 && t < 1) points.push(t);
          }
        }
      }
      points.sort((left, right) => left - right);
      for (let index = 1; index < points.length; index++) {
        const first = points[index - 1], second = points[index];
        addEdge(wall.x + first * dx, wall.y + first * dy, wall.x + second * dx, wall.y + second * dy);
      }
    }
    for (const vertex of vertices.values()) {
      vertex.neighbours.sort((left, right) => {
        const a = vertices.get(left), b = vertices.get(right);
        return Math.atan2(a.y - vertex.y, a.x - vertex.x) - Math.atan2(b.y - vertex.y, b.x - vertex.x);
      });
    }
    const visited = new Set(), rooms = [];
    for (const [start, vertex] of vertices) {
      for (const neighbour of vertex.neighbours) {
        let from = start, to = neighbour;
        const polygon = [], local = new Set();
        while (true) {
          const directed = `${from}|${to}`;
          if (local.has(directed) || visited.has(directed)) break;
          local.add(directed);
          polygon.push(vertices.get(from));
          const nextVertex = vertices.get(to);
          const reverse = nextVertex.neighbours.indexOf(from);
          const next = nextVertex.neighbours[(reverse - 1 + nextVertex.neighbours.length) % nextVertex.neighbours.length];
          from = to; to = next;
          if (from === start && to === neighbour) {
            for (const edge of local) visited.add(edge);
            let signedArea = 0;
            for (let index = 0; index < polygon.length; index++) {
              const point = polygon[index], following = polygon[(index + 1) % polygon.length];
              signedArea += point.x * following.y - following.x * point.y;
            }
            if (signedArea > 0 && polygon.length >= 3) rooms.push({ points: polygon.map(({ x, y }) => ({ x, y })), area: signedArea / 2 });
            break;
          }
        }
      }
    }
    return rooms;
  }
  function placeOnWall(wall, position, width, height, maxDistance = Infinity) {
    const dx = wall.x2 - wall.x, dy = wall.y2 - wall.y;
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length < width || width <= 0 || height <= 0) return null;
    const projected = ((position.x - wall.x) * dx + (position.y - wall.y) * dy) / (length * length);
    const closest = Math.max(0, Math.min(1, projected));
    const distance = Math.hypot(position.x - (wall.x + closest * dx), position.y - (wall.y + closest * dy));
    if (distance > maxDistance) return null;
    const margin = width / (2 * length);
    const offset = Math.max(margin, Math.min(1 - margin, projected));
    return { offset, angle: Math.atan2(dy, dx), x: wall.x + offset * dx - width / 2, y: wall.y + offset * dy - height / 2, distance };
  }

  function findOpeningWall(items, position, width, height, maxDistance) {
    let best = null;
    for (const wall of items) {
      if (wall.type !== 'wall') continue;
      const placed = placeOnWall(wall, position, width, height, maxDistance);
      if (placed && (!best || placed.distance < best.placed.distance)) best = { wall, placed };
    }
    return best;
  }

  function updateOpening(opening, wall, scale) {
    const width = opening.w * scale, height = opening.h * scale;
    const position = { x: wall.x + opening.offset * (wall.x2 - wall.x), y: wall.y + opening.offset * (wall.y2 - wall.y) };
    const placed = placeOnWall(wall, position, width, height);
    if (!placed) return false;
    Object.assign(opening, { x: placed.x, y: placed.y, offset: placed.offset, angle: placed.angle });
    return true;
  }

  function openingVertical(opening) {
    const defaultHeight = opening.type === 'window' ? 1.5 : 2.1;
    const defaultSill = opening.type === 'window' ? 0.9 : 0;
    return {
      height: Number.isFinite(opening.openingHeight) && opening.openingHeight > 0 ? opening.openingHeight : defaultHeight,
      sill: Number.isFinite(opening.sillHeight) && opening.sillHeight >= 0 ? opening.sillHeight : defaultSill
    };
  }

  function wallPanels(wall, items, ceilingHeight, scale) {
    const length = Math.hypot(wall.x2 - wall.x, wall.y2 - wall.y) / scale;
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(ceilingHeight) || ceilingHeight <= 0) return [];
    const openings = [];
    if (wall.id) for (const opening of items) {
      if (opening.wallId !== wall.id || !['door', 'window'].includes(opening.type) || !Number.isFinite(opening.offset) || !Number.isFinite(opening.w) || opening.w <= 0) continue;
      const vertical = openingVertical(opening);
      const left = Math.max(0, opening.offset * length - opening.w / 2);
      const right = Math.min(length, opening.offset * length + opening.w / 2);
      const bottom = Math.max(0, vertical.sill);
      const top = Math.min(ceilingHeight, vertical.sill + vertical.height);
      if (left < right && bottom < top) openings.push({ left, right, bottom, top });
    }
    const xs = [...new Set([0, length, ...openings.flatMap(item => [item.left, item.right])])].sort((a, b) => a - b);
    const zs = [...new Set([0, ceilingHeight, ...openings.flatMap(item => [item.bottom, item.top])])].sort((a, b) => a - b);
    const panels = [];
    for (let xi = 1; xi < xs.length; xi++) for (let zi = 1; zi < zs.length; zi++) {
      const left = xs[xi - 1], right = xs[xi], bottom = zs[zi - 1], top = zs[zi];
      const x = (left + right) / 2, z = (bottom + top) / 2;
      if (!openings.some(item => x > item.left && x < item.right && z > item.bottom && z < item.top)) panels.push({ left, right, bottom, top });
    }
    return panels;
  }

  function wallSurface(items, ceilingHeight, scale) {
    return items.filter(item => item.type === 'wall').reduce((sum, wall) => sum + wallPanels(wall, items, ceilingHeight, scale).reduce((area, panel) => area + (panel.right - panel.left) * (panel.top - panel.bottom), 0), 0);
  }

  root.PlannerGeometry = { findRooms, placeOnWall, findOpeningWall, updateOpening, openingVertical, wallPanels, wallSurface };
  if (typeof module !== 'undefined') module.exports = root.PlannerGeometry;
})(typeof window !== 'undefined' ? window : globalThis);

