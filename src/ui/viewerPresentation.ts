import type { ViewerState } from '../core/viewer.ts';

const directions = [
  'North', 'Northeast', 'East', 'Southeast',
  'South', 'Southwest', 'West', 'Northwest',
];

export type StatusTone = 'positive' | 'neutral' | 'warning' | 'error';

type ReadingStatus = { label: string; description: string; tone: StatusTone };

// Explicit states keep transport connectivity separate from reading freshness.
const readingStatuses: Record<ViewerState, ReadingStatus> = {
  LIVE: {
    label: 'Live simulation',
    description: 'Receiving fresh readings from the local simulator.',
    tone: 'positive',
  },
  STALE: {
    label: 'Reading expired',
    description: 'No fresh reading for three seconds. The heading is hidden until new data arrives.',
    tone: 'warning',
  },
  WAITING: {
    label: 'Waiting for a reading',
    description: 'Connected, but a fresh heading has not arrived yet.',
    tone: 'neutral',
  },
  'SENSOR ERROR': {
    label: 'Sensor error',
    description: 'The sensor cannot provide a usable heading right now.',
    tone: 'error',
  },
  UNCALIBRATED: {
    label: 'Calibration needed',
    description: 'A calibrated reading is needed before showing a direction.',
    tone: 'warning',
  },
  OFFLINE: {
    label: 'Source offline',
    description: 'The source is offline. Waiting for a new session.',
    tone: 'neutral',
  },
  DISCONNECTED: {
    label: 'Disconnected',
    description: 'There is no active connection to the source.',
    tone: 'neutral',
  },
  CONNECTING: {
    label: 'Connecting',
    description: 'Connecting to the source.',
    tone: 'neutral',
  },
  SUSPENDED: {
    label: 'Viewer paused',
    description: 'Return to the app to wait for a fresh reading.',
    tone: 'neutral',
  },
  ERROR: {
    label: 'Connection error',
    description: 'The connection needs attention before readings can resume.',
    tone: 'error',
  },
};

export function readingStatus(state: ViewerState): ReadingStatus {
  return readingStatuses[state];
}

export function directionName(heading: number | null): string {
  if (heading === null) return 'Direction unknown';
  return directions[Math.round(heading / 45) % directions.length];
}

export function formatHeading(heading: number | null): string {
  if (heading === null) return '—';
  // Rounding 359.99 must not display an out-of-range 360° bearing.
  return (Number(heading.toFixed(1)) % 360).toFixed(1);
}

export function formatAge(ageMs: number | null): string {
  return ageMs === null ? 'None yet' : `${(ageMs / 1000).toFixed(1)} s ago`;
}
