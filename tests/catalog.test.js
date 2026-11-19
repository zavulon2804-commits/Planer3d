const assert = require('node:assert/strict');
const { test } = require('node:test');
const catalog = require('../catalog.js');
const project = require('../project-model.js');
const layers = require('../layer-model.js');
const viewer = require('../viewer3d.js');
const geometry = require('../geometry.js');

test('catalogue types have unique identifiers and valid editable dimensions', () => {
  assert.equal(new Set(catalog.items.map(item => item.type)).size, catalog.items.length);
  for (const item of catalog.items) {
    assert.ok(item.width > 0 && item.depth > 0 && item.height > 0);
    assert.equal(project.valid({ title: 'Дом', items: [{ type: item.type, x: 0, y: 0, w: item.width, h: item.depth }] }), true);
    assert.equal(layers.toolAvailable(item.group, item.type), true);
  }
});

test('catalogue furniture uses its documented height in 3D', () => {
  const chair = catalog.get('chair');
  const faces = viewer.buildScene([{ type: chair.type, x: 0, y: 0, w: chair.width, h: chair.depth }], 2.7, geometry);
  assert.equal(Math.max(...faces.flatMap(face => face.points.map(point => point.z))), chair.height * 40);
});

