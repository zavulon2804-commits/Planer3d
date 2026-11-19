const assert = require('node:assert/strict');
const { test } = require('node:test');
const model = require('../project-model.js');

test('migrates a single-floor project without losing its elements', () => {
  const project = model.ensure({ title: 'Дом', items: [{ type: 'wall', x: 0, y: 0, x2: 100, y2: 0 }] });
  assert.equal(project.floors[0].variants[0].items.length, 1);
  assert.equal(project.items, project.floors[0].variants[0].items);
});

test('keeps floors and copied variants independent through a JSON round trip', () => {
  const project = model.ensure({ title: 'Дом', items: [{ type: 'wall', x: 0, y: 0, x2: 100, y2: 0 }] });
  model.addVariant(project, 'Копия', true);
  project.items[0].x2 = 200;
  model.selectVariant(project, 0);
  assert.equal(project.items[0].x2, 100);
  model.addFloor(project, 'Второй этаж');
  assert.equal(project.items.length, 0);
  model.selectFloor(project, 0);
  model.selectVariant(project, 1);
  assert.equal(project.items[0].x2, 200);
  model.sync(project);
  const restored = model.ensure(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.items[0].x2, 200);
  assert.equal(restored.floors.length, 2);
});

test('rejects invalid geometry in an inactive floor before import', () => {
  const project = model.ensure({ title: 'Дом', items: [] });
  model.addFloor(project, 'Этаж 2');
  project.floors[0].variants[0].items.push({ type: 'wall', x: 0, y: 0 });
  assert.equal(model.valid(project), false);
});

test('rejects invalid selected floor and variant indices', () => {
  const project = model.ensure({ title: 'Дом', items: [] });
  assert.throws(() => model.selectFloor(project, 2));
  assert.throws(() => model.selectVariant(project, -1));
});

