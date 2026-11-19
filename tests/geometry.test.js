const assert = require('node:assert/strict');
const { test } = require('node:test');
const { findRooms, placeOnWall, findOpeningWall, updateOpening, wallSurface } = require('../geometry.js');

const wall = (x, y, x2, y2) => ({ type: 'wall', x, y, x2, y2 });

test('finds a closed rectangular room', () => {
  const rooms = findRooms([wall(0, 0, 160, 0), wall(160, 0, 160, 120), wall(160, 120, 0, 120), wall(0, 120, 0, 0)]);
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].area / 1600, 12);
});

test('does not find a room in an open outline', () => {
  assert.equal(findRooms([wall(0, 0, 160, 0), wall(160, 0, 160, 120), wall(160, 120, 0, 120)]).length, 0);
});

test('finds two rooms with a shared wall', () => {
  const walls = [wall(0, 0, 80, 0), wall(80, 0, 160, 0), wall(160, 0, 160, 120), wall(160, 120, 80, 120), wall(80, 120, 0, 120), wall(0, 120, 0, 0), wall(80, 0, 80, 120)];
  const rooms = findRooms(walls);
  assert.deepEqual(rooms.map(room => room.area).sort((left, right) => left - right), [9600, 9600]);
});

test('ignores duplicate and zero-length walls', () => {
  const rooms = findRooms([wall(0, 0, 40, 0), wall(40, 0, 40, 40), wall(40, 40, 0, 40), wall(0, 40, 0, 0), wall(0, 0, 40, 0), wall(0, 0, 0, 0)]);
  assert.equal(rooms.length, 1);
});

test('splits walls where an internal partition meets them', () => {
  const walls = [wall(0, 0, 160, 0), wall(160, 0, 160, 120), wall(160, 120, 0, 120), wall(0, 120, 0, 0), wall(80, 0, 80, 120)];
  assert.deepEqual(findRooms(walls).map(room => room.area).sort((left, right) => left - right), [9600, 9600]);
});

test('places an opening on a wall and clamps it to its endpoints', () => {
  const placed = placeOnWall(wall(0, 0, 160, 0), { x: 10, y: 4 }, 40, 6, 10);
  assert.equal(placed.offset, 0.125);
  assert.equal(placed.x, 0);
  assert.equal(placed.y, -3);
});

test('rejects walls that are too far away or shorter than the opening', () => {
  assert.equal(placeOnWall(wall(0, 0, 30, 0), { x: 15, y: 0 }, 40, 6), null);
  assert.equal(findOpeningWall([wall(0, 0, 100, 0)], { x: 50, y: 30 }, 40, 6, 10), null);
});

test('updates a bound opening when its wall rotates', () => {
  const opening = { w: 1, h: 0.15, offset: 0.5 };
  assert.equal(updateOpening(opening, wall(0, 0, 0, 160), 40), true);
  assert.equal(opening.angle, Math.PI / 2);
  assert.equal(opening.x, -20);
  assert.equal(opening.y, 77);
});

test('subtracts door and window areas from a single wall face', () => {
  const walls = [{ ...wall(0, 0, 160, 0), id: 'wall-1' }, { type: 'door', wallId: 'wall-1', offset: 0.25, w: 1, openingHeight: 2, sillHeight: 0 }, { type: 'window', wallId: 'wall-1', offset: 0.75, w: 1, openingHeight: 1, sillHeight: 1 }];
  assert.equal(wallSurface(walls, 3, 40), 9);
});

test('subtracts overlapping openings only once and clips at ceiling', () => {
  const walls = [{ ...wall(0, 0, 160, 0), id: 'wall-1' }, { type: 'door', wallId: 'wall-1', offset: 0.5, w: 2, openingHeight: 3, sillHeight: 0 }, { type: 'door', wallId: 'wall-1', offset: 0.5, w: 2, openingHeight: 3, sillHeight: 0 }];
  assert.equal(wallSurface(walls, 2.5, 40), 5);
});

test('ignores unbound openings and clips openings to the wall', () => {
  const walls = [{ ...wall(0, 0, 160, 0), id: 'wall-1' }, { type: 'door', wallId: 'other', offset: 0.5, w: 1 }, { type: 'window', wallId: 'wall-1', offset: 0, w: 2, openingHeight: 1, sillHeight: 1 }];
  assert.equal(wallSurface(walls, 3, 40), 11);
});

