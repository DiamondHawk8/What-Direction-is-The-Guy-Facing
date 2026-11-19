// Telemetry timing limits.
export const STALE_MS = 3_000;
export const MAX_FUTURE_MS = 2_000;

// Device and session identifiers
export const DEVICE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TS: UTC, down to ms
const UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type Telemetry = {
  schema_version: 1;
  device_id: string;
  session_id: string;
  seq: number;
  measured_at: string;
  heading_deg: number | null;
  heading_reference: 'magnetic';
  source: 'simulator' | 'usb_gateway' | 'ble_gateway';
  status: 'ok' | 'uncalibrated' | 'sensor_error';
};

export type GatewayStatus = {
  schema_version: 1;
  device_id: string;
  session_id: string;
  state: 'online' | 'offline';
  reason: 'connected' | 'clean_shutdown' | 'connection_lost' | 'access_test';
  timestamp: string | null;
};

// Helper to create topic key value pairs
export function topics(deviceId: string) {
  if (!DEVICE_ID.test(deviceId)) {
    throw new Error('Invalid device ID.');
  }

  return {
    telemetry: `heading/v1/devices/${deviceId}/telemetry`,
    status: `heading/v1/devices/${deviceId}/status`,
  };
}

export function timestampMs(value: unknown): number | null {
  if (typeof value !== 'string' || !UTC_MS.test(value)) {
    return null;
  }

  const ms = Date.parse(value);
  const isValidTimestamp = Number.isFinite(ms) && new Date(ms).toISOString() === value;

  return isValidTimestamp ? ms : null;
}

// Parses a bounded JSON payload
function objectFromJson(payload: string): Record<string, unknown> | null {
  if (payload.length > 16_384) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(payload);

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function validIdentity(v: Record<string, unknown>, deviceId: string): boolean {
  const hasExpectedSchema = v.schema_version === 1;
  const hasExpectedDevice = v.device_id === deviceId;
  const hasValidSession = typeof v.session_id === 'string' && UUID.test(v.session_id);

  return hasExpectedSchema && hasExpectedDevice && hasValidSession;
}

// Validates telemetry fields and checks that heading availability matches status
export function parseTelemetry(payload: string, deviceId: string): Telemetry | null {
  const v = objectFromJson(payload);

  if (!v) {
    return null;
  }

  const hasValidIdentity = validIdentity(v, deviceId);
  const hasValidSequence = Number.isSafeInteger(v.seq) && (v.seq as number) >= 0;
  const hasValidTimestamp = timestampMs(v.measured_at) !== null;
  const hasValidHeadingReference = v.heading_reference === 'magnetic';
  const hasValidSource = ['simulator', 'usb_gateway', 'ble_gateway'].includes(v.source as string);
  const hasValidStatus = ['ok', 'uncalibrated', 'sensor_error'].includes(v.status as string);

  if (
    !hasValidIdentity ||
    !hasValidSequence ||
    !hasValidTimestamp ||
    !hasValidHeadingReference ||
    !hasValidSource ||
    !hasValidStatus
  ) {
    return null;
  }

  // Unavailable readings must carry null, never old heading
  const hasValidHeading =
    typeof v.heading_deg === 'number' &&
    Number.isFinite(v.heading_deg) &&
    v.heading_deg >= 0 &&
    v.heading_deg < 360;
  const headingIsUnavailable = v.heading_deg === null;
  const headingMatchesStatus = v.status === 'ok'
    ? hasValidHeading
    : headingIsUnavailable;

  if (!headingMatchesStatus) {
    return null;
  }

  return v as Telemetry;
}

// Validates gateway status fields
export function parseStatus(payload: string, deviceId: string): GatewayStatus | null {
  const v = objectFromJson(payload);

  if (!v || !validIdentity(v, deviceId)) {
    return null;
  }

  const hasValidState = ['online', 'offline'].includes(v.state as string);

  if (!hasValidState) {
    return null;
  }

  if (v.reason === 'connection_lost') {
    const isOfflineWithoutTimestamp = v.state === 'offline' && v.timestamp === null;

    if (!isOfflineWithoutTimestamp) {
      return null;
    }
  } else {
    const hasValidTimestamp = timestampMs(v.timestamp) !== null;
    const reasonMatchesState =
      (v.reason === 'connected' && v.state === 'online') ||
      (v.reason === 'clean_shutdown' && v.state === 'offline') ||
      v.reason === 'access_test';

    if (!hasValidTimestamp || !reasonMatchesState) {
      return null;
    }
  }

  return v as GatewayStatus;
}
