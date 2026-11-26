import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyActivity, recordActivity, favoriteDirection, HISTORY_LIMIT } from '../src/core/activity.ts';

const sample = (seq, heading_deg, patch = {}) => ({
  session_id: 'a', seq, heading_deg, status: 'ok', ...patch,
});

test('activity counts accepted samples once and treats north as one sector', () => {
  let activity = emptyActivity();
  activity = recordActivity(activity, sample(0, 359));
  activity = recordActivity(activity, sample(1, 1));
  assert.equal(recordActivity(activity, sample(1, 180)), activity);
  assert.equal(recordActivity(activity, sample(0, 180)), activity);
  assert.equal(activity.samples, 2);
  assert.equal(activity.bins[0], 2);
  assert.equal(favoriteDirection(activity), 'N');
});

test('unavailable readings do not count; new sessions can restart their sequence', () => {
  let activity = recordActivity(emptyActivity(), sample(10, 90));
  assert.equal(recordActivity(activity, sample(11, null, { status: 'sensor_error' })), activity);
  activity = recordActivity(activity, sample(0, 270, { session_id: 'b' }));
  assert.equal(activity.samples, 2);
  assert.equal(favoriteDirection(activity), 'Tie');
});

test('history stays bounded and a reset leaves a genuine empty state', () => {
  let activity = emptyActivity();
  for (let seq = 0; seq < 100; seq++) activity = recordActivity(activity, sample(seq, seq));
  assert.equal(activity.recent.length, HISTORY_LIMIT);
  assert.equal(activity.samples, 100);
  assert.equal(favoriteDirection(emptyActivity()), '—');
});
