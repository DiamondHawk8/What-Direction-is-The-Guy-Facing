import type { IClientOptions, MqttClient } from 'mqtt';
import { topics } from '../core/contract.ts';
import { ConnectionSetupError, validateConnection } from './connection.ts';
import type { MqttConnection } from './connection.ts';
import type { ConnectionState, FeedSink, HeadingFeed } from './types.ts';

export type MqttClientFactory = (url: string, options: IClientOptions) => MqttClient;
export type ConnectionProvider = (signal: AbortSignal) => MqttConnection | Promise<MqttConnection>;

const RETRY_MS = 2000;
const SUBSCRIBE_TIMEOUT_MS = 10_000;

export class MqttFeed implements HeadingFeed {
  readonly kind = 'mqtt' as const;
  private readonly deviceId: string;
  private readonly getConnection: ConnectionProvider;
  private readonly createClient: MqttClientFactory;
  private sink: FeedSink | null = null;
  private client: MqttClient | null = null;
  private request: AbortController | null = null;
  private generation = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private expiry: ReturnType<typeof setTimeout> | null = null;
  private subscriptionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(deviceId: string, getConnection: ConnectionProvider, createClient: MqttClientFactory) {
    topics(deviceId); // Validate before any network activity
    this.deviceId = deviceId;
    this.getConnection = getConnection;
    this.createClient = createClient;
  }

  start(sink: FeedSink): void {
    this.stop();
    this.sink = sink;
    void this.connect();
  }

  private emit(state: ConnectionState, detail: string): void {
    this.sink?.({ type: 'connection', state, detail });
  }

  private release(): void {
    this.generation++;
    this.request?.abort();
    this.request = null;
    if (this.retry) clearTimeout(this.retry);
    if (this.expiry) clearTimeout(this.expiry);
    if (this.subscriptionTimeout) clearTimeout(this.subscriptionTimeout);
    this.retry = this.expiry = this.subscriptionTimeout = null;
    const client = this.client;
    this.client = null;
    if (client) {
      client.removeAllListeners();
      client.on('error', () => {});
      client.end(true);
    }
  }

  private fail(detail: string): void {
    this.release();
    this.emit('error', detail);
  }

  private async connect(): Promise<void> {
    this.release();
    if (!this.sink) return;
    const generation = this.generation;
    const current = () => this.sink !== null && generation === this.generation;
    this.request = new AbortController();
    this.emit('connecting', 'Authorizing and connecting to the selected device.');
    try {
      const supplied = await this.getConnection(this.request.signal);
      if (!current()) return;
      const connection = validateConnection(supplied, this.deviceId);
      const requestedTopics = Object.values(topics(this.deviceId));
      let ready = false;
      const client = this.createClient(connection.url, {
        clientId: connection.clientId,
        username: connection.username,
        password: connection.password,
        protocolVersion: 5,
        clean: true,
        properties: { sessionExpiryInterval: 0, maximumPacketSize: 65_536 },
        reconnectPeriod: 0, // Reauthorize prior to each reconnect.
        resubscribe: false,
        queueQoSZero: false,
        connectTimeout: 10_000,
        keepalive: 20,
        rejectUnauthorized: true,
        forceNativeWebSocket: true,
        timerVariant: 'native',
        log: () => {}, // Never log URLs, credentials, or received payloads
      });
      this.client = client;
      if (connection.expiresAt !== undefined) {
        this.expiry = setTimeout(() => {
          if (current()) void this.connect();
        }, Math.min(connection.expiresAt - Date.now(), 2_147_483_647));
      }
      client.on('connect', () => {
        if (!current()) return;
        this.subscriptionTimeout = setTimeout(() => {
          if (current()) this.fail('The broker did not confirm device subscriptions.');
        }, SUBSCRIBE_TIMEOUT_MS);
        
        client.subscribe(requestedTopics, { qos: 1, rap: true, rh: 0 }, (error, granted) => {
          if (!current()) return;
          if (this.subscriptionTimeout) clearTimeout(this.subscriptionTimeout);
          this.subscriptionTimeout = null;
          const allowed = !error && granted?.length === requestedTopics.length &&
            requestedTopics.every(topic => granted.some(item => item.topic === topic && item.qos >= 0 && item.qos <= 2));
          if (!allowed) {
            this.fail('The broker denied access to one or more device topics.');
            return;
          }
          ready = true;
          this.emit('connected', 'Subscribed. Waiting for fresh telemetry.');
        });
      });
      client.on('message', (topic, payload, packet) => {
        if (!current() || !ready || !requestedTopics.includes(topic) || payload.length > 16_384) return;
        if (connection.expiresAt !== undefined && Date.now() >= connection.expiresAt) {
          void this.connect();
          return;
        }
        this.sink?.({ type: 'packet', topic, payload: payload.toString(), retained: packet.retain });
      });
      client.on('error', () => {
        if (current()) this.fail('MQTT connection failed. Check the address, TLS certificate, and broker permissions.');
      });
      client.on('close', () => {
        if (!current()) return;
        this.release();
        this.emit('disconnected', 'Connection lost. Retrying with fresh authorization.');
        this.retry = setTimeout(() => void this.connect(), RETRY_MS);
      });
    } catch (error) {
      if (!current()) return;
      this.fail(error instanceof ConnectionSetupError ? error.message : 'Unable to authorize or connect. Check connection settings.');
    }
  }

  stop(): void {
    this.sink = null;
    this.release();
  }
}
