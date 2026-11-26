import { useEffect, useState } from 'react';
import type { Snapshot } from './core/viewer.ts';
import { emptyActivity, recordActivity } from './core/activity.ts';

export function useActivity(view: Snapshot) {
  const [activity, setActivity] = useState(emptyActivity);
  useEffect(() => {
    if (view.state === 'LIVE' && view.sample) {
      const sample = view.sample;
      setActivity(previous => recordActivity(previous, sample));
    }
  }, [view.sample, view.state]);

  return { activity, resetActivity: () => setActivity(emptyActivity()) };
}
