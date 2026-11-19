const assert = require('node:assert/strict');
const { test } = require('node:test');
const layers = require('../layer-model.js');

test('keeps architectural elements visible under other sheets', () => {
  for (const sheet of layers.sheets) {
    assert.equal(layers.visible(sheet.id, 'wall'), true);
    assert.equal(layers.visible(sheet.id, 'door'), true);
  }
});

test('isolates furniture and electric symbols by sheet', () => {
  assert.equal(layers.visible('furniture', 'sofa'), true);
  assert.equal(layers.visible('furniture', 'socket'), false);
  assert.equal(layers.visible('electrical', 'sofa'), false);
  assert.equal(layers.visible('electrical', 'socket'), true);
  assert.equal(layers.visible('all', 'sofa'), true);
  assert.equal(layers.visible('all', 'socket'), true);
});

test('exposes only relevant editing tools while retaining selection', () => {
  assert.equal(layers.toolAvailable('furniture', 'select'), true);
  assert.equal(layers.toolAvailable('furniture', 'wall'), false);
  assert.equal(layers.toolAvailable('plan', 'wall'), true);
  assert.equal(layers.toolAvailable('invalid', 'wall'), false);
});

test('separates water and wiring tools and visibility', () => {
  assert.equal(layers.toolAvailable('water', 'pipeCold'), true);
  assert.equal(layers.visible('water', 'pipeHot'), true);
  assert.equal(layers.visible('water', 'cable'), false);
  assert.equal(layers.visible('wiring', 'cable'), true);
  assert.equal(layers.toolAvailable('wiring', 'drain'), false);
});

test('shows drawing dimensions and their tool on every sheet', () => {
  for (const sheet of layers.sheets) {
    assert.equal(layers.visible(sheet.id, 'dimension'), true);
    assert.equal(layers.toolAvailable(sheet.id, 'dimension'), true);
  }
});

