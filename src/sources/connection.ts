import { DEVICE_ID } from '../core/contract.ts';

export type MqttConnection = {
  url: string;
  deviceId: string;
  clientId: string;
  username?: string;
  password?: string;
  expiresAt?: number;
};

export class ConnectionSetupError extends Error {}

export function secureUrl(value: string, protocol: 'https:' | 'wss:'): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConnectionSetupError('Enter a valid server URL.');
  }
  if (url.protocol !== protocol || !url.hostname) {
    throw new ConnectionSetupError(protocol === 'wss:' ? 'The broker must use wss://.' : 'The API must use https://.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new ConnectionSetupError('Use a URL without credentials, query parameters, or fragments.');
  }
  return url.toString();
}

export function validateConnection(connection: MqttConnection, deviceId: string): MqttConnection {
  if (!DEVICE_ID.test(deviceId) || connection.deviceId !== deviceId) {
    throw new ConnectionSetupError('Select a valid device ID.');
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(connection.clientId)) {
    throw new ConnectionSetupError('The connection has an invalid client ID.');
  }
  if ((connection.username?.length ?? 0) > 256 || (connection.password?.length ?? 0) > 4096) {
    throw new ConnectionSetupError('The connection credentials are too long.');
  }
  if (connection.expiresAt !== undefined &&
      (!Number.isFinite(connection.expiresAt) || connection.expiresAt <= Date.now())) {
    throw new ConnectionSetupError('The broker authorization has expired.');
  }
  return { ...connection, url: secureUrl(connection.url, 'wss:') };
}
