import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountApi, AccountApiError } from '../src/accounts/api.ts';
import { topics } from '../src/core/contract.ts';

const deviceId = 'device-001';
const grant = (patch = {}) => ({
  deviceId, url: 'wss://broker.example.test/mqtt', clientId: 'account-viewer-1',
  username: 'test-viewer', password: 'test-broker-password',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  topics: Object.values(topics(deviceId)), ...patch,
});
const response = value => new Response(JSON.stringify(value), { status: 200 });

test('account requests send a bearer token only to the configured HTTPS API', async () => {
  const requests = [];
  const api = new AccountApi('https://api.example.test/base', 'test-account-token', async (url, options) => {
    requests.push({ url, options });
    return response({ devices: [{ id: deviceId, name: 'My device', role: 'owner' }] });
  });
  assert.equal((await api.devices())[0].role, 'owner');
  assert.equal(requests[0].url, 'https://api.example.test/base/v1/devices');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-account-token');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.throws(() => new AccountApi('http://api.example.test', 'test-token'));
});

test('broker grants must be short-lived and match the requested device and exact topics', async () => {
  for (const patch of [
    { deviceId: 'other-device' },
    { topics: ['heading/#', topics(deviceId).status] },
    { topics: [topics(deviceId).telemetry] },
    { url: 'ws://broker.example.test' },
    { expiresAt: new Date(Date.now() - 1000).toISOString() },
    { expiresAt: new Date(Date.now() + 16 * 60_000).toISOString() },
  ]) {
    const api = new AccountApi('https://api.example.test', 'test-token', async () => response(grant(patch)));
    await assert.rejects(api.mqttSession(deviceId, new AbortController().signal));
  }
  const api = new AccountApi('https://api.example.test', 'test-token', async () => response(grant()));
  const accepted = await api.mqttSession(deviceId, new AbortController().signal);
  assert.equal(accepted.deviceId, deviceId);
  assert.equal(accepted.password, 'test-broker-password');
});

test('permission errors are explicit and do not echo arbitrary server messages', async () => {
  for (const status of [401, 403]) {
    const api = new AccountApi('https://api.example.test', 'test-token', async () =>
      new Response('secret-from-server', { status }));
    await assert.rejects(api.devices(), error => {
      assert.ok(error instanceof AccountApiError);
      assert.equal(error.status, status);
      assert.doesNotMatch(error.message, /secret-from-server/);
      return true;
    });
  }
});

test('invalid device permissions and duplicate devices are rejected', async () => {
  const device = { id: deviceId, name: 'Device', role: 'viewer' };
  for (const devices of [[{ ...device, role: 'admin' }], [device, device], [{ ...device, id: '../bad' }]]) {
    const api = new AccountApi('https://api.example.test', 'test-token', async () => response({ devices }));
    await assert.rejects(api.devices());
  }
});

test('sharing operations use device-specific endpoints and cannot traverse paths', async () => {
  const requests = [];
  const api = new AccountApi('https://api.example.test', 'test-token', async (url, options) => {
    requests.push({ url, options });
    return new Response(null, { status: 204 });
  });
  await api.addShare(deviceId, 'viewer-002');
  assert.deepEqual(JSON.parse(requests[0].options.body), { viewerId: 'viewer-002', role: 'viewer' });
  assert.equal(requests[0].options.method, 'POST');
  await api.removeShare(deviceId, 'share-001');
  assert.equal(requests[1].options.method, 'DELETE');
  assert.equal(requests[1].url, 'https://api.example.test/v1/devices/device-001/shares/share-001');
  await assert.rejects(api.removeShare(deviceId, '..'));
  assert.equal(requests.length, 2);
});

test('account requests stop on caller cancellation and timeouts', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const api = new AccountApi('https://api.example.test', 'test-token', async (_url, options) =>
    new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const controller = new AbortController();
  const cancelled = assert.rejects(api.devices(controller.signal));
  controller.abort();
  await cancelled;
  const timedOut = assert.rejects(api.devices());
  t.mock.timers.tick(10_000);
  await timedOut;
});
