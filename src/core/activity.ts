import type { Telemetry } from './contract.ts';

export const DIRECTION_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const HISTORY_LIMIT = 60;

export type Activity = {
  samples: number;
  bins: number[];
  recent: number[];
  lastSession: string | null;
  lastSequence: number;
  sources: Record<Telemetry['source'], number>;
};

export function emptyActivity(): Activity {
  return {
    samples: 0, bins: Array(8).fill(0), recent: [], lastSession: null, lastSequence: -1,
    sources: { simulator: 0, usb_gateway: 0, ble_gateway: 0 },
  };
}

// The caller supplies only accepted LIVE samples from ViewerEngine. Re-renders
// must not count a packet twice. Percentages are sample shares, not time shares.
export function recordActivity(activity: Activity, sample: Telemetry): Activity {
  if (sample.status !== 'ok' || sample.heading_deg === null) return activity;
  if (sample.session_id === activity.lastSession && sample.seq <= activity.lastSequence) return activity;
  const bins = [...activity.bins];
  bins[Math.round(sample.heading_deg / 45) % 8]++;
  return {
    samples: activity.samples + 1,
    bins,
    recent: [...activity.recent, sample.heading_deg].slice(-HISTORY_LIMIT),
    lastSession: sample.session_id,
    lastSequence: sample.seq,
    sources: { ...activity.sources, [sample.source]: activity.sources[sample.source] + 1 },
  };
}

export function favoriteDirection(activity: Activity): string {
  if (activity.samples === 0) return '—';
  const maximum = Math.max(...activity.bins);
  const winners = activity.bins.flatMap((count, index) => count === maximum ? [DIRECTION_LABELS[index]] : []);
  return winners.length === 1 ? winners[0] : 'Tie';
}
