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
  root.PlannerGeometry = { findRooms };
  if (typeof module !== 'undefined') module.exports = root.PlannerGeometry;
})(typeof window !== 'undefined' ? window : globalThis);

