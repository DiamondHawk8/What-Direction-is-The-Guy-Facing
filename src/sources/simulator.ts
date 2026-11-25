import { topics } from '../core/contract.ts';
import type { GatewayStatus, Telemetry } from '../core/contract.ts';
import type { FeedSink, HeadingFeed } from './types.ts';
import { SimulatedMotion } from './motion.ts';
import type { MotionProfile } from './motion.ts';

export type Scenario = 'live' | 'paused';

const SAMPLE_INTERVAL_MS = 200;
const HEARTBEAT_INTERVAL_MS = 10_000;

export class SimulatorFeed implements HeadingFeed {
  readonly kind = 'simulation' as const;
  private readonly deviceId: string;
  private readonly newUuid: () => string;
  private sink: FeedSink | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private session = '';
  private seq = 0;
  private readonly motion: SimulatedMotion;
  private scenario: Scenario = 'live';

  constructor(deviceId: string, newUuid: () => string, random: () => number = Math.random) {
    this.deviceId = deviceId;
    this.newUuid = newUuid;
    this.motion = new SimulatedMotion('everyday', random);
  }

  start(sink: FeedSink): void {
    this.stop();
    this.sink = sink;
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

  setMotionProfile(profile: MotionProfile): void {
    this.motion.setProfile(profile);
  }

  private emitSample(): void {
    if (!this.sink || this.scenario === 'paused') return;

    const sample: Telemetry = {
      schema_version: 1,
      device_id: this.deviceId,
      session_id: this.session,
      seq: this.seq++,
      measured_at: new Date().toISOString(),
      heading_deg: this.motion.advance(SAMPLE_INTERVAL_MS),
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
