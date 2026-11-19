import { MAX_FUTURE_MS, STALE_MS, parseStatus, parseTelemetry, topics } from './contract.ts';
import type { GatewayStatus, Telemetry } from './contract.ts';
import type { FeedEvent, ConnectionState } from '../sources/types.ts';

export type Clock = {
  wallMs: number;
  monoMs: number;
};

export type ViewerState =
  | 'WAITING'
  | 'LIVE'
  | 'STALE'
  | 'SENSOR ERROR'
  | 'UNCALIBRATED'
  | 'OFFLINE'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'SUSPENDED'
  | 'ERROR';

export type Snapshot = {
  state: ViewerState;
  heading: number | null;
  ageMs: number | null;
  deviceId: string;
  connection: ConnectionState;
  detail: string;
  sample: Telemetry | null;
  gateway: GatewayStatus | null;
  gatewayRetained: boolean;
  rejected: number;
  accepted: number;
};

type TimedSample = {
  sample: Telemetry;
  received: Clock;
  ageAtReceipt: number;
};

// A connected socket, online heartbeat, or cached packet cannot make a reading LIVE
export class ViewerEngine {
  readonly deviceId: string;
  private readonly topic: ReturnType<typeof topics>;
  private connection: ConnectionState = 'disconnected';
  private detail = 'Choose a source to begin.';
  private current: TimedSample | null = null;
  private lastGood: TimedSample | null = null;
  private session: string | null = null;
  private lastSeq = -1;
  private retired = new Set<string>();
  private offlineSession: string | null = null;
  private gateway: GatewayStatus | null = null;
  private gatewayRetained = false;
  private rejected = 0;
  private accepted = 0;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.topic = topics(deviceId);
  }

  /** Applies a connection, status, or telemetry event to the viewer state. */
  ingest(event: FeedEvent, now: Clock): void {
    if (event.type === 'connection') {
      this.connection = event.state;
      this.detail = event.detail ?? '';

      // Never redisplay a cached heading on foreground/reconnection
      if (event.state !== 'connected') {
        this.current = null;
      }

      if (event.state === 'connecting') {
        this.offlineSession = null;
        this.gateway = null;
        this.gatewayRetained = false;
      }

      return;
    }

    if (this.connection !== 'connected') {
      return;
    }

    if (event.topic === this.topic.status) {
      const status = parseStatus(event.payload, this.deviceId);

      if (!status) {
        this.rejected++;
        return;
      }

      if (this.retired.has(status.session_id)) {
        return;
      }

      const statusTimeMs = status.timestamp === null
        ? null
        : Date.parse(status.timestamp);

      if (statusTimeMs !== null && statusTimeMs > now.wallMs + MAX_FUTURE_MS) {
        this.rejected++;
        return;
      }

      // An old offline snapshot will not invalidate a newer sample in that session
      if (
        status.state === 'offline' &&
        status.session_id === this.session &&
        statusTimeMs !== null &&
        this.current !== null
      ) {
        const currentSampleTimeMs = Date.parse(this.current.sample.measured_at);
        const statusPredatesCurrentSample = statusTimeMs < currentSampleTimeMs;

        if (statusPredatesCurrentSample) {
          return;
        }
      }

      this.gateway = status;
      this.gatewayRetained = event.retained;

      if (status.state === 'offline' && status.session_id === this.session) {
        this.offlineSession = status.session_id;
        this.current = null;
      }

      return;
    }

    const isUnexpectedTopic = event.topic !== this.topic.telemetry;
    const isRetainedTelemetry = event.retained;

    if (isUnexpectedTopic || isRetainedTelemetry) {
      this.rejected++;
      return;
    }

    const sample = parseTelemetry(event.payload, this.deviceId);

    if (!sample) {
      this.rejected++;
      return;
    }

    // A delayed sample may already be stale
    const age = now.wallMs - Date.parse(sample.measured_at);
    const sampleIsStale = age >= STALE_MS;
    const sampleIsTooFarInFuture = age < -MAX_FUTURE_MS;
    const sampleSessionIsRetired = this.retired.has(sample.session_id);
    const sampleSessionIsOffline = this.offlineSession === sample.session_id;
    const sequenceDidNotAdvance =
      sample.session_id === this.session &&
      sample.seq <= this.lastSeq;

    if (
      sampleIsStale ||
      sampleIsTooFarInFuture ||
      sampleSessionIsRetired ||
      sampleSessionIsOffline ||
      sequenceDidNotAdvance
    ) {
      this.rejected++;
      return;
    }

    // A publisher restart can reset its sequence, but the old session must sta retired so a delayed packet cant  switch the viewer back to it
    if (sample.session_id !== this.session) {
      if (this.session) {
        this.retired.add(this.session);
      }

      this.session = sample.session_id;
      this.offlineSession = null;
      if (this.gateway?.session_id !== this.session) {
        this.gateway = null;
      }
    }

    this.lastSeq = sample.seq;
    this.current = { sample, received: now, ageAtReceipt: Math.max(0, age) };

    if (sample.status === 'ok') {
      this.lastGood = this.current;
    }

    this.accepted++;
  }

  private age(value: TimedSample, now: Clock): number {
    return Math.max(
      value.ageAtReceipt + Math.max(0, now.monoMs - value.received.monoMs),
      now.wallMs - Date.parse(value.sample.measured_at),
    );
  }

  // returns the current display state and the data associated with it.
  snapshot(now: Clock): Snapshot {
    let state: ViewerState;
    const ageMs = this.lastGood ? this.age(this.lastGood, now) : null;

    if (this.connection !== 'connected') {
      const mapped: Record<Exclude<ConnectionState, 'connected'>, ViewerState> = {
        connecting: 'CONNECTING',
        disconnected: 'DISCONNECTED',
        error: 'ERROR',
        suspended: 'SUSPENDED',
      };
      state = mapped[this.connection];
    } else if (this.session !== null && this.offlineSession === this.session) {
      state = 'OFFLINE';
    } else if (!this.current) {
      state = 'WAITING';
    } else if (this.age(this.current, now) >= STALE_MS) {
      state = 'STALE';
    } else if (this.current.sample.status === 'sensor_error') {
      state = 'SENSOR ERROR';
    } else if (this.current.sample.status === 'uncalibrated') {
      state = 'UNCALIBRATED';
    } else {
      state = 'LIVE';
    }

    return {
      state,
      heading: state === 'LIVE' ? this.current!.sample.heading_deg : null,
      ageMs,
      deviceId: this.deviceId,
      connection: this.connection,
      detail: this.detail,
      sample: this.current?.sample ?? null,
      gateway: this.gateway,
      gatewayRetained: this.gatewayRetained,
      rejected: this.rejected,
      accepted: this.accepted,
    };
  }
}
