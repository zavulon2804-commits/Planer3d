const assert = require('node:assert/strict');
const { test } = require('node:test');
const { findRooms } = require('../geometry.js');

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

