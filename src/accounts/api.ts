import { DEVICE_ID, topics } from '../core/contract.ts';
import { ConnectionSetupError, secureUrl, validateConnection } from '../sources/connection.ts';
import type { MqttConnection } from '../sources/connection.ts';

export type AccountDevice = { id: string; name: string; role: 'owner' | 'viewer' };
export type DeviceShare = { id: string; viewerId: string };
type Fetch = typeof fetch;

export class AccountApiError extends ConnectionSetupError {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConnectionSetupError('The account API returned an invalid response.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum = 128): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new ConnectionSetupError('The account API returned an invalid field.');
  }
  return value;
}

function devicePath(deviceId: string): string {
  if (!DEVICE_ID.test(deviceId)) throw new ConnectionSetupError('Select a valid device ID.');
  return 'v1/devices/' + encodeURIComponent(deviceId);
}

// Proposed contract documented in docs/ACCOUNT_API.md. No login provider or
// server is invented here: the caller supplies an existing account access token.
export class AccountApi {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly request: Fetch;

  constructor(baseUrl: string, token: string, request: Fetch = (input, init) => fetch(input, init)) {
    this.baseUrl = secureUrl(baseUrl, 'https:').replace(/\/$/, '') + '/';
    if (!token.trim() || token.length > 4096 || /[\r\n]/.test(token)) {
      throw new ConnectionSetupError('Enter a valid account access token.');
    }
    this.token = token.trim();
    this.request = request;
  }

  private async call(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 10_000);
    try {
      return await this.performRequest(path, method, body, controller.signal);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  private async performRequest(path: string, method: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await this.request(this.baseUrl + path, {
        method,
        headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        redirect: 'error',
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch {
      throw new ConnectionSetupError('The account API is unreachable. Check its address and connection.');
    }
    if (!response.ok) {
      const message = response.status === 401 ? 'Your account session expired. Connect the account again.'
        : response.status === 403 ? 'Your account does not have permission for this device or action.'
        : 'The account API could not complete the request.';
      throw new AccountApiError(response.status, message);
    }
    if (response.status === 204) return null;
    const raw = await response.text();
    if (raw.length > 131_072) throw new ConnectionSetupError('The account API response is too large.');
    try {
      return JSON.parse(raw);
    } catch {
      throw new ConnectionSetupError('The account API returned invalid JSON.');
    }
  }

  async devices(signal?: AbortSignal): Promise<AccountDevice[]> {
    const response = object(await this.call('v1/devices', 'GET', undefined, signal));
    if (!Array.isArray(response.devices) || response.devices.length > 500) {
      throw new ConnectionSetupError('The account API returned an invalid device list.');
    }
    const devices = response.devices.map(value => {
      const item = object(value);
      const id = text(item.id, 64);
      if (!DEVICE_ID.test(id) || (item.role !== 'owner' && item.role !== 'viewer')) {
        throw new ConnectionSetupError('The account API returned invalid device permissions.');
      }
      return { id, name: text(item.name, 80), role: item.role } as AccountDevice;
    });
    if (new Set(devices.map(device => device.id)).size !== devices.length) {
      throw new ConnectionSetupError('The account API returned duplicate devices.');
    }
    return devices;
  }

  async mqttSession(deviceId: string, signal: AbortSignal): Promise<MqttConnection> {
    const grant = object(await this.call(devicePath(deviceId) + '/mqtt-session', 'POST', {}, signal));
    const expectedTopics = Object.values(topics(deviceId));
    if (!Array.isArray(grant.topics) || grant.topics.length !== 2 ||
        !expectedTopics.every(topic => grant.topics instanceof Array && grant.topics.includes(topic))) {
      throw new ConnectionSetupError('The API grant does not match the selected device topics.');
    }
    const expiresAt = Date.parse(text(grant.expiresAt));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 15 * 60_000) {
      throw new ConnectionSetupError('The API must issue a broker grant valid for at most 15 minutes.');
    }
    return validateConnection({
      deviceId: text(grant.deviceId, 64),
      url: text(grant.url, 2048),
      clientId: text(grant.clientId),
      username: text(grant.username, 256),
      password: text(grant.password, 4096),
      expiresAt,
    }, deviceId);
  }

  async shares(deviceId: string, signal?: AbortSignal): Promise<DeviceShare[]> {
    const result = object(await this.call(devicePath(deviceId) + '/shares', 'GET', undefined, signal));
    if (!Array.isArray(result.shares) || result.shares.length > 500) {
      throw new ConnectionSetupError('The account API returned an invalid sharing list.');
    }
    return result.shares.map(value => {
      const share = object(value);
      const id = text(share.id);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)) {
        throw new ConnectionSetupError('The account API returned an invalid share ID.');
      }
      return { id, viewerId: text(share.viewerId) };
    });
  }

  async addShare(deviceId: string, viewerId: string, signal?: AbortSignal): Promise<void> {
    if (!viewerId.trim() || viewerId.length > 128) throw new ConnectionSetupError('Enter a valid viewer account ID.');
    await this.call(devicePath(deviceId) + '/shares', 'POST', { viewerId: viewerId.trim(), role: 'viewer' }, signal);
  }

  async removeShare(deviceId: string, shareId: string, signal?: AbortSignal): Promise<void> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(shareId)) throw new ConnectionSetupError('Invalid share ID.');
    await this.call(devicePath(deviceId) + '/shares/' + encodeURIComponent(shareId), 'DELETE', undefined, signal);
  }
}
