import test from 'node:test';
import assert from 'node:assert/strict';
import { directionName, formatHeading, formatAge, readingStatus } from '../src/ui/viewerPresentation.ts';

test('bearing display wraps rounding at north without showing 360 degrees', () => {
  assert.equal(formatHeading(359.99), '0.0');
  assert.equal(formatHeading(359.9), '359.9');
  assert.equal(formatHeading(0), '0.0');
  assert.equal(directionName(359.99), 'North');
  assert.equal(directionName(22.49), 'North');
  assert.equal(directionName(22.5), 'Northeast');
  assert.equal(directionName(90), 'East');
});

test('unavailable readings and absent update times have explicit empty labels', () => {
  assert.equal(formatHeading(null), '—');
  assert.equal(directionName(null), 'Direction unknown');
  assert.equal(formatAge(null), 'None yet');
  assert.equal(formatAge(3000), '3.0 s ago');
});

test('fresh simulation is explicitly labeled and unavailable states never claim live readings', () => {
  assert.equal(readingStatus('LIVE').label, 'Live simulation');
  for (const state of [
    'WAITING', 'STALE', 'SENSOR ERROR', 'UNCALIBRATED', 'OFFLINE',
    'DISCONNECTED', 'CONNECTING', 'SUSPENDED', 'ERROR',
  ]) {
    const status = readingStatus(state);
    assert.notEqual(status.tone, 'positive');
    assert.doesNotMatch(status.label, /live/i);
    assert.ok(status.description);
  }
});
