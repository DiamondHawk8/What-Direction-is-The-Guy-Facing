import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulatorFeed } from '../src/sources/simulator.ts';
import { ViewerEngine } from '../src/core/viewer.ts';
import { parseTelemetry, topics } from '../src/core/contract.ts';

const epoch = Date.parse('2026-11-18T17:00:00.000Z');
const deviceId = 'demo-001';
const firstSession = '11111111-1111-4111-8111-111111111111';
const secondSession = '22222222-2222-4222-8222-222222222222';
const clock = () => ({ wallMs: Date.now(), monoMs: Date.now() - epoch });

function createFeed(t) {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: epoch });
  let sessions = 0;
  const feed = new SimulatorFeed(deviceId, () => sessions++ === 0 ? firstSession : secondSession, () => 0.25);
  t.after(() => feed.stop());
  return feed;
}

test('simulator emits validated, non-retained samples at 5 Hz', t => {
  const feed = createFeed(t);
  const events = [];
  feed.start(event => events.push(event));
  t.mock.timers.tick(200);

  const packets = events.filter(event => event.type === 'packet' && event.topic === topics(deviceId).telemetry);
  assert.equal(packets.length, 2);
  const samples = packets.map(packet => parseTelemetry(packet.payload, deviceId));
  for (const sample of samples) {
    assert.ok(sample);
    assert.equal(sample.source, 'simulator');
    assert.equal(sample.session_id, firstSession);
  }
  assert.deepEqual(packets.map(packet => packet.retained), [false, false]);
  assert.deepEqual(samples.map(sample => sample.seq), [0, 1]);
  assert.ok(Math.abs(samples[1].heading_deg - samples[0].heading_deg) < 1);
  assert.equal(samples[1].measured_at, new Date(epoch + 200).toISOString());
});

test('pausing samples goes stale while the heartbeat keeps the transport connected', t => {
  const feed = createFeed(t);
  const engine = new ViewerEngine(deviceId);
  feed.start(event => engine.ingest(event, clock()));
  assert.equal(engine.snapshot(clock()).state, 'LIVE');

  feed.setScenario('paused');
  t.mock.timers.tick(2999);
  assert.equal(engine.snapshot(clock()).state, 'LIVE');
  t.mock.timers.tick(1);
  assert.equal(engine.snapshot(clock()).state, 'STALE');
  assert.equal(engine.snapshot(clock()).heading, null);

  t.mock.timers.tick(7000);
  const view = engine.snapshot(clock());
  assert.equal(view.connection, 'connected');
  assert.equal(view.gateway.state, 'online');
  assert.equal(view.gateway.timestamp, new Date(epoch + 10_000).toISOString());
  assert.equal(view.ageMs, 10_000);
  assert.equal(view.state, 'STALE');
});

test('resuming replaces a stale reading with a new publisher session', t => {
  const feed = createFeed(t);
  const engine = new ViewerEngine(deviceId);
  feed.start(event => engine.ingest(event, clock()));
  feed.setScenario('paused');
  t.mock.timers.tick(3000);
  feed.setScenario('live');

  const view = engine.snapshot(clock());
  assert.equal(view.state, 'LIVE');
  assert.equal(view.ageMs, 0);
  assert.equal(view.sample.session_id, secondSession);
  assert.equal(view.sample.seq, 0);
});

test('stop silences both timers and restarting begins with fresh data', t => {
  const feed = createFeed(t);
  const firstEvents = [];
  feed.start(event => firstEvents.push(event));
  feed.setScenario('paused');
  feed.stop();
  const countAtStop = firstEvents.length;
  t.mock.timers.tick(10_000);
  feed.setScenario('live');
  assert.equal(firstEvents.length, countAtStop);

  const engine = new ViewerEngine(deviceId);
  feed.start(event => engine.ingest(event, clock()));
  assert.equal(engine.snapshot(clock()).state, 'LIVE');
  assert.equal(engine.snapshot(clock()).sample.session_id, secondSession);
  t.mock.timers.tick(200);
  assert.equal(engine.snapshot(clock()).accepted, 2);
  assert.equal(firstEvents.length, countAtStop);
});
