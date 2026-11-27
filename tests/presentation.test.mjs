import test from 'node:test';
import assert from 'node:assert/strict';
import { directionName, formatHeading, formatAge, readingStatus } from '../src/ui/viewerPresentation.ts';
import { describeSource, activitySourceLabel } from '../src/core/source.ts';
import { emptyActivity, recordActivity } from '../src/core/activity.ts';

test('source labels distinguish a local simulator, remote simulation, and device data', () => {
  assert.equal(describeSource('simulation').badge, 'SIMULATOR');
  assert.equal(describeSource('mqtt').badge, 'MQTT');
  assert.equal(readingStatus('LIVE', describeSource('mqtt', 'simulator')).label, 'Live simulation');
  assert.equal(readingStatus('LIVE', describeSource('mqtt', 'usb_gateway')).label, 'Live device');
  assert.equal(describeSource('mqtt', 'ble_gateway').label, 'BLE gateway over MQTT');
});

test('activity labels preserve mixed provenance rather than relabeling old simulated data as real', () => {
  let activity = emptyActivity();
  activity = recordActivity(activity, { session_id: 'a', seq: 0, heading_deg: 0, status: 'ok', source: 'simulator' });
  assert.equal(activitySourceLabel(activity, 'mqtt'), 'Simulated readings');
  activity = recordActivity(activity, { session_id: 'a', seq: 1, heading_deg: 0, status: 'ok', source: 'usb_gateway' });
  assert.equal(activitySourceLabel(activity, 'mqtt'), 'Mixed simulated and device readings');
});

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
