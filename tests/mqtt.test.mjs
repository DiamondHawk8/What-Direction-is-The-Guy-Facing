import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { MqttFeed } from '../src/sources/mqtt.ts';
import { ConnectionSetupError, secureUrl } from '../src/sources/connection.ts';
import { topics } from '../src/core/contract.ts';
import { ViewerEngine } from '../src/core/viewer.ts';
import { observeFeed } from '../src/sources/observe.ts';

const deviceId = 'device-001';
const topic = topics(deviceId);
const config = () => ({ url: 'wss://broker.example.test/mqtt', deviceId, clientId: 'viewer-test' });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
class Client extends EventEmitter {
  ended = false;
  subscribe(topics, options, callback) { this.subscription = { topics, options, callback }; }
  accept() { this.subscription.callback(null, this.subscription.topics.map(topic => ({ topic, qos: 1 }))); }
  end() { this.ended = true; }
}
function setup(t, provider = config) {
  const clients = [];
  const events = [];
  const feed = new MqttFeed(deviceId, provider, (url, options) => {
    const client = new Client();
    client.url = url;
    client.options = options;
    clients.push(client);
    return client;
  });
  t.after(() => feed.stop());
  feed.start(event => events.push(event));
  return { feed, clients, events };
}

test('MQTT waits for both topic grants and preserves retained flags', async t => {
  const { clients, events } = setup(t);
  await flush();
  const client = clients[0];
  assert.equal(client.options.protocolVersion, 5);
  assert.equal(client.options.rejectUnauthorized, true);
  assert.equal(client.options.reconnectPeriod, 0);
  client.emit('connect');
  client.emit('message', topic.telemetry, Buffer.from('{}'), { retain: false });
  assert.deepEqual(events.map(event => event.state), ['connecting']);
  assert.deepEqual(client.subscription.topics, [topic.telemetry, topic.status]);
  assert.equal(client.subscription.options.rap, true);
  client.accept();
  client.emit('message', topic.telemetry, Buffer.from('{}'), { retain: true });
  assert.equal(events.at(-2).state, 'connected');
  assert.equal(events.at(-1).retained, true);
  client.emit('message', 'unrelated', Buffer.from('{}'), { retain: false });
  client.emit('message', topic.telemetry, Buffer.alloc(16_385), { retain: false });
  assert.equal(events.filter(event => event.type === 'packet').length, 1);
});

test('partial or denied subscription grants fail closed', async t => {
  const { clients, events } = setup(t);
  await flush();
  const client = clients[0];
  client.emit('connect');
  client.subscription.callback(null, [{ topic: topic.telemetry, qos: 1 }, { topic: topic.status, qos: 128 }]);
  assert.equal(events.at(-1).state, 'error');
  assert.equal(client.ended, true);
});

test('stop ignores old SUBACK callbacks and pending authorizations', async t => {
  const { feed, clients, events } = setup(t);
  await flush();
  clients[0].emit('connect');
  const callback = clients[0].subscription.callback;
  feed.stop();
  const count = events.length;
  callback(null, Object.values(topic).map(topic => ({ topic, qos: 1 })));
  assert.equal(events.length, count);
  let resolve;
  const pending = setup(t, () => new Promise(done => { resolve = done; }));
  pending.feed.stop();
  resolve(config());
  await flush();
  assert.equal(pending.clients.length, 0);
});

test('network loss reauthorizes; stopping cancels reconnection', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let authorizations = 0;
  const { feed, clients, events } = setup(t, () => { authorizations++; return config(); });
  await flush();
  clients[0].emit('connect');
  clients[0].accept();
  clients[0].emit('close');
  assert.equal(events.at(-1).state, 'disconnected');
  t.mock.timers.tick(2000);
  await flush();
  assert.equal(authorizations, 2);
  clients[1].emit('close');
  feed.stop();
  t.mock.timers.tick(2000);
  assert.equal(authorizations, 2);
});

test('expired leases reauthorize and permission errors open no socket', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse('2026-11-25T12:00:00Z') });
  let attempts = 0;
  const { clients, events } = setup(t, () => {
    if (++attempts > 1) throw new ConnectionSetupError('Access revoked.');
    return { ...config(), expiresAt: Date.now() + 1000 };
  });
  await flush();
  clients[0].emit('connect');
  clients[0].accept();
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(clients[0].ended, true);
  assert.equal(clients.length, 1);
  assert.equal(events.at(-1).state, 'error');
});

test('subscription timeouts and raw socket errors do not expose secrets', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const first = setup(t);
  await flush();
  first.clients[0].emit('connect');
  t.mock.timers.tick(10_000);
  assert.equal(first.events.at(-1).state, 'error');
  const second = setup(t);
  await flush();
  second.clients[0].emit('error', new Error('password=secret-marker'));
  assert.doesNotMatch(JSON.stringify(second.events), /secret-marker/);
  assert.equal(second.clients[0].ended, true);
});

test('MQTT feeds preserve engine freshness, retained rejection, and disconnect invalidation', async t => {
  const engine = new ViewerEngine(deviceId);
  const { clients, feed } = setup(t);
  let now = Date.now();
  feed.start(event => engine.ingest(event, { wallMs: now, monoMs: now }));
  await flush();
  const client = clients.at(-1);
  client.emit('connect');
  client.accept();
  const payload = Buffer.from(JSON.stringify({
    schema_version: 1, device_id: deviceId, session_id: '11111111-1111-4111-8111-111111111111',
    seq: 0, measured_at: new Date(now).toISOString(), heading_deg: 45,
    heading_reference: 'magnetic', source: 'usb_gateway', status: 'ok',
  }));
  client.emit('message', topic.telemetry, payload, { retain: true });
  assert.equal(engine.snapshot({ wallMs: now, monoMs: now }).state, 'WAITING');
  client.emit('message', topic.telemetry, payload, { retain: false });
  assert.equal(engine.snapshot({ wallMs: now, monoMs: now }).state, 'LIVE');
  now += 3000;
  assert.equal(engine.snapshot({ wallMs: now, monoMs: now }).state, 'STALE');
  client.emit('close');
  assert.equal(engine.snapshot({ wallMs: now, monoMs: now }).heading, null);
});

test('foreground observer ignores callbacks from a previous run', () => {
  const callbacks = [];
  const events = [];
  const feed = { start: sink => callbacks.push(sink), stop: () => callbacks.at(-1)('during stop') };
  const stop = observeFeed(feed, event => events.push(event));
  stop();
  observeFeed(feed, event => events.push(event));
  callbacks[0]('late old event');
  callbacks[1]('fresh event');
  assert.deepEqual(events, ['fresh event']);
});

test('connection URLs require TLS and separate credentials', () => {
  for (const url of ['ws://host/mqtt', 'wss://user:pass@host/mqtt', 'wss://host/mqtt?token=secret', 'wss://host/#secret']) {
    assert.throws(() => secureUrl(url, 'wss:'), ConnectionSetupError);
  }
  assert.equal(secureUrl(' wss://host/mqtt ', 'wss:'), 'wss://host/mqtt');
});
