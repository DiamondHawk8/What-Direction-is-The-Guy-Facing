import test from 'node:test';
import assert from 'node:assert/strict';
import { ViewerEngine } from '../src/core/viewer.ts';
import { parseTelemetry, parseStatus, timestampMs, topics } from '../src/core/contract.ts';

const epoch = Date.parse('2026-11-17T17:00:00.000Z');
const sid = '11111111-1111-4111-8111-111111111111';
const sid2 = '22222222-2222-4222-8222-222222222222';
const now = (ms = 0) => ({ wallMs: epoch + ms, monoMs: 1000 + ms });
const sample = (patch = {}) => ({ schema_version: 1, device_id: 'demo-001', session_id: sid,
  seq: 0, measured_at: new Date(epoch).toISOString(), heading_deg: 359.5,
  heading_reference: 'magnetic', source: 'usb_gateway', status: 'ok', ...patch });
const packet = (value, retained = false, topic = topics('demo-001').telemetry) => ({
  type: 'packet', topic, payload: JSON.stringify(value), retained,
});
const status = (patch = {}) => ({ schema_version: 1, device_id: 'demo-001', session_id: sid,
  state: 'online', reason: 'connected', timestamp: new Date(epoch).toISOString(), ...patch });
const connected = () => {
  const engine = new ViewerEngine('demo-001');
  engine.ingest({ type: 'connection', state: 'connected' }, now());
  return engine;
};

test('retained online status cannot establish a live reading', () => {
  const e = connected(); e.ingest(packet(status(), true, topics('demo-001').status), now());
  assert.equal(e.snapshot(now()).state, 'WAITING');
});
test('retained telemetry is rejected even with a current timestamp', () => {
  const e = connected(); e.ingest(packet(sample(), true), now());
  assert.equal(e.snapshot(now()).state, 'WAITING'); assert.equal(e.snapshot(now()).accepted, 0);
});
test('fresh reading goes stale at exactly three seconds and loses its heading', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  assert.equal(e.snapshot(now(2999)).state, 'LIVE');
  assert.equal(e.snapshot(now(3000)).state, 'STALE'); assert.equal(e.snapshot(now(3000)).heading, null);
});
test('age at receipt counts toward freshness', () => {
  const e = connected(); e.ingest(packet(sample()), now(2000));
  assert.equal(e.snapshot(now(2999)).state, 'LIVE'); assert.equal(e.snapshot(now(3000)).state, 'STALE');
});
test('old packets and packets beyond future tolerance are rejected', () => {
  for (const measured_at of [new Date(epoch - 3000).toISOString(), new Date(epoch + 2001).toISOString()]) {
    const e = connected(); e.ingest(packet(sample({ measured_at })), now());
    assert.equal(e.snapshot(now()).state, 'WAITING');
  }
});
test('small allowed clock skew still goes stale after three monotonic seconds', () => {
  const e = connected(); e.ingest(packet(sample({ measured_at: new Date(epoch + 2000).toISOString() })), now());
  assert.equal(e.snapshot(now()).state, 'LIVE'); assert.equal(e.snapshot(now(3000)).state, 'STALE');
});
test('duplicates do not refresh age; out of order sequence is rejected', () => {
  const e = connected(); e.ingest(packet(sample({ seq: 10 })), now());
  e.ingest(packet(sample({ seq: 10, measured_at: new Date(epoch + 2000).toISOString() })), now(2000));
  e.ingest(packet(sample({ seq: 9 })), now(2000));
  assert.equal(e.snapshot(now(3000)).state, 'STALE'); assert.equal(e.snapshot(now()).accepted, 1);
});
test('a new session resets sequence; a retired session cannot return', () => {
  const e = connected(); e.ingest(packet(sample({ seq: 90 })), now());
  e.ingest(packet(sample({ session_id: sid2, seq: 0, heading_deg: 1 })), now());
  e.ingest(packet(sample({ seq: 91 })), now());
  assert.equal(e.snapshot(now()).heading, 1); assert.equal(e.snapshot(now()).accepted, 2);
});
test('sensor error and uncalibrated readings immediately hide heading', () => {
  for (const state of ['sensor_error', 'uncalibrated']) {
    const e = connected(); e.ingest(packet(sample()), now());
    e.ingest(packet(sample({ seq: 1, status: state, heading_deg: null })), now());
    assert.equal(e.snapshot(now()).heading, null);
    assert.equal(e.snapshot(now()).state, state === 'sensor_error' ? 'SENSOR ERROR' : 'UNCALIBRATED');
  }
});
test('offline Will for the active session invalidates heading and blocks more samples in it', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  e.ingest(packet(status({ state: 'offline', reason: 'connection_lost', timestamp: null }), false, topics('demo-001').status), now());
  e.ingest(packet(sample({ seq: 1 })), now()); assert.equal(e.snapshot(now()).state, 'OFFLINE');
  e.ingest(packet(sample({ session_id: sid2 })), now()); assert.equal(e.snapshot(now()).state, 'LIVE');
});
test('offline status from a retired session cannot invalidate the active session', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  e.ingest(packet(sample({ session_id: sid2 })), now());
  e.ingest(packet(status({ state: 'offline', reason: 'connection_lost', timestamp: null }), true, topics('demo-001').status), now());
  assert.equal(e.snapshot(now()).state, 'LIVE');
});
test('a disconnect or background event hides heading; reconnect waits for a new packet', () => {
  for (const state of ['disconnected', 'suspended', 'error']) {
    const e = connected(); e.ingest(packet(sample()), now());
    e.ingest({ type: 'connection', state }, now()); assert.equal(e.snapshot(now()).heading, null);
    e.ingest({ type: 'connection', state: 'connected' }, now());
    assert.equal(e.snapshot(now()).state, 'WAITING');
    e.ingest(packet(sample()), now()); assert.equal(e.snapshot(now()).state, 'WAITING');
    e.ingest(packet(sample({ seq: 1 })), now()); assert.equal(e.snapshot(now()).state, 'LIVE');
  }
});
test('a wall-clock rollback cannot rejuvenate a reading', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  assert.equal(e.snapshot({ wallMs: epoch - 60_000, monoMs: 4000 }).state, 'STALE');
});
test('reconnecting after an offline session waits instead of inheriting its offline state', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  e.ingest(packet(status({ state: 'offline', reason: 'connection_lost', timestamp: null }), false, topics('demo-001').status), now());
  e.ingest({ type: 'connection', state: 'connecting' }, now());
  e.ingest({ type: 'connection', state: 'connected' }, now());
  e.ingest(packet(sample({ session_id: sid2 }), true), now());
  assert.equal(e.snapshot(now()).state, 'WAITING'); assert.equal(e.snapshot(now()).heading, null);
});
test('online heartbeats do not refresh the heading age', () => {
  const e = connected(); e.ingest(packet(sample()), now());
  e.ingest(packet(status({ timestamp: new Date(epoch + 2500).toISOString() }), false, topics('demo-001').status), now(2500));
  assert.equal(e.snapshot(now(3000)).state, 'STALE');
});
test('wrong device, topic, schema, range, types and malformed payloads are rejected', () => {
  const patches = [{ device_id: 'other' }, { schema_version: 2 }, { heading_deg: -1 },
    { heading_deg: 360 }, { heading_deg: null }, { heading_deg: '42' }, { seq: 0.5 },
    { seq: Number.MAX_SAFE_INTEGER + 1 }, { heading_reference: 'true' }, { session_id: 'bad' },
    { source: 'other' }, { status: 'sensor_error', heading_deg: 42 }];
  for (const patch of patches) assert.equal(parseTelemetry(JSON.stringify(sample(patch)), 'demo-001'), null);
  for (const value of ['{', 'null', '[]']) assert.equal(parseTelemetry(value, 'demo-001'), null);
  const e = connected(); e.ingest(packet(sample(), false, topics('other').telemetry), now());
  assert.equal(e.snapshot(now()).state, 'WAITING');
});
test('timestamps require exactly millisecond UTC and a real calendar date', () => {
  for (const value of ['2026-02-30T17:00:00.000Z', '2026-11-17T17:00:00Z', '2026-11-17T17:00:00.000+00:00', null]) assert.equal(timestampMs(value), null);
  assert.equal(timestampMs('2026-11-17T17:00:00.000Z'), epoch);
  assert.equal(parseStatus(JSON.stringify(status({ state: 'online', reason: 'connection_lost', timestamp: null })), 'demo-001'), null);
});
test('fresh readings cross the north boundary without an invalid range', () => {
  const e = connected(); e.ingest(packet(sample({ heading_deg: 359.9 })), now());
  e.ingest(packet(sample({ heading_deg: 0.1, seq: 1 })), now());
  assert.equal(e.snapshot(now()).heading, 0.1);
});
