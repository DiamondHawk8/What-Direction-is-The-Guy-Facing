// Temporary placeholder for simulator feed

import { topics } from '../core/contract.ts';
import type { GatewayStatus, Telemetry } from '../core/contract.ts';
import type { FeedSink, HeadingFeed } from './types.ts';

export type Scenario = 'live' | 'paused';

const SAMPLE_INTERVAL_MS = 200;
const HEARTBEAT_INTERVAL_MS = 10_000;
const DEGREES_PER_SECOND = 30;

export class SimulatorFeed implements HeadingFeed {
  readonly kind = 'simulation' as const;
  private readonly deviceId: string;
  private readonly newUuid: () => string;
  private sink: FeedSink | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private session = '';
  private seq = 0;
  private startedAt = 0;
  private scenario: Scenario = 'live';

  constructor(deviceId: string, newUuid: () => string) {
    this.deviceId = deviceId;
    this.newUuid = newUuid;
  }

  start(sink: FeedSink): void {
    this.stop();
    this.sink = sink;
    this.startedAt = Date.now();
    this.setScenario('live');
    this.sampleTimer = setInterval(() => this.emitSample(), SAMPLE_INTERVAL_MS);
    this.heartbeatTimer = setInterval(() => this.emitStatus(), HEARTBEAT_INTERVAL_MS);
  }

  setScenario(next: Scenario): void {
    if (!this.sink) return;
    this.scenario = next;
    if (next === 'paused') return;

    // A new publisher session lets resume start at sequence zero safely.
    this.session = this.newUuid();
    this.seq = 0;
    this.sink({ type: 'connection', state: 'connecting' });
    this.sink({
      type: 'connection',
      state: 'connected',
      detail: 'Local simulator; no broker connection.',
    });
    this.emitStatus();
    this.emitSample();
  }

  private emitSample(): void {
    if (!this.sink || this.scenario === 'paused') return;

    const elapsedSeconds = (Date.now() - this.startedAt) / 1000;
    const sample: Telemetry = {
      schema_version: 1,
      device_id: this.deviceId,
      session_id: this.session,
      seq: this.seq++,
      measured_at: new Date().toISOString(),
      heading_deg: (elapsedSeconds * DEGREES_PER_SECOND + 42.5) % 360,
      heading_reference: 'magnetic',
      source: 'simulator',
      status: 'ok',
    };
    this.sink({
      type: 'packet',
      topic: topics(this.deviceId).telemetry,
      payload: JSON.stringify(sample),
      retained: false,
    });
  }

  private emitStatus(): void {
    const status: GatewayStatus = {
      schema_version: 1,
      device_id: this.deviceId,
      session_id: this.session,
      state: 'online',
      reason: 'connected',
      timestamp: new Date().toISOString(),
    };
    this.sink?.({
      type: 'packet',
      topic: topics(this.deviceId).status,
      payload: JSON.stringify(status),
      retained: false,
    });
  }

  stop(): void {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.sampleTimer = null;
    this.heartbeatTimer = null;
    this.sink = null;
  }
}
