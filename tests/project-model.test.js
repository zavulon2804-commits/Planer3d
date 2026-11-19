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

test('accepts engineering lines and rejects zero-length or incomplete lines', () => {
  for (const type of Object.keys(model.lineNames)) {
    assert.equal(model.valid({ title: 'Дом', items: [{ type, x: 0, y: 0, x2: 40, y2: 0 }] }), true);
    assert.equal(model.valid({ title: 'Дом', items: [{ type, x: 0, y: 0, x2: 0, y2: 0 }] }), false);
    assert.equal(model.valid({ title: 'Дом', items: [{ type, x: 0, y: 0 }] }), false);
  }
});

test('sums engineering lengths by line type in metres', () => {
  const totals = model.engineeringLengths([{ type: 'pipeCold', x: 0, y: 0, x2: 120, y2: 160 }, { type: 'pipeCold', x: 0, y: 0, x2: 40, y2: 0 }, { type: 'cable', x: 0, y: 0, x2: 80, y2: 0 }], 40);
  assert.deepEqual(totals, { pipeCold: 6, pipeHot: 0, drain: 0, cable: 2 });
});

test('snaps coordinates to centimetre steps without accumulating floating point noise', () => {
  assert.equal(model.snap(4.19, 5, 40), 4);
  assert.equal(model.snap(4.21, 1, 40), 4.4);
  assert.equal(model.snap(-11, 10, 40), -12);
});

test('validates dimensions as nonzero line annotations', () => {
  assert.equal(model.valid({ title: 'Дом', items: [{ type: 'dimension', x: 0, y: 0, x2: 40, y2: 0 }] }), true);
  assert.equal(model.valid({ title: 'Дом', items: [{ type: 'dimension', x: 0, y: 0, x2: 0, y2: 0 }] }), false);
});

test('validates embedded raster backgrounds and rejects unsafe sources', () => {
  const image = { type: 'background', x: 0, y: 0, w: 5, h: 4, opacity: 0.5, visible: true, src: 'data:image/png;base64,AAAA' };
  assert.equal(model.valid({ title: 'Дом', items: [image] }), true);
  assert.equal(model.valid({ title: 'Дом', items: [{ ...image, src: 'https://example.com/image.png' }] }), false);
  assert.equal(model.valid({ title: 'Дом', items: [image, image] }), false);
  assert.equal(model.valid({ title: 'Дом', items: [{ ...image, opacity: 2 }] }), false);
});

test('preserves a background in a copied variant and after export', () => {
  const image = { type: 'background', x: 10, y: 20, w: 5, h: 4, opacity: 0.5, visible: true, src: 'data:image/png;base64,AAAA' };
  const project = model.ensure({ title: 'Дом', items: [image] });
  model.addVariant(project, 'Копия', true);
  project.items[0].x = 50;
  model.selectVariant(project, 0);
  assert.equal(project.items[0].x, 10);
  model.sync(project);
  const restored = model.ensure(JSON.parse(JSON.stringify(project)));
  model.selectVariant(restored, 1);
  assert.equal(restored.items[0].x, 50);
  assert.equal(restored.items[0].src, image.src);
});

test('calibrates background proportionally while keeping the first point anchored', () => {
  const result = model.calibrateBackground({ x: 0, y: 0, w: 5, h: 4 }, { x: 40, y: 40 }, { x: 120, y: 40 }, 4, 40);
  assert.deepEqual(result, { x: -40, y: -40, w: 10, h: 8 });
});

test('rejects coincident calibration points and invalid lengths', () => {
  const background = { x: 0, y: 0, w: 5, h: 4 }, point = { x: 10, y: 20 };
  assert.equal(model.calibrateBackground(background, point, point, 1, 40), null);
  assert.equal(model.calibrateBackground(background, point, { x: 20, y: 20 }, 0, 40), null);
});

test('moves shared wall endpoints without moving unrelated walls', () => {
  const items = [{ type: 'wall', x: 0, y: 0, x2: 80, y2: 0 }, { type: 'wall', x: 80, y: 0, x2: 80, y2: 80 }, { type: 'wall', x: 200, y: 0, x2: 240, y2: 0 }];
  assert.equal(model.setWallEndpoints(items, 0, { x: 0, y: 0 }, { x: 100, y: 20 }, 40), true);
  assert.deepEqual([items[0].x2, items[0].y2, items[1].x, items[1].y], [100, 20, 100, 20]);
  assert.equal(items[2].x, 200);
});

test('rejects collapsing a neighbouring wall without partial changes', () => {
  const items = [{ type: 'wall', x: 0, y: 0, x2: 80, y2: 0 }, { type: 'wall', x: 80, y: 0, x2: 80, y2: 80 }];
  const original = JSON.stringify(items);
  assert.equal(model.setWallEndpoints(items, 0, { x: 0, y: 0 }, { x: 80, y: 80 }, 40), false);
  assert.equal(JSON.stringify(items), original);
});

test('rejects a connected-wall change that cannot contain its opening', () => {
  const items = [{ type: 'wall', x: 0, y: 0, x2: 80, y2: 0 }, { type: 'wall', id: 'adjacent', x: 80, y: 0, x2: 80, y2: 80 }, { type: 'door', wallId: 'adjacent', w: 1.5 }];
  const original = JSON.stringify(items);
  assert.equal(model.setWallEndpoints(items, 0, { x: 0, y: 0 }, { x: 80, y: 40 }, 40), false);
  assert.equal(JSON.stringify(items), original);
});

test('accepts safe colour values and rejects malformed material colours', () => {
  const item = { type: 'wall', x: 0, y: 0, x2: 40, y2: 0, materialColor: '#aabbcc' };
  assert.equal(model.valid({ title: 'Дом', items: [item] }), true);
  assert.equal(model.valid({ title: 'Дом', items: [{ ...item, materialColor: 'url(example)' }] }), false);
});

