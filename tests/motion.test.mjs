import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedMotion, wrapHeading } from '../src/sources/motion.ts';

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const angularDifference = (a, b) => ((b - a + 540) % 360) - 180;

test('everyday motion includes stillness and abrupt turns in both directions', () => {
  const motion = new SimulatedMotion('everyday', seededRandom(549));
  const headings = Array.from({ length: 600 }, () => motion.advance(200));
  const changes = headings.slice(1).map((heading, index) => angularDifference(headings[index], heading));
  assert.ok(headings.every(heading => heading >= 0 && heading < 360));
  assert.ok(changes.some(change => Math.abs(change) < 0.5));
  assert.ok(changes.some(change => change > 15));
  assert.ok(changes.some(change => change < -15));
});

test('still mode jitters around a fixed bearing without accumulating drift', () => {
  const motion = new SimulatedMotion('still', seededRandom(8));
  for (let index = 0; index < 1000; index++) {
    assert.ok(Math.abs(motion.advance(200) - 42.5) <= 0.35);
  }
});

test('motion is repeatable with the same seed and wraps north safely', () => {
  const a = new SimulatedMotion('restless', seededRandom(3));
  const b = new SimulatedMotion('restless', seededRandom(3));
  for (let index = 0; index < 300; index++) assert.equal(a.advance(200), b.advance(200));
  assert.equal(wrapHeading(-1), 359);
  assert.equal(wrapHeading(361), 1);
});

test('changing to still mode stops an in-progress turn', () => {
  const motion = new SimulatedMotion('restless', () => 0.6);
  const before = motion.advance(200);
  motion.setProfile('still');
  assert.ok(Math.abs(angularDifference(before, motion.advance(2000))) < 1);
});
