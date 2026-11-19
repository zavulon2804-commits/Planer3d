const assert = require('node:assert/strict');
const { test } = require('node:test');
const geometry = require('../geometry.js');
const viewer = require('../viewer3d.js');

test('builds floor and five visible faces for a furnishing', () => {
  const scene = viewer.buildScene([{ type: 'room', x: 0, y: 0, x2: 160, y2: 120 }, { type: 'table', x: 40, y: 40, w: 1, h: 1 }], 2.7, geometry);
  assert.equal(scene.filter(face => face.kind === 'floor').length, 1);
  assert.equal(scene.filter(face => face.kind === 'object').length, 5);
});

test('uses wall panels around a door rather than a solid wall', () => {
  const items = [{ type: 'wall', id: 'wall-1', x: 0, y: 0, x2: 160, y2: 0 }, { type: 'door', wallId: 'wall-1', x: 60, y: -3, w: 1, h: 0.15, offset: 0.5, openingHeight: 2, sillHeight: 0 }];
  const walls = viewer.buildScene(items, 2.7, geometry).filter(face => face.kind === 'wall');
  assert.ok(walls.length > 1);
  const wallArea = walls.reduce((sum, face) => sum + Math.abs((face.points[1].x - face.points[0].x) * (face.points[2].z - face.points[1].z)) / 1600, 0);
  assert.ok(Math.abs(wallArea - 8.8) < 1e-9);
});

test('represents engineering routes as floor-level geometry', () => {
  const scene = viewer.buildScene([{ type: 'pipeCold', x: 0, y: 0, x2: 100, y2: 0 }], 2.7, geometry);
  assert.equal(scene.filter(face => face.kind === 'line').length, 1);
});

test('does not render a background image as furniture', () => {
  const scene = viewer.buildScene([{ type: 'background', x: 0, y: 0, w: 5, h: 4 }], 2.7, geometry);
  assert.equal(scene.length, 0);
});

